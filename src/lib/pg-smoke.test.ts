import { describe, expect, it } from "vitest";
import { ensureDb } from "@/db";
import { createUser, executeTransfer, listPeople } from "@/lib/pg-ledger";

describe("PGlite ledger", () => {
  it(
    "seeds demo users and settles a send",
    async () => {
      await ensureDb();
      const people = await listPeople();
      expect(people.map((p) => p.handle)).toEqual(
        expect.arrayContaining(["midas.pay", "sunik.pay"]),
      );
      const sunik = people.find((p) => p.handle === "sunik.pay")!;
      const before = sunik.balanceUsd;
      const result = await executeTransfer({
        fromHandle: "sunik.pay",
        toHandle: "midas.pay",
        amountUsd: 1,
        memo: "smoke",
        idempotencyKey: `smoke-${Date.now()}`,
      });
      expect(result.ok).toBe(true);
      const after = (await listPeople()).find((p) => p.handle === "sunik.pay")!;
      expect(after.balanceUsd).toBeCloseTo(before - 1, 2);
    },
    20000,
  );

  it(
    "creates a new user with a starting balance",
    async () => {
      await ensureDb();
      const handle = `nina-${Date.now()}.pay`;
      const created = await createUser({
        name: "Nina Cole",
        handle,
        password: "demo",
      });
      expect(created.ok).toBe(true);
      if (!created.ok) return;
      expect(created.user.balanceUsd).toBe(50);
      const again = await createUser({
        name: "Nina Cole",
        handle,
        password: "demo",
      });
      expect(again.ok).toBe(false);
    },
    20000,
  );
});
