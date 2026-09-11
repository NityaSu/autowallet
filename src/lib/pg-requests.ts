import { and, desc, eq } from "drizzle-orm";
import { getDb, paymentRequests, users } from "@/db";
import { centsToUsd, usdToCents } from "@/lib/cents";
import { applyTransfer, findUserById, lookupPerson } from "@/lib/pg-ledger";
import {
  notifyPaymentRequest,
  notifyPersonTransfer,
  notifyRequestCancelled,
  notifyRequestDeclined,
} from "@/lib/pg-notifications";

export type PaymentRequestStatus = "pending" | "paid" | "declined" | "cancelled";

export type PaymentRequestDto = {
  id: string;
  amountUsd: number;
  memo: string;
  status: PaymentRequestStatus;
  from: { id: string; name: string; handle: string };
  to: { id: string; name: string; handle: string };
  transferId: string | null;
  createdAt: string;
};

function toDto(
  row: typeof paymentRequests.$inferSelect,
  from: { id: string; name: string; handle: string },
  to: { id: string; name: string; handle: string },
): PaymentRequestDto {
  return {
    id: row.id,
    amountUsd: centsToUsd(row.amountCents),
    memo: row.memo,
    status: row.status as PaymentRequestStatus,
    from,
    to,
    transferId: row.transferId,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

async function personById(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      handle: users.handle,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row ?? null;
}

async function hydrate(row: typeof paymentRequests.$inferSelect) {
  const [from, to] = await Promise.all([
    personById(row.fromUserId),
    personById(row.toUserId),
  ]);
  if (!from || !to) return null;
  return toDto(row, from, to);
}

export async function createPaymentRequest(
  fromUserId: string,
  input: { toHandle: string; amountUsd: number; memo?: string },
) {
  const from = await findUserById(fromUserId);
  if (!from || from.kind !== "person") {
    return { ok: false as const, reason: "Account not found." };
  }
  const cents = usdToCents(input.amountUsd);
  if (cents === null) return { ok: false as const, reason: "Enter an amount." };

  const looked = await lookupPerson(input.toHandle);
  if (!looked.ok) return looked;
  if (looked.person.id === fromUserId) {
    return { ok: false as const, reason: "Can't request from yourself." };
  }

  const db = getDb();
  const id = crypto.randomUUID();
  const memo = input.memo?.trim() ?? "";
  const [row] = await db
    .insert(paymentRequests)
    .values({
      id,
      fromUserId,
      toUserId: looked.person.id,
      amountCents: cents,
      memo,
      status: "pending",
    })
    .returning();
  if (!row) return { ok: false as const, reason: "Could not create request." };

  try {
    await notifyPaymentRequest({
      toUserId: looked.person.id,
      fromName: from.name,
      fromHandle: from.handle,
      amountUsd: centsToUsd(cents),
      requestId: id,
    });
  } catch {
    // Inbox write is optional.
  }

  const dto = await hydrate(row);
  if (!dto) return { ok: false as const, reason: "Request missing after create." };
  return { ok: true as const, request: dto };
}

export async function getPaymentRequestForUser(requestId: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.id, requestId))
    .limit(1);
  if (!row) return { ok: false as const, reason: "Request not found." };
  if (row.fromUserId !== userId && row.toUserId !== userId) {
    return { ok: false as const, reason: "Request not found." };
  }
  const dto = await hydrate(row);
  if (!dto) return { ok: false as const, reason: "Request not found." };
  return { ok: true as const, request: dto };
}

export async function listIncomingRequests(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(paymentRequests)
    .where(
      and(eq(paymentRequests.toUserId, userId), eq(paymentRequests.status, "pending")),
    )
    .orderBy(desc(paymentRequests.createdAt));
  const items: PaymentRequestDto[] = [];
  for (const row of rows) {
    const dto = await hydrate(row);
    if (dto) items.push(dto);
  }
  return items;
}

export async function listOutgoingRequests(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(paymentRequests)
    .where(
      and(eq(paymentRequests.fromUserId, userId), eq(paymentRequests.status, "pending")),
    )
    .orderBy(desc(paymentRequests.createdAt));
  const items: PaymentRequestDto[] = [];
  for (const row of rows) {
    const dto = await hydrate(row);
    if (dto) items.push(dto);
  }
  return items;
}

async function closePaymentRequest(
  actorUserId: string,
  requestId: string,
  action: "decline" | "cancel",
) {
  const loaded = await getPaymentRequestForUser(requestId, actorUserId);
  if (!loaded.ok) return loaded;
  const { request } = loaded;
  const nextStatus = action === "decline" ? "declined" : "cancelled";

  if (action === "decline" && request.to.id !== actorUserId) {
    return { ok: false as const, reason: "This request is not for you." };
  }
  if (action === "cancel" && request.from.id !== actorUserId) {
    return { ok: false as const, reason: "You didn't send this request." };
  }
  if (request.status === "paid") {
    return { ok: false as const, reason: "Already paid." };
  }
  if (request.status === nextStatus) {
    return { ok: true as const, replay: true, request };
  }
  if (request.status !== "pending") {
    return { ok: false as const, reason: "This request is already closed." };
  }

  const db = getDb();
  const updated = await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, request.id))
      .for("update")
      .limit(1);
    if (!locked) return null;
    if (locked.status !== "pending") return locked;
    const [row] = await tx
      .update(paymentRequests)
      .set({ status: nextStatus })
      .where(eq(paymentRequests.id, request.id))
      .returning();
    return row ?? null;
  });
  if (!updated || updated.status !== nextStatus) {
    const raced = await getPaymentRequestForUser(requestId, actorUserId);
    if (!raced.ok) return raced;
    if (raced.request.status === "paid") {
      return { ok: false as const, reason: "Already paid." };
    }
    if (raced.request.status === nextStatus) {
      return { ok: true as const, replay: true, request: raced.request };
    }
    return { ok: false as const, reason: "This request is already closed." };
  }

  const actor = await findUserById(actorUserId);
  try {
    if (action === "decline") {
      await notifyRequestDeclined({
        toUserId: request.from.id,
        fromName: actor?.name ?? request.to.name,
        amountUsd: request.amountUsd,
        requestId: request.id,
      });
    } else {
      await notifyRequestCancelled({
        toUserId: request.to.id,
        fromName: actor?.name ?? request.from.name,
        amountUsd: request.amountUsd,
        requestId: request.id,
      });
    }
  } catch {
    // Inbox write is optional.
  }

  const refreshed = await getPaymentRequestForUser(requestId, actorUserId);
  if (!refreshed.ok) return refreshed;
  return { ok: true as const, replay: false, request: refreshed.request };
}

export async function declinePaymentRequest(
  payerUserId: string,
  requestId: string,
) {
  return closePaymentRequest(payerUserId, requestId, "decline");
}

export async function cancelPaymentRequest(
  requesterUserId: string,
  requestId: string,
) {
  return closePaymentRequest(requesterUserId, requestId, "cancel");
}

export async function payPaymentRequest(
  payerUserId: string,
  requestId: string,
) {
  const loaded = await getPaymentRequestForUser(requestId, payerUserId);
  if (!loaded.ok) return loaded;
  const { request } = loaded;
  if (request.to.id !== payerUserId) {
    return { ok: false as const, reason: "This request is not for you." };
  }
  if (request.status === "paid") {
    return { ok: true as const, replay: true, request };
  }
  if (request.status !== "pending") {
    return { ok: false as const, reason: "This request is closed." };
  }

  const payer = await findUserById(payerUserId);
  if (!payer) return { ok: false as const, reason: "Account not found." };

  const db = getDb();
  const settled = await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, request.id))
      .for("update")
      .limit(1);
    if (!locked) {
      return { ok: false as const, reason: "Request not found." };
    }
    if (locked.toUserId !== payerUserId) {
      return { ok: false as const, reason: "This request is not for you." };
    }
    if (locked.status === "paid") {
      return { ok: true as const, replay: true as const };
    }
    if (locked.status !== "pending") {
      return { ok: false as const, reason: "This request is closed." };
    }

    const transfer = await applyTransfer(tx, {
      fromHandle: payer.handle,
      toHandle: request.from.handle,
      amountUsd: request.amountUsd,
      memo: request.memo || "Payment request",
      idempotencyKey: `request-pay:${request.id}`,
    });
    if (!transfer.ok) return transfer;

    await tx
      .update(paymentRequests)
      .set({
        status: "paid",
        transferId: transfer.transfer.id,
      })
      .where(eq(paymentRequests.id, request.id));

    return { ok: true as const, replay: transfer.replay, transfer: transfer.transfer };
  });
  if (!settled.ok) return settled;

  if (!settled.replay && settled.transfer) {
    try {
      await notifyPersonTransfer(settled.transfer);
    } catch {
      // Inbox write must not roll back a settled pay.
    }
  }

  const refreshed = await getPaymentRequestForUser(requestId, payerUserId);
  if (!refreshed.ok) return refreshed;
  return { ok: true as const, replay: settled.replay, request: refreshed.request };
}
