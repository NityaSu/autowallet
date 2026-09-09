import { describe, expect, it } from "vitest";
import { ensureDb } from "@/db";
import { centsToUsd } from "@/lib/cents";
import { createUser, findUserById } from "@/lib/pg-ledger";
import { listNotificationsForUser } from "@/lib/pg-notifications";
import {
  createPaymentRequest,
  getPaymentRequestForUser,
  listIncomingRequests,
  payPaymentRequest,
} from "@/lib/pg-requests";

describe("payment requests", () => {
  it(
    "notifies the payer, moves money once, and blocks anyone else",
    async () => {
      await ensureDb();
      const stamp = Date.now().toString(36);
      const from = await createUser({
        name: "Ada Asker",
        handle: `ada-ask-${stamp}.pay`,
        password: "demo",
      });
      const to = await createUser({
        name: "Bob Payer",
        handle: `bob-pay-${stamp}.pay`,
        password: "demo",
      });
      const outsider = await createUser({
        name: "Eve Out",
        handle: `eve-out-${stamp}.pay`,
        password: "demo",
      });
      expect(from.ok && to.ok && outsider.ok).toBe(true);
      if (!from.ok || !to.ok || !outsider.ok) return;

      const created = await createPaymentRequest(from.user.id, {
        toHandle: to.user.handle,
        amountUsd: 5,
        memo: "lunch",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      expect(created.request.status).toBe("pending");
      expect(created.request.from.handle).toBe(from.user.handle);
      expect(created.request.to.handle).toBe(to.user.handle);

      const payerInbox = await listNotificationsForUser(to.user.id);
      const note = payerInbox.items.find((n) => n.type === "transfer.request");
      expect(note?.title).toBe("Ada Asker asked for $5.00");
      expect(note?.href).toBe(`/requests/${created.request.id}`);

      const askerInbox = await listNotificationsForUser(from.user.id);
      expect(askerInbox.items.some((n) => n.type === "transfer.request")).toBe(
        false,
      );

      const incoming = await listIncomingRequests(to.user.id);
      expect(incoming.map((r) => r.id)).toEqual([created.request.id]);

      const askerPay = await payPaymentRequest(from.user.id, created.request.id);
      expect(askerPay.ok).toBe(false);
      if (!askerPay.ok) expect(askerPay.reason).toMatch(/not for you/);

      const stolen = await payPaymentRequest(
        outsider.user.id,
        created.request.id,
      );
      expect(stolen.ok).toBe(false);
      if (!stolen.ok) expect(stolen.reason).toMatch(/not found/);

      const paid = await payPaymentRequest(to.user.id, created.request.id);
      expect(paid.ok).toBe(true);
      if (!paid.ok) return;
      expect(paid.replay).toBe(false);
      expect(paid.request.status).toBe("paid");
      expect(paid.request.transferId).toBeTruthy();

      const asker = await findUserById(from.user.id);
      const payer = await findUserById(to.user.id);
      expect(centsToUsd(asker!.balanceCents)).toBe(55);
      expect(centsToUsd(payer!.balanceCents)).toBe(45);

      const again = await payPaymentRequest(to.user.id, created.request.id);
      expect(again.ok).toBe(true);
      if (!again.ok) return;
      expect(again.replay).toBe(true);
      expect(again.request.transferId).toBe(paid.request.transferId);

      const stillAsker = await findUserById(from.user.id);
      const stillPayer = await findUserById(to.user.id);
      expect(centsToUsd(stillAsker!.balanceCents)).toBe(55);
      expect(centsToUsd(stillPayer!.balanceCents)).toBe(45);

      expect(await listIncomingRequests(to.user.id)).toEqual([]);

      const loaded = await getPaymentRequestForUser(
        created.request.id,
        from.user.id,
      );
      expect(loaded.ok).toBe(true);
      if (!loaded.ok) return;
      expect(loaded.request.status).toBe("paid");
    },
    20000,
  );

  it(
    "cannot request from yourself",
    async () => {
      await ensureDb();
      const stamp = Date.now().toString(36);
      const created = await createUser({
        name: "Solo Self",
        handle: `solo-${stamp}.pay`,
        password: "demo",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      const self = await createPaymentRequest(created.user.id, {
        toHandle: created.user.handle,
        amountUsd: 1,
      });
      expect(self.ok).toBe(false);
      if (!self.ok) expect(self.reason).toMatch(/yourself/);
    },
    20000,
  );
});
