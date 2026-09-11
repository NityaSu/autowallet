import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { ensureDb, getDb } from "@/db";
import { createUser, executeTransfer, findTransferForUser, listPeople } from "@/lib/pg-ledger";

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

  it(
    "loads a transfer by id only for a party on that send",
    async () => {
      await ensureDb();
      const people = await listPeople();
      const sunik = people.find((p) => p.handle === "sunik.pay")!;
      const result = await executeTransfer({
        fromHandle: "sunik.pay",
        toHandle: "midas.pay",
        amountUsd: 1,
        memo: "receipt",
        idempotencyKey: `receipt-${Date.now()}`,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const mine = await findTransferForUser(result.transfer.id, sunik.id);
      expect(mine?.memo).toBe("receipt");
      expect(mine?.fromHandle).toBe("sunik.pay");
      const outsider = await createUser({
        name: "Outsider",
        handle: `out-${Date.now().toString(36)}.pay`,
        password: "demo",
      });
      expect(outsider.ok).toBe(true);
      if (!outsider.ok) return;
      const hidden = await findTransferForUser(result.transfer.id, outsider.user.id);
      expect(hidden).toBeNull();
      expect(await findTransferForUser(crypto.randomUUID(), sunik.id)).toBeNull();
    },
    20000,
  );

  it(
    "indexes incoming and outgoing transfers",
    async () => {
      await ensureDb();
      const result = await getDb().execute(sql`
        SELECT indexname
        FROM pg_indexes
        WHERE indexname IN ('transfers_to_created', 'transfers_from_created')
      `);
      const rows = Array.isArray(result) ? result : result.rows;
      const names = (rows as Array<{ indexname: string }>).map(
        (row) => row.indexname,
      );
      expect(names).toEqual(
        expect.arrayContaining(["transfers_to_created", "transfers_from_created"]),
      );
    },
    20000,
  );
});
