import { describe, expect, it } from "vitest";
import { ensureDb } from "@/db";
import { findUserByHandle } from "@/lib/pg-ledger";
import {
  attemptAgentPay,
  findAgentPaymentForOwner,
  fundAgent,
  issueAgent,
  listAgentsForOwner,
} from "@/lib/pg-agents";

describe("agent ledger", () => {
  it(
    "seeds demo agents for sunik and settles a blocked pay",
    async () => {
      await ensureDb();
      const sunik = await findUserByHandle("sunik.pay");
      expect(sunik).toBeTruthy();
      if (!sunik) return;

      const agents = await listAgentsForOwner(sunik.id);
      expect(agents.length).toBeGreaterThanOrEqual(1);
      const research = agents.find((a) => a.handle === "research-agent.pay");
      expect(research).toBeTruthy();
      if (!research) return;

      const blocked = await attemptAgentPay(sunik.id, {
        agentId: research.id,
        apiId: "unknown",
        idempotencyKey: `block-${Date.now()}`,
      });
      expect(blocked.ok).toBe(false);
      expect(blocked.reason).toContain("allowlist");
      expect(blocked.paymentId).toBeTruthy();
      if (!blocked.paymentId) return;
      const receipt = await findAgentPaymentForOwner(blocked.paymentId, sunik.id);
      expect(receipt?.status).toBe("blocked");
      expect(receipt?.apiName).toBe("Unknown API");
      const hidden = await findAgentPaymentForOwner(
        blocked.paymentId,
        "99999999-9999-9999-9999-999999999999",
      );
      expect(hidden).toBeNull();
    },
    20000,
  );

  it(
    "issues, funds, and pays through policy",
    async () => {
      await ensureDb();
      const sunik = await findUserByHandle("sunik.pay");
      expect(sunik).toBeTruthy();
      if (!sunik) return;

      const prefix = `test-${Date.now().toString(36)}`;
      const issued = await issueAgent(sunik.id, {
        name: "Test Agent",
        prefix,
        dailyCapUsd: 5,
        perRequestMaxUsd: 1,
      });
      expect(issued.ok).toBe(true);
      if (!issued.ok) return;

      const funded = await fundAgent(sunik.id, issued.agent.id, {
        amountUsd: 5,
        idempotencyKey: `fund-${Date.now()}`,
      });
      expect(funded.ok).toBe(true);

      const paid = await attemptAgentPay(sunik.id, {
        agentId: issued.agent.id,
        apiId: "search",
        idempotencyKey: `pay-${Date.now()}`,
      });
      expect(paid.ok).toBe(true);
      if (!paid.ok) return;
      expect(paid.paymentId).toBeTruthy();
      const receipt = await findAgentPaymentForOwner(paid.paymentId!, sunik.id);
      expect(receipt?.status).toBe("settled");
      expect(receipt?.transferId).toBeTruthy();
      expect(receipt?.vendorHandle).toBe("search-api.pay");
    },
    20000,
  );
});
