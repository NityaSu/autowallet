import { cx } from "@/lib/tw";

export function SandboxBadge({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border border-line bg-[#fafbfc] px-1.5 py-px text-[10px] font-semibold tracking-wide text-muted uppercase",
        className,
      )}
    >
      Sandbox
    </span>
  );
}
