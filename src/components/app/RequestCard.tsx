import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * RequestCard — the customer's original request as it appears at the top
 * of every screen that threads offers below it. Navy Request Spine +
 * "בקשה" eyebrow anchor it as the source of truth.
 * Status is a quiet live-pulse dot, not an icon chip, so the eye lands
 * on the title first.
 */
export function RequestCard({
  category,
  title,
  body,
  chips,
  className,
}: {
  category: string;
  title: string;
  body?: string;
  chips?: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "request-spine-navy relative rounded-xl border border-border bg-surface ps-5 pe-4 py-4 shadow-e1",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          בקשה · {category}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-success">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          פעילה
        </span>
      </div>
      <h3 className="mt-2 text-base font-bold text-foreground leading-snug">
        {title}
      </h3>
      {body && (
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {body}
        </p>
      )}
      {chips && <div className="mt-3 flex flex-wrap gap-1.5">{chips}</div>}
    </article>
  );
}
