import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Section — Bidly's canonical labeled surface header.
 * Eyebrow (tracked, muted) + title (H2) + optional inline-end action.
 * The hairline underline is a signature: it anchors every section to a
 * left/right rail, reinforcing the editorial "command center" grid.
 */
export function Section({
  eyebrow,
  title,
  action,
  children,
  className,
  headerClassName,
}: {
  eyebrow?: string;
  title?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  headerClassName?: string;
}) {
  return (
    <section className={cn("w-full", className)}>
      {(eyebrow || title || action) && (
        <header
          className={cn(
            "flex items-end justify-between gap-4 border-b border-border pb-4 mb-6",
            headerClassName,
          )}
        >
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                {eyebrow}
              </div>
            )}
            {title && <h2 className="text-2xl font-bold text-foreground leading-tight">{title}</h2>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
