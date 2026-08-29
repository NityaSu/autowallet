import { money } from "@/lib/money";
import { cx } from "@/lib/tw";

const PIPS = 10;

export function SpendBar({
  spent,
  cap,
  compact = false,
  showAmount = true,
}: {
  spent: number;
  cap: number;
  compact?: boolean;
  showAmount?: boolean;
}) {
  const filled =
    cap <= 0 ? PIPS : Math.min(PIPS, Math.round((spent / cap) * PIPS));

  return (
    <div className={compact ? "m-0 min-w-[120px]" : "mt-4"}>
      {!compact ? (
        <p className="mb-2 text-[13px] text-muted">Spending today</p>
      ) : null}
      <div
        className="flex items-center gap-3.5"
        role="meter"
        aria-valuemin={0}
        aria-valuenow={spent}
        aria-valuemax={cap}
        aria-label={`Spending today ${money(spent)} of ${money(cap)}`}
      >
        <div className="grid h-3 min-w-0 flex-1 grid-cols-10 overflow-hidden rounded-full bg-gray-200">
          {Array.from({ length: PIPS }, (_, i) => (
            <i
              key={i}
              className={cx("block", i < filled ? "bg-brand" : "bg-transparent")}
            />
          ))}
        </div>
        {showAmount ? (
          <span className="shrink-0 font-mono text-[15px] tabular-nums">
            {money(spent)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
