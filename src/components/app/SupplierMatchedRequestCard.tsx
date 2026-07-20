import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";

import { formatDate } from "@/lib/i18n";
import { formatBudget } from "@/lib/requests";
import type { SupplierMatchedRequest } from "@/lib/supplier-requests";

export function SupplierMatchedRequestCard({ request }: { request: SupplierMatchedRequest }) {
  return (
    <article className="request-spine-navy rounded-xl border border-border bg-surface p-5 ps-6 shadow-e1 transition-all hover:border-border-strong hover:shadow-e2 sm:p-6 sm:ps-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          בקשה מותאמת · {request.category?.name_he ?? "תחום לא זמין"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
          התאמה פעילה
        </span>
      </div>

      <h3 className="mt-3 text-[18px] font-bold leading-snug text-foreground">{request.title}</h3>
      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
        {request.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-[12px] text-muted-foreground">
        <Meta icon={<MapPin className="h-3.5 w-3.5" />}>{request.city}</Meta>
        <Meta>{formatBudget(request)}</Meta>
        {request.subcategory ? <Meta>{request.subcategory.name_he}</Meta> : null}
        <Meta icon={<CalendarDays className="h-3.5 w-3.5" />}>
          {formatDate(request.published_at ?? request.created_at)}
        </Meta>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <Link
          to="/supplier/requests/$id"
          params={{ id: request.id }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
        >
          צפייה בפרטי הבקשה
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

function Meta({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted/50 px-2.5 py-1 font-semibold">
      {icon}
      {children}
    </span>
  );
}
