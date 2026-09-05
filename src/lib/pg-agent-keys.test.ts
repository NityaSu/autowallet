import { describe, expect, it } from "vitest";
import { ensureDb } from "@/db";
import {
  createAgentKey,
  findAgentKeyAuth,
  listAgentKeys,
  MAX_KEYS_PER_AGENT,
  parseBearerToken,
  revokeAgentKey,
} from "@/lib/pg-agent-keys";
import { listAgentsForOwner } from "@/lib/pg-agents";
import { findUserByHandle } from "@/lib/pg-ledger";

describe("agent API keys", () => {
  it("parses Bearer ak_ tokens only", () => {
    expect(parseBearerToken(null)).toBeNull();
    expect(parseBearerToken("Basic abc")).toBeNull();
    expect(parseBearerToken("Bearer sk_nope")).toBeNull();
    expect(parseBearerToken("Bearer ak_abc123")).toBe("ak_abc123");
  });

  it(
    "creates a hashed key, looks it up, and revokes it",
    async () => {
      await ensureDb();
      const sunik = await findUserByHandle("sunik.pay");
      expect(sunik).toBeTruthy();
      if (!sunik) return;

      const agents = await listAgentsForOwner(sunik.id);
      const research = agents.find((a) => a.handle === "research-agent.pay");
      expect(research).toBeTruthy();
      if (!research) return;

      const created = await createAgentKey(sunik.id, research.id, "Lab");
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      expect(created.key.token.startsWith("ak_")).toBe(true);
      expect(created.key.hint.startsWith("ak_")).toBe(true);
      expect(created.key.name).toBe("Lab");

      const listed = await listAgentKeys(sunik.id, research.id);
      expect(listed.some((k) => k.id === created.key.id)).toBe(true);
      expect(listed.find((k) => k.id === created.key.id)?.hint).not.toContain(
        created.key.token.slice(8),
      );

      const auth = await findAgentKeyAuth(created.key.token);
      expect(auth?.ownerUserId).toBe(sunik.id);
      expect(auth?.agentUserId).toBe(research.id);

      const other = await findAgentKeyAuth("ak_notarealkey00000000000000000000");
      expect(other).toBeNull();

      const revoked = await revokeAgentKey(sunik.id, research.id, created.key.id);
      expect(revoked.ok).toBe(true);
      expect(await findAgentKeyAuth(created.key.token)).toBeNull();
      const after = await listAgentKeys(sunik.id, research.id);
      expect(after.some((k) => k.id === created.key.id)).toBe(false);

      const again = await revokeAgentKey(sunik.id, research.id, created.key.id);
      expect(again.ok).toBe(false);
    },
    20000,
  );

  it(
    "does not issue a key for someone else's agent",
    async () => {
      await ensureDb();
      const sunik = await findUserByHandle("sunik.pay");
      const midas = await findUserByHandle("midas.pay");
      expect(sunik && midas).toBeTruthy();
      if (!sunik || !midas) return;

      const agents = await listAgentsForOwner(sunik.id);
      const research = agents.find((a) => a.handle === "research-agent.pay");
      expect(research).toBeTruthy();
      if (!research) return;

      const stolen = await createAgentKey(midas.id, research.id, "Nope");
      expect(stolen.ok).toBe(false);
    },
    20000,
  );

  it(
    "caps active keys per agent",
    async () => {
      await ensureDb();
      const sunik = await findUserByHandle("sunik.pay");
      expect(sunik).toBeTruthy();
      if (!sunik) return;

      const agents = await listAgentsForOwner(sunik.id);
      const coding = agents.find((a) => a.handle === "coding-agent.pay");
      expect(coding).toBeTruthy();
      if (!coding) return;

      for (let i = 0; i < MAX_KEYS_PER_AGENT + 1; i += 1) {
        await createAgentKey(sunik.id, coding.id, `k-${i}`);
      }
      const overflow = await createAgentKey(sunik.id, coding.id, "overflow");
      expect(overflow.ok).toBe(false);
      if (!overflow.ok) {
        expect(overflow.reason).toContain("At most");
      }
    },
    20000,
  );
});
