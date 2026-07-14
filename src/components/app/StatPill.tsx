import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * StatPill — trust-strip metric.
 * Stronger visual weight than MetricChip; used in hero and trust bands.
 */
export function StatPill({
  icon,
  label,
  className,
}: {
  icon?: ReactNode;
  label: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] font-medium text-foreground shadow-e1",
        className,
      )}
    >
      {icon && (
        <span className="inline-flex h-4 w-4 items-center justify-center text-primary [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
      )}
      <span className="tabular-nums">{label}</span>
    </span>
  );
}
