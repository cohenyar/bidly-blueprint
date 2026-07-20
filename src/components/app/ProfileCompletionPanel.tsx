import { Link } from "@tanstack/react-router";
import { Check, Circle } from "lucide-react";

import type { CompletionStatus } from "@/lib/supplier-profile";
import { cn } from "@/lib/utils";

const ITEMS: Array<{ key: keyof CompletionStatus; label: string }> = [
  { key: "hasBusinessName", label: "שם עסק" },
  { key: "hasDescription", label: "תיאור העסק" },
  { key: "hasServiceArea", label: "אזור שירות" },
  { key: "hasCategories", label: "לפחות תחום פעילות אחד" },
  { key: "hasSubcategories", label: "לפחות תת-תחום אחד" },
];

export function ProfileCompletionPanel({ status }: { status: CompletionStatus }) {
  const complete = status.percent === 100;
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            השלמת פרופיל
          </p>
          <h3 className="mt-1 text-[18px] font-bold text-foreground">
            {complete ? "הפרופיל שלכם מוכן." : "השלימו את הפרופיל כדי לקבל התאמות."}
          </h3>
        </div>
        <div className="text-[22px] font-bold text-foreground tabular-nums">{status.percent}%</div>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${status.percent}%` }}
          aria-hidden
        />
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {ITEMS.map((item) => {
          const ok = Boolean(status[item.key]);
          return (
            <li
              key={item.key}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border bg-surface-muted/40 px-3 py-2 text-[13px]",
                ok ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {ok ? (
                <Check className="h-4 w-4 text-success" strokeWidth={2.5} />
              ) : (
                <Circle className="h-4 w-4" strokeWidth={2} />
              )}
              <span>{item.label}</span>
            </li>
          );
        })}
      </ul>

      {!complete ? (
        <div className="mt-5">
          <Link
            to="/supplier/profile"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover"
          >
            השלמת פרופיל
          </Link>
        </div>
      ) : null}
    </div>
  );
}
