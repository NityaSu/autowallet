import bcrypt from "bcryptjs";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb, transfers, users } from "@/db";
import { centsToUsd, SIGNUP_BALANCE_CENTS, usdToCents } from "@/lib/cents";
import {
  normalizeHandle,
  validateSignupShape,
  validateTransferShape,
  type LedgerTransfer,
  type TransferInput,
  type TransferResult,
} from "@/lib/ledger-types";

export async function executeTransfer(
  input: TransferInput,
): Promise<TransferResult> {
  const shape = validateTransferShape(input);
  if (shape) return shape;
  const cents = usdToCents(input.amountUsd);
  if (cents === null) return { ok: false, reason: "Enter an amount." };

  const fromHandle = normalizeHandle(input.fromHandle);
  const toHandle = normalizeHandle(input.toHandle);
  const key = input.idempotencyKey.trim();
  const db = getDb();

  return db.transaction(async (tx) => {
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
    .from(users);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    handle: row.handle,
    balanceUsd: centsToUsd(row.balanceCents),
  }));
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
    .where(eq(users.handle, normalizeHandle(handle)))
    .limit(1);
  return row ?? null;
}

export async function findUserById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
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
    });
  } catch {
    return { ok: false as const, reason: "That handle is taken." };
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
