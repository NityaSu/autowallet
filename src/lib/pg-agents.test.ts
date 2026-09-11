import { describe, expect, it } from "vitest";
import { ensureDb } from "@/db";
import { findUserByHandle } from "@/lib/pg-ledger";
import {
  attemptAgentPay,
  findAgentPaymentForOwner,
  fundAgent,
  issueAgent,
  listAgentAudit,
  listAgentAuditAll,
  listAgentsForOwner,
  toAgentAuditCsv,
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

      const travel = agents.find((a) => a.handle === "travel-agent.pay");
      expect(travel).toBeTruthy();
      if (!travel) return;
      const hotel = await attemptAgentPay(sunik.id, {
        agentId: travel.id,
        apiId: "hotel",
        idempotencyKey: `hotel-${Date.now()}`,
      });
      expect(hotel.ok).toBe(true);
      const bus = await attemptAgentPay(sunik.id, {
        agentId: travel.id,
        apiId: "bus",
        idempotencyKey: `bus-${Date.now()}`,
      });
      expect(bus.ok).toBe(false);
      expect(bus.reason).toContain("allowlist");
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

  it(
    "returns an agent audit with CSV export",
    async () => {
      await ensureDb();
      const sunik = await findUserByHandle("sunik.pay");
      expect(sunik).toBeTruthy();
      if (!sunik) return;

      const agents = await listAgentsForOwner(sunik.id);
      const research = agents.find((a) => a.handle === "research-agent.pay");
      expect(research).toBeTruthy();
      if (!research) return;

      const key = `audit-${Date.now()}`;
      const blocked = await attemptAgentPay(sunik.id, {
        agentId: research.id,
        apiId: "unknown",
        idempotencyKey: key,
      });
      expect(blocked.ok).toBe(false);
      expect(blocked.paymentId).toBeTruthy();

      const today = new Date().toISOString().slice(0, 10);
      const range = { from: today, to: today };

      const page = await listAgentAudit(sunik.id, research.id, range, { page: 1, limit: 5 });
      expect(page.payments.length).toBeGreaterThanOrEqual(1);
      expect(page.payments.length).toBeLessThanOrEqual(5);
      expect(page.pagination.page).toBe(1);
      expect(page.pagination.limit).toBe(5);
      expect(page.pagination.total).toBeGreaterThanOrEqual(1);
      expect(page.pagination.totalPages).toBeGreaterThanOrEqual(1);
      const found = page.payments.find((e) => e.id === blocked.paymentId);
      expect(found).toBeTruthy();
      expect(found?.status).toBe("blocked");
      expect(found?.agentHandle).toBe(research.handle);
      expect(found?.agentName).toBe(research.name);
      expect(found?.apiName).toBe("Unknown API");

      const all = await listAgentAuditAll(sunik.id, research.id, range);
      expect(all.length).toBe(page.pagination.total);

      const csv = toAgentAuditCsv(all.slice(0, 1));
      expect(csv).toContain("id,at,agent_id,agent_handle,agent_name");
      expect(csv).toContain(blocked.paymentId!);
    },
    20000,
  );

  it(
    "serializes parallel pays against the daily cap",
    async () => {
      await ensureDb();
      const sunik = await findUserByHandle("sunik.pay");
      expect(sunik).toBeTruthy();
      if (!sunik) return;

      const prefix = `cap-${Date.now().toString(36)}`;
      const issued = await issueAgent(sunik.id, {
        name: "Cap Agent",
        prefix,
        dailyCapUsd: 0.05,
        perRequestMaxUsd: 1,
      });
      expect(issued.ok).toBe(true);
      if (!issued.ok) return;

      const funded = await fundAgent(sunik.id, issued.agent.id, {
        amountUsd: 5,
        idempotencyKey: `fund-cap-${prefix}`,
      });
      expect(funded.ok).toBe(true);

      const results = await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          attemptAgentPay(sunik.id, {
            agentId: issued.agent.id,
            apiId: "search",
            idempotencyKey: `cap-${prefix}-${i}`,
          }),
        ),
      );
      const settled = results.filter((r) => r.ok);
      expect(settled.length).toBeLessThanOrEqual(2);
      const after = (await listAgentsForOwner(sunik.id)).find(
        (a) => a.id === issued.agent.id,
      );
      expect(after?.spentTodayUsd).toBeCloseTo(settled.length * 0.02, 2);
      expect(after?.spentTodayUsd ?? 0).toBeLessThanOrEqual(0.05 + 1e-9);
    },
    20000,
  );
});
