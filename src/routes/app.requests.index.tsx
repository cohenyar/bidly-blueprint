import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { PageContainer } from "@/components/app/PageContainer";
import { Section } from "@/components/app/Section";
import { EmptyRequests, ErrorState, LoadingState } from "@/components/app/StateCard";
import { REQUEST_STATUS_LABEL, useMyRequests, type RequestStatus } from "@/lib/requests";
import { cn } from "@/lib/utils";

import { RequestRow } from "./app.index";

export const Route = createFileRoute("/app/requests/")({
  component: RequestsListPage,
  head: () => ({ meta: [{ title: "הבקשות שלי · Bidly" }] }),
});

const FILTERS: Array<{ key: "all" | RequestStatus; label: string }> = [
  { key: "all", label: "הכל" },
  { key: "open", label: "פעילות" },
  { key: "awarded", label: "נבחר ספק" },
  { key: "closed", label: "סגורות" },
  { key: "cancelled", label: "בוטלו" },
];

function RequestsListPage() {
  const q = useMyRequests();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const filtered = useMemo(() => {
    const rows = q.data ?? [];
    return filter === "all" ? rows : rows.filter((r) => r.status === filter);
  }, [q.data, filter]);

  return (
    <PageContainer>
      <div className="py-10 sm:py-14">
        <div className="request-spine-navy ps-5">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="h-px w-6 bg-primary" aria-hidden />
            הבקשות שלי
          </span>
          <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[34px]">
            כל הבקשות שפרסמתם
          </h1>
          <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            סננו לפי סטטוס, פתחו בקשה כדי לראות את ההצעות שהתקבלו.
          </p>
        </div>

        <div className="mt-8">
          <Section
            eyebrow="רשימה"
            title={`${filtered.length} בקשות`}
            action={
              <Link
                to="/app/requests/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" />
                בקשה חדשה
              </Link>
            }
          >
            <div className="mb-5 flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const active = f.key === filter;
                const count =
                  f.key === "all"
                    ? q.data?.length ?? 0
                    : (q.data ?? []).filter((r) => r.status === f.key).length;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    {f.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[10px] tabular-nums",
                        active ? "bg-primary-foreground/20" : "bg-surface-muted",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {q.isPending ? (
              <LoadingState />
            ) : q.isError ? (
              <ErrorState error={q.error} onRetry={() => q.refetch()} />
            ) : filtered.length === 0 ? (
              filter === "all" ? (
                <EmptyRequests />
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-[13px] text-muted-foreground">
                  אין בקשות בסטטוס {REQUEST_STATUS_LABEL[filter as RequestStatus]}.
                </div>
              )
            ) : (
              <ul className="grid gap-3">
                {filtered.map((r) => (
                  <RequestRow key={r.id} r={r} />
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </PageContainer>
  );
}
