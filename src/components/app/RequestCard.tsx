import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricChip } from "./MetricChip";

/**
 * RequestCard — the customer's original request as it appears at the top
 * of every screen that threads offers below it. Navy Request Spine +
 * "בקשה" eyebrow anchor it as the source of truth.
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
        <MetricChip
          icon={<Inbox />}
          value="פעילה"
          tone="success"
        />
      </div>
      <h3 className="mt-2 text-base font-bold text-foreground leading-snug">
        {title}
      </h3>
      {body && (
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {body}
        </p>
      )}
      {chips && <div className="mt-3 flex flex-wrap gap-1.5">{chips}</div>}
    </article>
  );
}
