export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export function clockNow() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

export function splitName(full: string) {
  const i = full.trim().indexOf(" ");
  if (i === -1) return { first: full, last: "" };
  return { first: full.slice(0, i), last: full.slice(i + 1) };
}

export function greeting(hour = new Date().getHours()) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function usedPct(spent: number, cap: number) {
  if (cap <= 0) return 0;
  return Math.round((spent / cap) * 100);
}

export function remaining(spent: number, cap: number) {
  return Math.max(0, round2(cap - spent));
}
