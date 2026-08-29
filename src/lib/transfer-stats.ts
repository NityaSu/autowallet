import type { Transfer } from "@/data/wallets";
import { round2 } from "@/lib/money";

export function isSameLocalDay(iso: string, day: Date) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

export function addLocalDays(day: Date, days: number) {
  const next = new Date(day.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function overviewFromTransfers(
  transfers: Transfer[],
  handle: string,
  now = new Date(),
) {
  const yesterday = addLocalDays(now, -1);
  const spentToday = round2(
    transfers
      .filter((t) => t.fromHandle === handle && isSameLocalDay(t.at, now))
      .reduce((sum, t) => sum + t.amountUsd, 0),
  );
  const receivedToday = round2(
    transfers
      .filter((t) => t.toHandle === handle && isSameLocalDay(t.at, now))
      .reduce((sum, t) => sum + t.amountUsd, 0),
  );
  const spentYesterday = round2(
    transfers
      .filter((t) => t.fromHandle === handle && isSameLocalDay(t.at, yesterday))
      .reduce((sum, t) => sum + t.amountUsd, 0),
  );
  const volumeToday = round2(spentToday + receivedToday);
  const totalPayments = transfers.length;
  const settled = transfers.filter(
    (t) => (t.status ?? "settled") === "settled",
  ).length;
  const successRate =
    totalPayments === 0
      ? 100
      : Math.round((settled / totalPayments) * 1000) / 10;

  let spentDeltaPct: number | null = null;
  if (spentYesterday > 0) {
    spentDeltaPct =
      Math.round(((spentToday - spentYesterday) / spentYesterday) * 1000) / 10;
  }

  const sentPct =
    volumeToday <= 0 ? 0 : Math.round((spentToday / volumeToday) * 100);
  const receivedPct = volumeToday <= 0 ? 0 : 100 - sentPct;

  return {
    spentToday,
    receivedToday,
    spentYesterday,
    spentDeltaPct,
    volumeToday,
    totalPayments,
    successRate,
    sentPct,
    receivedPct,
  };
}
