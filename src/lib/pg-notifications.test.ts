import { describe, expect, it } from "vitest";
import { ensureDb } from "@/db";
import { createAgentKey, revokeAgentKey } from "@/lib/pg-agent-keys";
import {
  attemptAgentPay,
  fundAgent,
  issueAgent,
  listAgentsForOwner,
} from "@/lib/pg-agents";
import { createUser, executeTransfer, findUserByHandle } from "@/lib/pg-ledger";
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/pg-notifications";
import { createWebhookEndpoint } from "@/lib/pg-webhooks";

describe("notifications", () => {
  it(
    "welcomes a new user and isolates inboxes",
    async () => {
      await ensureDb();
      const stamp = Date.now().toString(36);
      const created = await createUser({
        name: "Nina Cole",
        handle: `nina-${stamp}.pay`,
        password: "demo",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const inbox = await listNotificationsForUser(created.user.id);
      expect(inbox.items.some((n) => n.type === "account.welcome")).toBe(true);
      expect(inbox.unread).toBeGreaterThan(0);

      const sunik = await findUserByHandle("sunik.pay");
      expect(sunik).toBeTruthy();
      if (!sunik) return;
      const stolen = await markNotificationRead(sunik.id, inbox.items[0]!.id);
      expect(stolen.ok).toBe(false);
      const still = await listNotificationsForUser(created.user.id);
      expect(still.items.find((n) => n.id === inbox.items[0]!.id)?.read).toBe(
        false,
      );
    },
    20000,
  );

  it(
    "records person-to-person send and receive, then marks read",
    async () => {
      await ensureDb();
      const stamp = Date.now().toString(36);
      const from = await createUser({
        name: "Ada Sender",
        handle: `ada-${stamp}.pay`,
        password: "demo",
      });
      const to = await createUser({
        name: "Bob Receiver",
        handle: `bob-${stamp}.pay`,
        password: "demo",
      });
      expect(from.ok && to.ok).toBe(true);
      if (!from.ok || !to.ok) return;

      const sent = await executeTransfer({
        fromHandle: from.user.handle,
        toHandle: to.user.handle,
        amountUsd: 3.5,
        memo: "lunch",
        idempotencyKey: `note-p2p-${stamp}`,
      });
      expect(sent.ok).toBe(true);
      if (!sent.ok) return;

      const replay = await executeTransfer({
        fromHandle: from.user.handle,
        toHandle: to.user.handle,
        amountUsd: 3.5,
        memo: "lunch",
        idempotencyKey: `note-p2p-${stamp}`,
      });
      expect(replay.ok && replay.replay).toBe(true);

      const fromInbox = await listNotificationsForUser(from.user.id);
      const toInbox = await listNotificationsForUser(to.user.id);
      const sentNote = fromInbox.items.find(
        (n) => n.type === "transfer.sent" && n.href?.includes(sent.transfer.id),
      );
      const receivedNote = toInbox.items.find(
        (n) =>
          n.type === "transfer.received" && n.href?.includes(sent.transfer.id),
      );
      expect(sentNote?.body).toContain("lunch");
      expect(receivedNote?.title).toContain("$3.50");
      expect(
        fromInbox.items.filter((n) => n.href?.includes(sent.transfer.id)),
      ).toHaveLength(1);

      const marked = await markNotificationRead(from.user.id, sentNote!.id);
      expect(marked.ok).toBe(true);
      const afterOne = await listNotificationsForUser(from.user.id);
      expect(afterOne.items.find((n) => n.id === sentNote!.id)?.read).toBe(true);

      await markAllNotificationsRead(to.user.id);
      const afterAll = await listNotificationsForUser(to.user.id);
      expect(afterAll.unread).toBe(0);
      expect(afterAll.items.every((n) => n.read)).toBe(true);
    },
    20000,
  );

  it(
    "notifies owner on agent fund, blocked pay, key, and webhook — not P2P",
    async () => {
      await ensureDb();
      const sunik = await findUserByHandle("sunik.pay");
      expect(sunik).toBeTruthy();
      if (!sunik) return;

      const prefix = `note-${Date.now().toString(36)}`;
      const issued = await issueAgent(sunik.id, {
        name: "Notify Agent",
        prefix,
        dailyCapUsd: 5,
        perRequestMaxUsd: 1,
      });
      expect(issued.ok).toBe(true);
      if (!issued.ok) return;

      const funded = await fundAgent(sunik.id, issued.agent.id, {
        amountUsd: 4,
        idempotencyKey: `note-fund-${prefix}`,
      });
      expect(funded.ok).toBe(true);

      const blocked = await attemptAgentPay(sunik.id, {
        agentId: issued.agent.id,
        apiId: "unknown",
        idempotencyKey: `note-block-${prefix}`,
      });
      expect(blocked.ok).toBe(false);
      expect(blocked.paymentId).toBeTruthy();

      const key = await createAgentKey(sunik.id, issued.agent.id, "Inbox");
      expect(key.ok).toBe(true);
      if (key.ok) {
        await revokeAgentKey(sunik.id, issued.agent.id, key.key.id);
      }

      const hook = await createWebhookEndpoint(
        sunik.id,
        `https://hooks.example.com/note-${prefix}`,
      );
      expect(hook.ok).toBe(true);

      const inbox = await listNotificationsForUser(sunik.id);
      const types = inbox.items.map((n) => n.type);
      expect(types).toContain("agent.created");
      expect(types).toContain("agent.funded");
      expect(types).toContain("agent.payment.blocked");
      expect(types).toContain("agent.key.created");
      expect(types).toContain("agent.key.revoked");
      expect(types).toContain("webhook.created");
      expect(
        inbox.items.some(
          (n) =>
            n.type === "transfer.sent" &&
            n.body.includes(issued.agent.handle),
        ),
      ).toBe(false);

      const payNote = inbox.items.find(
        (n) =>
          n.type === "agent.payment.blocked" &&
          n.href?.includes(blocked.paymentId ?? ""),
      );
      expect(payNote?.kind).toBe("money");
    },
    20000,
  );

  it("classifies demo seed welcome for sunik", async () => {
    await ensureDb();
    const sunik = await findUserByHandle("sunik.pay");
    expect(sunik).toBeTruthy();
    if (!sunik) return;
    const inbox = await listNotificationsForUser(sunik.id);
    expect(inbox.items.some((n) => n.type === "account.welcome")).toBe(true);
    const agents = await listAgentsForOwner(sunik.id);
    expect(agents.length).toBeGreaterThan(0);
  });
});
