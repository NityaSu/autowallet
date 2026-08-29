import { describe, expect, it } from "vitest";
import { MemoryLedger } from "@/lib/memory-ledger";

function seed() {
  return new MemoryLedger([
    { id: "sunik", handle: "sunik.pay", name: "Sunik Codes", balanceCents: 8240 },
    { id: "midas", handle: "midas.pay", name: "Midas Wang", balanceCents: 2400 },
  ]);
}

describe("MemoryLedger", () => {
  it("moves cents from sender to recipient", async () => {
    const ledger = seed();
    const result = await ledger.transfer({
      fromHandle: "sunik.pay",
      toHandle: "midas.pay",
      amountUsd: 5,
      memo: "coffee",
      idempotencyKey: "k1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.replay).toBe(false);
    const snap = ledger.snapshot();
    expect(snap.accounts.find((a) => a.handle === "sunik.pay")?.balanceCents).toBe(
      7740,
    );
    expect(snap.accounts.find((a) => a.handle === "midas.pay")?.balanceCents).toBe(
      2900,
    );
  });

  it("replays the same idempotency key without moving money twice", async () => {
    const ledger = seed();
    const input = {
      fromHandle: "sunik.pay",
      toHandle: "midas.pay",
      amountUsd: 5,
      memo: "coffee",
      idempotencyKey: "same",
    };
    const first = await ledger.transfer(input);
    const second = await ledger.transfer(input);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.replay).toBe(true);
    expect(second.transfer.id).toBe(first.transfer.id);
    expect(
      ledger.snapshot().accounts.find((a) => a.handle === "sunik.pay")
        ?.balanceCents,
    ).toBe(7740);
  });

  it("rejects an overdraft", async () => {
    const ledger = seed();
    const result = await ledger.transfer({
      fromHandle: "sunik.pay",
      toHandle: "midas.pay",
      amountUsd: 1000,
      memo: "too much",
      idempotencyKey: "big",
    });
    expect(result.ok).toBe(false);
  });

  it("lets only one of two concurrent sends overdraw", async () => {
    const ledger = new MemoryLedger([
      { id: "sunik", handle: "sunik.pay", name: "Sunik", balanceCents: 1000 },
      { id: "midas", handle: "midas.pay", name: "Midas", balanceCents: 0 },
    ]);
    const [a, b] = await Promise.all([
      ledger.transfer({
        fromHandle: "sunik.pay",
        toHandle: "midas.pay",
        amountUsd: 8,
        memo: "a",
        idempotencyKey: "c1",
      }),
      ledger.transfer({
        fromHandle: "sunik.pay",
        toHandle: "midas.pay",
        amountUsd: 8,
        memo: "b",
        idempotencyKey: "c2",
      }),
    ]);
    const wins = [a, b].filter((r) => r.ok).length;
    const losses = [a, b].filter((r) => !r.ok).length;
    expect(wins).toBe(1);
    expect(losses).toBe(1);
    expect(
      ledger.snapshot().accounts.find((x) => x.handle === "sunik.pay")
        ?.balanceCents,
    ).toBe(200);
  });
});
