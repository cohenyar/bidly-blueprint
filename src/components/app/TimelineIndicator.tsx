import { cn } from "@/lib/utils";

export type TimelineStep = {
  label: string;
};

/**
 * TimelineIndicator — 4-node horizontal stepper unique to Bidly.
 *
 * Nodes are 8px navy dots on a 1px rail. Completed nodes fill emerald.
 * The current node is a navy ring (hollow) so the "you are here" state
 * reads instantly. Labels sit under each node in a fixed 4-column grid,
 * always aligned to the node above — never centered floating text.
 */
export function TimelineIndicator({
  steps,
  currentIndex,
  className,
}: {
  steps: TimelineStep[];
  /** 0-based index of the current step. */
  currentIndex: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div
        className="grid items-center relative"
        style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}
      >
        {/* rail */}
        <div
          className="absolute top-1.5 h-px bg-border-strong"
          style={{
            insetInlineStart: `${100 / steps.length / 2}%`,
            insetInlineEnd: `${100 / steps.length / 2}%`,
          }}
          aria-hidden
        />
        {/* emerald fill up to current */}
        {currentIndex > 0 && (
          <div
            className="absolute top-1.5 h-px bg-success"
            style={{
              insetInlineStart: `${100 / steps.length / 2}%`,
              width: `${(currentIndex / (steps.length - 1)) * (100 - 100 / steps.length)}%`,
            }}
            aria-hidden
          />
        )}
        {steps.map((step, i) => {
          const state =
            i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
          return (
            <div key={i} className="flex flex-col items-center relative z-10">
              <span
                className={cn(
                  "h-3 w-3 rounded-full border-2",
                  state === "done" &&
                    "bg-success border-success",
                  state === "current" &&
                    "bg-surface border-primary shadow-[0_0_0_4px_var(--color-ai-soft)]",
                  state === "todo" &&
                    "bg-surface border-border-strong",
                )}
                aria-current={state === "current" ? "step" : undefined}
              />
              <span
                className={cn(
                  "mt-2 text-[11px] leading-tight text-center px-1",
                  state === "current"
                    ? "text-foreground font-semibold"
                    : state === "done"
                      ? "text-foreground/70"
                      : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
