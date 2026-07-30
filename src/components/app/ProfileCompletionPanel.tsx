import { Link } from "@tanstack/react-router";
import { Check, Circle } from "lucide-react";

import type { CompletionStatus } from "@/lib/supplier-profile";
import { cn } from "@/lib/utils";

export function ProfileCompletionPanel({ status }: { status: CompletionStatus }) {
  const complete = status.percent === 100;
  const needsCompletion = !complete || !status.isSubmitted || status.isLegacy;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            השלמת פרופיל
          </p>
          <h3 className="mt-1 text-[18px] font-bold text-foreground">
            {complete
              ? "הפרופיל שלכם מוכן."
              : status.isLegacy
                ? "השלימו פרטים מנוהלים כדי לחדש התאמות חדשות."
                : "השלימו את הפרופיל כדי לקבל התאמות."}
          </h3>
        </div>
        <div className="text-[22px] font-bold text-foreground tabular-nums">{status.percent}%</div>
      </div>

      <div
        role="progressbar"
        aria-label="השלמת פרופיל"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={status.percent}
        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${status.percent}%` }}
        />
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {status.items.map((item) => {
          const completeItem = item.complete;
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border bg-surface-muted/40 px-3 py-2 text-[13px]",
                completeItem ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {completeItem ? (
                <Check className="h-4 w-4 text-success" strokeWidth={2.5} />
              ) : (
                <Circle className="h-4 w-4" strokeWidth={2} />
              )}
              <span>{item.label}</span>
            </li>
          );
        })}
      </ul>

      {needsCompletion ? (
        <div className="mt-5">
          <Link
            to="/supplier/profile"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover"
          >
            חזרה להשלמת הפרופיל
          </Link>
        </div>
      ) : null}
    </div>
  );
}
