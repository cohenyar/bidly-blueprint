import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "ai" | "warning";

const toneMap: Record<Tone, string> = {
  neutral: "bg-surface text-foreground border-border",
  success: "bg-success-soft text-success border-success/20",
  ai: "bg-ai-soft text-ai border-ai-border",
  warning: "bg-warning-soft text-warning border-warning/20",
};

/**
 * MetricChip — Bidly's signature small pill for numeric metadata.
 * Structure is always: [icon] · [tabular value] · [unit].
 * The tabular numerals + hairline border are recognizable at a glance.
 */
export function MetricChip({
  icon,
  value,
  unit,
  tone = "neutral",
  className,
}: {
  icon?: ReactNode;
  value: ReactNode;
  unit?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
        toneMap[tone],
        className,
      )}
    >
      {icon && <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
      <span className="font-numeric tabular-nums font-semibold">{value}</span>
      {unit && <span className="text-muted-foreground font-normal">{unit}</span>}
    </span>
  );
}
