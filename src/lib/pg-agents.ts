import bcrypt from "bcryptjs";
import { and, desc, eq } from "drizzle-orm";
import { agentPayments, agents, getDb, transfers, users } from "@/db";
import { getApiById, vendorHandleForApi } from "@/lib/api-vendors";
import { centsToUsd, usdToCents } from "@/lib/cents";
import { executeTransfer, findUserByHandle, findUserById } from "@/lib/pg-ledger";
import { evaluatePolicy, type AgentStatus } from "@/lib/policy";

export type AgentDto = {
  id: string;
  name: string;
  handle: string;
  status: AgentStatus;
  balanceUsd: number;
  fundedUsd: number;
  spentTodayUsd: number;
  dailyCapUsd: number;
  perRequestMaxUsd: number;
  allowlist: string[];
  publicKey: string;
};

export type PaymentDto = {
  id: string;
  at: string;
  agentId: string;
  apiName: string;
  host: string;
  amountUsd: number;
  status: "settled" | "blocked";
  reason: string;
};

export type AgentPaymentReceipt = {
  id: string;
  agentId: string;
  agentName: string;
  agentHandle: string;
  apiId: string;
  apiName: string;
  host: string;
  amountUsd: number;
  status: "settled" | "blocked";
  reason: string;
  at: string;
  transferId: string | null;
  vendorHandle: string | null;
  vendorName: string | null;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function parseAllowlist(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function serializeAllowlist(list: string[]) {
  return JSON.stringify(list.map((h) => h.trim().toLowerCase()).filter(Boolean));
}

function agentHandleFromPrefix(prefix: string) {
  const clean =
    prefix.trim().toLowerCase().replace(/[^a-z0-9-]/g, "") || "agent";
  return clean.endsWith(".pay") ? clean : `${clean}.pay`;
}

function toAgentDto(
  user: typeof users.$inferSelect,
  row: typeof agents.$inferSelect,
): AgentDto {
  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    status: row.status as AgentStatus,
    balanceUsd: centsToUsd(user.balanceCents),
    fundedUsd: centsToUsd(row.fundedCents),
    spentTodayUsd: centsToUsd(row.spentTodayCents),
    dailyCapUsd: centsToUsd(row.dailyCapCents),
    perRequestMaxUsd: centsToUsd(row.perRequestMaxCents),
    allowlist: parseAllowlist(row.allowlist),
    publicKey: row.publicKey || `0x${user.id.slice(0, 4)}…${user.id.slice(-4)}`,
  };
}

async function loadAgentForOwner(agentUserId: string, ownerUserId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(agents)
    .where(
      and(eq(agents.userId, agentUserId), eq(agents.ownerUserId, ownerUserId)),
    )
    .limit(1);
  if (!row) return null;
  const user = await findUserById(agentUserId);
  if (!user) return null;
  return { user, row };
}

async function ensureSpentToday(
  row: typeof agents.$inferSelect,
): Promise<typeof agents.$inferSelect> {
  const today = todayKey();
  if (row.spentOn === today) return row;
  const db = getDb();
  await db
    .update(agents)
    .set({ spentTodayCents: 0, spentOn: today })
    .where(eq(agents.userId, row.userId));
  return { ...row, spentTodayCents: 0, spentOn: today };
}

export async function listAgentsForOwner(ownerUserId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(agents)
    .where(eq(agents.ownerUserId, ownerUserId));
  const out: AgentDto[] = [];
  for (const row of rows) {
    const user = await findUserById(row.userId);
    if (!user) continue;
    const fresh = await ensureSpentToday(row);
    out.push(toAgentDto(user, fresh));
  }
  return out;
}

export async function findAgentPaymentForOwner(
  paymentId: string,
  ownerUserId: string,
) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(agentPayments)
    .where(eq(agentPayments.id, paymentId))
    .limit(1);
  if (!row || row.ownerUserId !== ownerUserId) return null;

  const agent = await findUserById(row.agentUserId);
  if (!agent) return null;

  let vendorHandle = vendorHandleForApi(row.apiId);
  let vendorName: string | null = null;

  if (row.transferId) {
    const [xfer] = await db
      .select()
      .from(transfers)
      .where(eq(transfers.id, row.transferId))
      .limit(1);
    if (xfer) {
      const vendor = await findUserById(xfer.toUserId);
      vendorHandle = vendor?.handle ?? vendorHandle;
      vendorName = vendor?.name ?? null;
    }
  } else if (vendorHandle) {
    const vendor = await findUserByHandle(vendorHandle);
    vendorName = vendor?.name ?? null;
  }

  return {
    id: row.id,
    agentId: row.agentUserId,
    agentName: agent.name,
    agentHandle: agent.handle,
    apiId: row.apiId,
    apiName: row.apiName,
    host: row.host,
    amountUsd: centsToUsd(row.amountCents),
    status: row.status as AgentPaymentReceipt["status"],
    reason: row.reason,
    at: new Date(row.createdAt).toISOString(),
    transferId: row.transferId,
    vendorHandle,
    vendorName,
  } satisfies AgentPaymentReceipt;
}

export async function listPaymentsForOwner(ownerUserId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(agentPayments)
    .where(eq(agentPayments.ownerUserId, ownerUserId))
    .orderBy(desc(agentPayments.createdAt))
    .limit(100);
  return rows.map(
    (row): PaymentDto => ({
      id: row.id,
      at: new Date(row.createdAt).toISOString(),
      agentId: row.agentUserId,
      apiName: row.apiName,
      host: row.host,
      amountUsd: centsToUsd(row.amountCents),
      status: row.status as PaymentDto["status"],
      reason: row.reason,
    }),
  );
}

export async function issueAgent(
  ownerUserId: string,
  input: {
    name?: string;
    prefix?: string;
    dailyCapUsd?: number;
    perRequestMaxUsd?: number;
  },
) {
  const name = input.name?.trim() || "New Agent";
  const handle = agentHandleFromPrefix(input.prefix ?? "agent");
  const dailyCapCents = usdToCents(input.dailyCapUsd ?? 5) ?? 500;
  const perRequestMaxCents = usdToCents(input.perRequestMaxUsd ?? 0.25) ?? 25;

  const owner = await findUserById(ownerUserId);
  if (!owner) return { ok: false as const, reason: "Owner not found." };

  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);
  if (existing.length > 0) {
    return { ok: false as const, reason: "That handle is taken." };
  }

  const userId = crypto.randomUUID();
  const allowlist = JSON.stringify(["api.search.com"]);
  const publicKey = `0x${Math.random().toString(16).slice(2, 6)}…${Math.random().toString(16).slice(2, 6)}`;

  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        handle,
        name,
        passwordHash: bcrypt.hashSync(crypto.randomUUID(), 10),
        balanceCents: 0,
        kind: "agent",
      });
      await tx.insert(agents).values({
        userId,
        ownerUserId,
        status: "active",
        dailyCapCents,
        perRequestMaxCents,
        allowlist,
        spentTodayCents: 0,
        spentOn: todayKey(),
        fundedCents: 0,
        publicKey,
      });
    });
  } catch {
    return { ok: false as const, reason: "Could not create agent." };
  }

  const loaded = await loadAgentForOwner(userId, ownerUserId);
  if (!loaded) return { ok: false as const, reason: "Agent missing after create." };
  return { ok: true as const, agent: toAgentDto(loaded.user, loaded.row) };
}

export async function fundAgent(
  ownerUserId: string,
  agentUserId: string,
  input: { amountUsd?: number; idempotencyKey?: string },
) {
  const owner = await findUserById(ownerUserId);
  const loaded = await loadAgentForOwner(agentUserId, ownerUserId);
  if (!owner || !loaded) {
    return { ok: false as const, reason: "Agent not found." };
  }

  const amountUsd = input.amountUsd ?? 10;
  const key = input.idempotencyKey?.trim() || crypto.randomUUID();
  const transfer = await executeTransfer({
    fromHandle: owner.handle,
    toHandle: loaded.user.handle,
    amountUsd,
    memo: "Fund agent wallet",
    idempotencyKey: key,
  });
  if (!transfer.ok) return transfer;

  const cents = usdToCents(amountUsd)!;
  if (!transfer.replay) {
    const db = getDb();
    await db
      .update(agents)
      .set({ fundedCents: loaded.row.fundedCents + cents })
      .where(eq(agents.userId, agentUserId));
  }

  const refreshed = await loadAgentForOwner(agentUserId, ownerUserId);
  if (!refreshed) return { ok: false as const, reason: "Agent missing." };
  return {
    ok: true as const,
    agent: toAgentDto(refreshed.user, refreshed.row),
    transfer: transfer.transfer,
  };
}

export async function toggleAgentStatus(
  ownerUserId: string,
  agentUserId: string,
) {
  const loaded = await loadAgentForOwner(agentUserId, ownerUserId);
  if (!loaded) return { ok: false as const, reason: "Agent not found." };
  const next = loaded.row.status === "active" ? "paused" : "active";
  const db = getDb();
  await db
    .update(agents)
    .set({ status: next })
    .where(eq(agents.userId, agentUserId));
  return {
    ok: true as const,
    agent: toAgentDto(loaded.user, { ...loaded.row, status: next }),
  };
}

export async function updateAgentPolicy(
  ownerUserId: string,
  agentUserId: string,
  input: {
    dailyCapUsd?: number;
    perRequestMaxUsd?: number;
    allowlist?: string[];
    addHost?: string;
    dropHost?: string;
  },
) {
  const loaded = await loadAgentForOwner(agentUserId, ownerUserId);
  if (!loaded) return { ok: false as const, reason: "Agent not found." };

  let allowlist = parseAllowlist(loaded.row.allowlist);
  if (input.allowlist) {
    allowlist = input.allowlist;
  }
  if (input.addHost) {
    const host = input.addHost.trim().toLowerCase();
    if (host && !allowlist.includes(host)) allowlist.push(host);
  }
  if (input.dropHost) {
    const host = input.dropHost.trim().toLowerCase();
    allowlist = allowlist.filter((h) => h !== host);
  }

  const patch: Partial<typeof agents.$inferInsert> = {
    allowlist: serializeAllowlist(allowlist),
  };
  if (input.dailyCapUsd !== undefined) {
    const cents = usdToCents(input.dailyCapUsd);
    if (cents === null) return { ok: false as const, reason: "Invalid daily cap." };
    patch.dailyCapCents = cents;
  }
  if (input.perRequestMaxUsd !== undefined) {
    const cents = usdToCents(input.perRequestMaxUsd);
    if (cents === null) {
      return { ok: false as const, reason: "Invalid per-request max." };
    }
    patch.perRequestMaxCents = cents;
  }

  const db = getDb();
  await db.update(agents).set(patch).where(eq(agents.userId, agentUserId));
  const refreshed = await loadAgentForOwner(agentUserId, ownerUserId);
  if (!refreshed) return { ok: false as const, reason: "Agent missing." };
  return { ok: true as const, agent: toAgentDto(refreshed.user, refreshed.row) };
}

export async function attemptAgentPay(
  ownerUserId: string,
  input: { agentId?: string; apiId?: string; idempotencyKey?: string },
) {
  const agentUserId = input.agentId?.trim() ?? "";
  const apiId = input.apiId?.trim() ?? "";
  const api = getApiById(apiId);
  const vendorHandle = vendorHandleForApi(apiId);
  if (!api || !vendorHandle) {
    return { ok: false as const, reason: "missing agent or API" };
  }

  const loaded = await loadAgentForOwner(agentUserId, ownerUserId);
  if (!loaded) return { ok: false as const, reason: "Agent not found." };

  const row = await ensureSpentToday(loaded.row);
  const agentDto = toAgentDto(loaded.user, row);
  const decision = evaluatePolicy(agentDto, {
    host: api.host,
    priceUsd: api.priceUsd,
  });

  const db = getDb();
  const paymentId = crypto.randomUUID();
  const amountCents = usdToCents(api.priceUsd)!;

  if (!decision.ok) {
    await db.insert(agentPayments).values({
      id: paymentId,
      agentUserId,
      ownerUserId,
      apiId,
      apiName: api.name,
      host: api.host,
      amountCents,
      status: "blocked",
      reason: decision.reason,
    });
    return { ok: false as const, reason: decision.reason, paymentId };
  }

  if (loaded.user.balanceCents < amountCents) {
    const reason = "insufficient virtual wallet balance";
    await db.insert(agentPayments).values({
      id: paymentId,
      agentUserId,
      ownerUserId,
      apiId,
      apiName: api.name,
      host: api.host,
      amountCents,
      status: "blocked",
      reason,
    });
    return { ok: false as const, reason, paymentId };
  }

  const key = input.idempotencyKey?.trim() || crypto.randomUUID();
  const transfer = await executeTransfer({
    fromHandle: loaded.user.handle,
    toHandle: vendorHandle,
    amountUsd: api.priceUsd,
    memo: `402 pay · ${api.name}`,
    idempotencyKey: key,
  });
  if (!transfer.ok) {
    await db.insert(agentPayments).values({
      id: paymentId,
      agentUserId,
      ownerUserId,
      apiId,
      apiName: api.name,
      host: api.host,
      amountCents,
      status: "blocked",
      reason: transfer.reason,
    });
    return { ok: false as const, reason: transfer.reason, paymentId };
  }

  if (!transfer.replay) {
    await db
      .update(agents)
      .set({ spentTodayCents: row.spentTodayCents + amountCents })
      .where(eq(agents.userId, agentUserId));
  }

  await db.insert(agentPayments).values({
    id: paymentId,
    agentUserId,
    ownerUserId,
    apiId,
    apiName: api.name,
    host: api.host,
    amountCents,
    status: "settled",
    reason: decision.reason,
    transferId: transfer.transfer.id,
  });

  return { ok: true as const, reason: decision.reason, paymentId };
}
