import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { agentApiKeys, agents, getDb } from "@/db";

export const MAX_KEYS_PER_AGENT = 5;

export type AgentApiKeyDto = {
  id: string;
  name: string;
  hint: string;
  createdAt: string;
};

export type AgentApiKeyCreated = AgentApiKeyDto & {
  token: string;
};

export type AgentKeyAuth = {
  ownerUserId: string;
  agentUserId: string;
  keyId: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hintFromPrefix(prefix: string) {
  return `${prefix}…`;
}

function toDto(row: typeof agentApiKeys.$inferSelect): AgentApiKeyDto {
  return {
    id: row.id,
    name: row.name,
    hint: hintFromPrefix(row.keyPrefix),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export function parseBearerToken(header: string | null) {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  const token = match?.[1] ?? "";
  if (!token.startsWith("ak_")) return null;
  return token;
}

export async function listAgentKeys(ownerUserId: string, agentUserId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(agentApiKeys)
    .where(
      and(
        eq(agentApiKeys.ownerUserId, ownerUserId),
        eq(agentApiKeys.agentUserId, agentUserId),
        isNull(agentApiKeys.revokedAt),
      ),
    )
    .orderBy(desc(agentApiKeys.createdAt));
  return rows.map(toDto);
}

export async function createAgentKey(
  ownerUserId: string,
  agentUserId: string,
  name?: string,
) {
  const db = getDb();
  const [owned] = await db
    .select({ userId: agents.userId })
    .from(agents)
    .where(
      and(eq(agents.userId, agentUserId), eq(agents.ownerUserId, ownerUserId)),
    )
    .limit(1);
  if (!owned) return { ok: false as const, reason: "Agent not found." };

  const existing = await listAgentKeys(ownerUserId, agentUserId);
  if (existing.length >= MAX_KEYS_PER_AGENT) {
    return {
      ok: false as const,
      reason: `At most ${MAX_KEYS_PER_AGENT} active keys per agent.`,
    };
  }

  const token = `ak_${randomBytes(24).toString("hex")}`;
  const keyPrefix = token.slice(0, 7);
  const id = crypto.randomUUID();
  const label = name?.trim() || "Default";

  const [row] = await db
    .insert(agentApiKeys)
    .values({
      id,
      agentUserId,
      ownerUserId,
      name: label,
      keyPrefix,
      keyHash: hashToken(token),
    })
    .returning();
  if (!row) return { ok: false as const, reason: "Could not create key." };
  return {
    ok: true as const,
    key: { ...toDto(row), token } satisfies AgentApiKeyCreated,
  };
}

export async function revokeAgentKey(
  ownerUserId: string,
  agentUserId: string,
  keyId: string,
) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(agentApiKeys)
    .where(
      and(
        eq(agentApiKeys.id, keyId),
        eq(agentApiKeys.agentUserId, agentUserId),
        eq(agentApiKeys.ownerUserId, ownerUserId),
        isNull(agentApiKeys.revokedAt),
      ),
    )
    .limit(1);
  if (!row) return { ok: false as const, reason: "Key not found." };

  await db
    .update(agentApiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(agentApiKeys.id, keyId));
  return { ok: true as const };
}

export async function findAgentKeyAuth(token: string): Promise<AgentKeyAuth | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(agentApiKeys)
    .where(
      and(eq(agentApiKeys.keyHash, hashToken(token)), isNull(agentApiKeys.revokedAt)),
    )
    .limit(1);
  if (!row) return null;
  return {
    ownerUserId: row.ownerUserId,
    agentUserId: row.agentUserId,
    keyId: row.id,
  };
}
