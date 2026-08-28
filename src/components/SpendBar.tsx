import { money } from "@/lib/money";

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
    <div className={`aw-spend${compact ? " is-compact" : ""}`}>
      {!compact ? <p className="aw-spend-label">Spending today</p> : null}
      <div
        className="aw-spend-bar"
        role="meter"
        aria-valuemin={0}
        aria-valuenow={spent}
        aria-valuemax={cap}
        aria-label={`Spending today ${money(spent)} of ${money(cap)}`}
      >
        <div className="aw-spend-pips">
          {Array.from({ length: PIPS }, (_, i) => (
            <i key={i} className={i < filled ? "on" : undefined} />
          ))}
        </div>
        {showAmount ? <span className="aw-spend-amt">{money(spent)}</span> : null}
      </div>
    </div>
  );
}
