import { describe, expect, it } from "vitest";
import type { Transfer } from "@/data/wallets";
import { overviewFromTransfers } from "@/lib/transfer-stats";

function tx(
  partial: Partial<Transfer> &
    Pick<Transfer, "id" | "fromHandle" | "toHandle" | "amountUsd" | "at">,
): Transfer {
  return { memo: "—", status: "settled", ...partial };
}

function localIso(year: number, month: number, day: number, hour = 12) {
  return new Date(year, month - 1, day, hour).toISOString();
}

describe("overviewFromTransfers", () => {
  const now = new Date(2026, 7, 29, 15);

  it("sums outgoing today and counts all P2P transfers", () => {
    const transfers: Transfer[] = [
      tx({
        id: "1",
        fromHandle: "sunik.pay",
        toHandle: "midas.pay",
        amountUsd: 20,
        at: localIso(2026, 8, 29, 10),
      }),
      tx({
        id: "2",
        fromHandle: "midas.pay",
        toHandle: "sunik.pay",
        amountUsd: 6,
        at: localIso(2026, 8, 29, 14),
      }),
      tx({
        id: "3",
        fromHandle: "sunik.pay",
        toHandle: "midas.pay",
        amountUsd: 5,
        at: localIso(2026, 8, 28, 18),
      }),
    ];
    const stats = overviewFromTransfers(transfers, "sunik.pay", now);
    expect(stats.spentToday).toBe(20);
    expect(stats.receivedToday).toBe(6);
    expect(stats.spentYesterday).toBe(5);
    expect(stats.spentDeltaPct).toBe(300);
    expect(stats.volumeToday).toBe(26);
    expect(stats.totalPayments).toBe(3);
    expect(stats.successRate).toBe(100);
    expect(stats.sentPct).toBe(77);
    expect(stats.receivedPct).toBe(23);
  });

  it("treats an empty ledger as 100% settled with no spend", () => {
    const stats = overviewFromTransfers([], "sunik.pay", now);
    expect(stats.spentToday).toBe(0);
    expect(stats.totalPayments).toBe(0);
    expect(stats.successRate).toBe(100);
    expect(stats.spentDeltaPct).toBeNull();
    expect(stats.sentPct).toBe(0);
  });
});
