import { describe, expect, it } from "vitest";
import { ensureDb } from "@/db";
import { centsToUsd } from "@/lib/cents";
import {
  createUser,
  executeTransfer,
  findUserById,
  setPersonLocked,
} from "@/lib/pg-ledger";
import { listNotificationsForUser } from "@/lib/pg-notifications";
import {
  createPaymentRequest,
  payPaymentRequest,
} from "@/lib/pg-requests";

describe("personal wallet lock", () => {
  it(
    "blocks outgoing send and paying a request, not incoming or asking",
    async () => {
      await ensureDb();
      const stamp = Date.now().toString(36);
      const locked = await createUser({
        name: "Lock Lee",
        handle: `lock-${stamp}.pay`,
        password: "demo",
      });
      const other = await createUser({
        name: "Open Owen",
        handle: `open-${stamp}.pay`,
        password: "demo",
      });
      expect(locked.ok && other.ok).toBe(true);
      if (!locked.ok || !other.ok) return;

      const flipped = await setPersonLocked(locked.user.id, true);
      expect(flipped.ok).toBe(true);
      expect(flipped.ok && flipped.locked).toBe(true);

      const inbox = await listNotificationsForUser(locked.user.id);
      expect(inbox.items.some((n) => n.type === "wallet.locked")).toBe(true);

      const sent = await executeTransfer({
        fromHandle: locked.user.handle,
        toHandle: other.user.handle,
        amountUsd: 5,
        memo: "blocked",
        idempotencyKey: `lock-send-${stamp}`,
      });
      expect(sent.ok).toBe(false);
      if (!sent.ok) expect(sent.reason).toMatch(/locked/);

      const incoming = await executeTransfer({
        fromHandle: other.user.handle,
        toHandle: locked.user.handle,
        amountUsd: 3,
        memo: "still ok",
        idempotencyKey: `lock-in-${stamp}`,
      });
      expect(incoming.ok).toBe(true);

      const asked = await createPaymentRequest(locked.user.id, {
        toHandle: other.user.handle,
        amountUsd: 2,
      });
      expect(asked.ok).toBe(true);

      const theirAsk = await createPaymentRequest(other.user.id, {
        toHandle: locked.user.handle,
        amountUsd: 4,
      });
      expect(theirAsk.ok).toBe(true);
      if (!theirAsk.ok) return;

      const pay = await payPaymentRequest(locked.user.id, theirAsk.request.id);
      expect(pay.ok).toBe(false);
      if (!pay.ok) expect(pay.reason).toMatch(/locked/);

      const after = await findUserById(locked.user.id);
      expect(centsToUsd(after!.balanceCents)).toBe(53);

      await setPersonLocked(locked.user.id, false);
      const unlocked = await executeTransfer({
        fromHandle: locked.user.handle,
        toHandle: other.user.handle,
        amountUsd: 1,
        memo: "open again",
        idempotencyKey: `lock-out-${stamp}`,
      });
      expect(unlocked.ok).toBe(true);

      const paid = await payPaymentRequest(locked.user.id, theirAsk.request.id);
      expect(paid.ok).toBe(true);
    },
    20000,
  );
});
