import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * AiSurface — Bidly's single, deliberate AI language.
 *
 * Never a "sparkle". The mark is a solid 12px navy square with an inner
 * 2px emerald dot — quiet, precise, engineering-flavored. Confidence is
 * a slim bar in tabular numerals. Actions are always three, in this
 * order: קבל / ערוך / התעלם. Never uses primary color for CTAs.
 */
export function AiSurface({
  title,
  body,
  confidence,
  actions,
  className,
}: {
  title: ReactNode;
  body?: ReactNode;
  confidence?: number;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ai-surface p-4", className)}>
      <div className="flex items-start gap-3">
        <AiMark />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ai">
              Bidly AI
            </span>
            {typeof confidence === "number" && (
              <span className="text-[10px] text-muted-foreground font-numeric tabular-nums">
                ביטחון {confidence}%
              </span>
            )}
          </div>
          <div className="text-sm font-semibold text-foreground mt-1 leading-snug">
            {title}
          </div>
          {body && (
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {body}
            </div>
          )}
          {typeof confidence === "number" && (
            <div
              className="mt-3 h-1 w-full rounded-full bg-ai-border/50 overflow-hidden"
              role="progressbar"
              aria-valuenow={confidence}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-ai transition-all"
                style={{ width: `${Math.max(0, Math.min(100, confidence))}%` }}
              />
            </div>
          )}
          {actions && (
            <div className="flex items-center gap-2 mt-3">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** The 12px navy square + inner emerald dot — Bidly's AI signature. */
export function AiMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-3 w-3 shrink-0 mt-1 bg-primary rounded-[2px]",
        className,
      )}
    >
      <span className="absolute inset-0 m-auto h-1 w-1 bg-success rounded-[1px]" />
    </span>
  );
}
