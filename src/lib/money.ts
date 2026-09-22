export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function money(n: number) {
  return `$${n.toFixed(2)}`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function parseWhen(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function formatTime12(d: Date) {
  const minute = String(d.getMinutes()).padStart(2, "0");
  const hour24 = d.getHours();
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour = hour24 % 12 || 12;
  return `${hour}:${minute} ${suffix}`;
}

function formatDateTime(d: Date, withYear: boolean) {
  const monthDay = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  const date = withYear ? `${monthDay}, ${d.getFullYear()}` : monthDay;
  return `${date}, ${formatTime12(d)}`;
}

export function clockNow() {
  return formatTime12(new Date());
}

/** Stripe / GitHub style: Sep 22, 2026, 2:41 PM */
export function formatTxDateTime(iso: string) {
  const d = parseWhen(iso);
  return d ? formatDateTime(d, true) : iso;
}

/** Lists and notifications: Just now, 5 min ago, Yesterday, Sep 22, 2:41 PM */
export function formatTxTime(iso: string, now = new Date()) {
  const d = parseWhen(iso);
  if (!d) return iso;

  const diffMs = now.getTime() - d.getTime();
  if (Math.abs(diffMs) < 45_000) return "Just now";
  if (diffMs < 0) return formatDateTime(d, d.getFullYear() !== now.getFullYear());

  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 60) return diffMin <= 1 ? "1 min ago" : `${diffMin} min ago`;

  const diffHr = Math.round(diffMs / 3_600_000);
  if (diffHr < 24 && startOfLocalDay(d) === startOfLocalDay(now)) {
    return diffHr <= 1 ? "1 hr ago" : `${diffHr} hr ago`;
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (startOfLocalDay(d) === startOfLocalDay(yesterday)) {
    return `Yesterday, ${formatTime12(d)}`;
  }

  return formatDateTime(d, d.getFullYear() !== now.getFullYear());
}

export function formatDayHeading(iso: string, now = new Date()) {
  const d = parseWhen(iso);
  if (!d) return iso;
  if (startOfLocalDay(d) === startOfLocalDay(now)) return "Today";
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (startOfLocalDay(d) === startOfLocalDay(yesterday)) return "Yesterday";
  const monthDay = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() !== now.getFullYear()
    ? `${monthDay}, ${d.getFullYear()}`
    : monthDay;
}

export function groupByLocalDay<T extends { at: string }>(
  items: T[],
  now = new Date(),
) {
  const groups: { heading: string; items: T[] }[] = [];
  for (const item of items) {
    const heading = formatDayHeading(item.at, now);
    const last = groups.at(-1);
    if (last?.heading === heading) last.items.push(item);
    else groups.push({ heading, items: [item] });
  }
  return groups;
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
