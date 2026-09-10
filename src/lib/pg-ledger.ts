import bcrypt from "bcryptjs";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb, transfers, users } from "@/db";
import { centsToUsd, SIGNUP_BALANCE_CENTS, usdToCents } from "@/lib/cents";
import {
  HANDLE_RE,
  completeHandle,
  validateSignupShape,
  validateTransferShape,
  type LedgerTransfer,
  type TransferInput,
  type TransferResult,
} from "@/lib/ledger-types";
import { notifyPersonTransfer, notifyWalletLock, notifyWelcome } from "@/lib/pg-notifications";

export async function executeTransfer(
  input: TransferInput,
): Promise<TransferResult> {
  const shape = validateTransferShape(input);
  if (shape) return shape;
  const cents = usdToCents(input.amountUsd);
  if (cents === null) return { ok: false, reason: "Enter an amount." };

  const fromHandle = completeHandle(input.fromHandle);
  const toHandle = completeHandle(input.toHandle);
  const key = input.idempotencyKey.trim();
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    await tx
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.handle, [fromHandle, toHandle]))
      .for("update");

    const [from] = await tx
      .select()
      .from(users)
      .where(eq(users.handle, fromHandle))
      .limit(1);
    const [to] = await tx
      .select()
      .from(users)
      .where(eq(users.handle, toHandle))
      .limit(1);

    if (!from) return { ok: false as const, reason: "Sender not found." };
    if (!to) return { ok: false as const, reason: `Nobody at ${toHandle}.` };

    const [replay] = await tx
      .select()
      .from(transfers)
      .where(
        and(eq(transfers.fromUserId, from.id), eq(transfers.idempotencyKey, key)),
      )
      .limit(1);

    if (replay) {
      const transfer: LedgerTransfer = {
        id: replay.id,
        fromHandle: from.handle,
        toHandle: to.handle,
        amountUsd: centsToUsd(replay.amountCents),
        memo: replay.memo,
        status: "settled",
          createdAt: new Date(replay.createdAt).toISOString(),
      };
      return { ok: true as const, replay: true, transfer };
    }

    if (isPersonLocked(from)) {
      return { ok: false as const, reason: "Wallet is locked." };
    }

    if (from.balanceCents < cents) {
      return { ok: false as const, reason: "Not enough balance." };
    }

    await tx
      .update(users)
      .set({ balanceCents: from.balanceCents - cents })
      .where(eq(users.id, from.id));
    await tx
      .update(users)
      .set({ balanceCents: to.balanceCents + cents })
      .where(eq(users.id, to.id));

    const id = crypto.randomUUID();
    const [row] = await tx
      .insert(transfers)
      .values({
        id,
        fromUserId: from.id,
        toUserId: to.id,
        amountCents: cents,
        memo: input.memo.trim() || "—",
        idempotencyKey: key,
        status: "settled",
      })
      .returning();

    const transfer: LedgerTransfer = {
      id: row!.id,
      fromHandle: from.handle,
      toHandle: to.handle,
      amountUsd: centsToUsd(cents),
      memo: row!.memo,
      status: "settled",
      createdAt: new Date(row!.createdAt).toISOString(),
    };
    return { ok: true as const, replay: false, transfer };
  });

  if (result.ok && !result.replay) {
    try {
      await notifyPersonTransfer(result.transfer);
    } catch {
      // Inbox write must not roll back a settled send.
    }
  }
  return result;
}

export async function listPeople() {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      handle: users.handle,
      balanceCents: users.balanceCents,
    })
    .from(users)
    .where(eq(users.kind, "person"));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    handle: row.handle,
    balanceUsd: centsToUsd(row.balanceCents),
  }));
}

export async function listRecipients(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(transfers)
    .where(or(eq(transfers.fromUserId, userId), eq(transfers.toUserId, userId)))
    .orderBy(desc(transfers.createdAt));

  const counterpartIds: string[] = [];
  for (const row of rows) {
    const other = row.fromUserId === userId ? row.toUserId : row.fromUserId;
    if (other !== userId && !counterpartIds.includes(other)) {
      counterpartIds.push(other);
    }
  }
  if (counterpartIds.length === 0) return [];

  const found = await db
    .select({
      id: users.id,
      name: users.name,
      handle: users.handle,
      kind: users.kind,
    })
    .from(users)
    .where(inArray(users.id, counterpartIds));
  const byId = new Map(
    found.filter((row) => row.kind === "person").map((row) => [row.id, row]),
  );
  return counterpartIds
    .map((id) => {
      const row = byId.get(id);
      return row ? { id: row.id, name: row.name, handle: row.handle } : null;
    })
    .filter((row) => row !== null);
}

export async function lookupPerson(
  rawHandle: string,
  opts: { excludeUserId?: string } = {},
) {
  const handle = completeHandle(rawHandle);
  if (!handle) return { ok: false as const, reason: "Enter who to send to." };
  if (!HANDLE_RE.test(handle)) {
    return { ok: false as const, reason: "Handle should look like nina.pay." };
  }
  const user = await findUserByHandle(handle);
  if (!user || user.kind !== "person") {
    return { ok: false as const, reason: `Nobody at ${handle}.` };
  }
  if (opts.excludeUserId && user.id === opts.excludeUserId) {
    return { ok: false as const, reason: "Can't send to yourself." };
  }
  return {
    ok: true as const,
    person: { id: user.id, name: user.name, handle: user.handle },
  };
}

export async function listTransfersForUser(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(transfers)
    .where(or(eq(transfers.fromUserId, userId), eq(transfers.toUserId, userId)))
    .orderBy(desc(transfers.createdAt));

  const allUsers = await db
    .select({ id: users.id, handle: users.handle })
    .from(users);
  const handles = new Map(allUsers.map((u) => [u.id, u.handle]));

  return rows.map((row) => ({
    id: row.id,
    fromHandle: handles.get(row.fromUserId) ?? "unknown",
    toHandle: handles.get(row.toUserId) ?? "unknown",
    amountUsd: centsToUsd(row.amountCents),
    memo: row.memo,
    at: new Date(row.createdAt).toISOString(),
    status: row.status,
  }));
}

export async function findTransferForUser(transferId: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(transfers)
    .where(eq(transfers.id, transferId))
    .limit(1);
  if (!row) return null;
  if (row.fromUserId !== userId && row.toUserId !== userId) return null;

  const [from, to] = await Promise.all([
    findUserById(row.fromUserId),
    findUserById(row.toUserId),
  ]);

  return {
    id: row.id,
    fromHandle: from?.handle ?? "unknown",
    fromName: from?.name ?? "Unknown",
    toHandle: to?.handle ?? "unknown",
    toName: to?.name ?? "Unknown",
    amountUsd: centsToUsd(row.amountCents),
    memo: row.memo,
    at: new Date(row.createdAt).toISOString(),
    status: row.status,
  };
}

export async function findUserByHandle(handle: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.handle, completeHandle(handle)))
    .limit(1);
  return row ?? null;
}

export async function findUserById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export function isPersonLocked(row: { kind: string; locked: number }) {
  return row.kind === "person" && row.locked !== 0;
}

export async function setPersonLocked(userId: string, locked: boolean) {
  const user = await findUserById(userId);
  if (!user || user.kind !== "person") {
    return { ok: false as const, reason: "Account not found." };
  }
  const next = locked ? 1 : 0;
  if (user.locked === next) {
    return { ok: true as const, replay: true, locked };
  }
  const db = getDb();
  await db.update(users).set({ locked: next }).where(eq(users.id, userId));
  try {
    await notifyWalletLock({ userId, locked });
  } catch {
    // Inbox write is optional.
  }
  return { ok: true as const, replay: false, locked };
}

export async function createUser(input: {
  name?: string;
  handle?: string;
  password?: string;
}) {
  const shape = validateSignupShape(input);
  if (!shape.ok) return shape;
  const taken = await findUserByHandle(shape.handle);
  if (taken) return { ok: false as const, reason: "That handle is taken." };

  const db = getDb();
  const id = crypto.randomUUID();
  try {
    await db.insert(users).values({
      id,
      handle: shape.handle,
      name: shape.name,
      passwordHash: bcrypt.hashSync(shape.password, 10),
      balanceCents: SIGNUP_BALANCE_CENTS,
      kind: "person",
    });
  } catch {
    return { ok: false as const, reason: "That handle is taken." };
  }

  try {
    await notifyWelcome(id, shape.name);
  } catch {
    // Welcome note is optional.
  }

  return {
    ok: true as const,
    user: {
      id,
      handle: shape.handle,
      name: shape.name,
      balanceUsd: centsToUsd(SIGNUP_BALANCE_CENTS),
    },
  };
}
