export function usdToCents(usd: number): number | null {
  if (!Number.isFinite(usd)) return null;
  const cents = Math.round(usd * 100);
  if (cents <= 0) return null;
  return cents;
}

export function centsToUsd(cents: number) {
  return cents / 100;
}
