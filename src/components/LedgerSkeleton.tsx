import * as tw from "@/lib/tw";
import { cx } from "@/lib/tw";

function Bar({ className }: { className?: string }) {
  return (
    <span
      className={cx("block animate-pulse rounded-md bg-line", className)}
    />
  );
}

export function LedgerSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading wallet</span>
      <Bar className="mb-2 h-8 w-48 sm:w-72" />
      <Bar className="mb-[22px] h-4 w-64 max-w-full" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Bar className="h-[42px] w-36 rounded-xl" />
        <Bar className="h-[42px] w-32 rounded-xl" />
      </div>
      <div className={tw.stats}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={tw.stat}>
            <div className="min-w-0 flex-1">
              <Bar className="h-3 w-20" />
              <Bar className="mt-3 h-6 w-24" />
              <Bar className="mt-2 h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
      <div className={cx(tw.card, "h-[214px] sm:h-[252px]")}>
        <Bar className="h-3 w-28" />
        <Bar className="mt-6 h-7 w-40" />
        <Bar className="mt-2 h-4 w-24" />
        <div className="mt-8 flex gap-4">
          <Bar className="h-8 flex-1" />
          <Bar className="h-8 flex-1" />
          <Bar className="h-8 flex-1" />
        </div>
      </div>
    </div>
  );
}
