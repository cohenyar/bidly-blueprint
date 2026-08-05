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
  description,
  action,
  children,
  className,
  headerClassName,
}: {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  headerClassName?: string;
}) {
  return (
    <section className={cn("w-full", className)}>
      {(eyebrow || title || description || action) && (
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={action}
          className={headerClassName}
        />
      )}
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-5 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        {title ? (
          <h2 className="text-xl font-bold leading-tight text-foreground">{title}</h2>
        ) : null}
        {description ? (
          <div className="mt-1 text-[13px] leading-5 text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}
