import { describe, expect, it } from "vitest";
import { ensureDb } from "@/db";
import { executeTransfer, listPeople } from "@/lib/pg-ledger";

describe("PGlite ledger", () => {
  it(
    "seeds demo users and settles a send",
    async () => {
      await ensureDb();
      const people = await listPeople();
      expect(people.map((p) => p.handle).sort()).toEqual([
        "midas.pay",
        "sunik.pay",
      ]);
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
});
