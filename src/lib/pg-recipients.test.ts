import { describe, expect, it } from "vitest";
import { ensureDb } from "@/db";
import { completeHandle } from "@/lib/ledger-types";
import {
  createUser,
  executeTransfer,
  findUserByHandle,
  listRecipients,
  lookupPerson,
} from "@/lib/pg-ledger";

describe("recipients", () => {
  it("completes a bare name to .pay", () => {
    expect(completeHandle("Midas")).toBe("midas.pay");
    expect(completeHandle("midas.pay")).toBe("midas.pay");
  });

  it(
    "starts empty and fills from transfers only",
    async () => {
      await ensureDb();
      const created = await createUser({
        name: "Nina Cole",
        handle: `nina-${Date.now().toString(36)}.pay`,
        password: "demo",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;

      expect(await listRecipients(created.user.id)).toEqual([]);

      const sunik = await findUserByHandle("sunik.pay");
      expect(sunik).toBeTruthy();
      const sent = await executeTransfer({
        fromHandle: created.user.handle,
        toHandle: "sunik.pay",
        amountUsd: 1,
        memo: "hello",
        idempotencyKey: `recip-${Date.now()}`,
      });
      expect(sent.ok).toBe(true);

      const mine = await listRecipients(created.user.id);
      expect(mine.map((p) => p.handle)).toEqual(["sunik.pay"]);
      const theirs = await listRecipients(sunik!.id);
      expect(theirs.map((p) => p.handle)).toContain(created.user.handle);
    },
    20000,
  );

  it(
    "looks up an exact person handle and hides the rest",
    async () => {
      await ensureDb();
      const midas = await lookupPerson("midas");
      expect(midas.ok).toBe(true);
      if (!midas.ok) return;
      expect(midas.person).toEqual({
        id: midas.person.id,
        name: "Midas Wang",
        handle: "midas.pay",
      });

      const missing = await lookupPerson("no-such-user.pay");
      expect(missing.ok).toBe(false);
      if (!missing.ok) expect(missing.reason).toMatch(/Nobody at/);

      const agent = await lookupPerson("research-agent.pay");
      expect(agent.ok).toBe(false);

      const sunik = await findUserByHandle("sunik.pay");
      const self = await lookupPerson("sunik.pay", { excludeUserId: sunik!.id });
      expect(self.ok).toBe(false);
    },
    20000,
  );
});
