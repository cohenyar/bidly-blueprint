import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";

import { PageContainer } from "@/components/app/PageContainer";
import { Section } from "@/components/app/Section";
import { EmptyRequests, ErrorState, LoadingState } from "@/components/app/StateCard";
import { useAuth } from "@/lib/auth-context";
import {
  formatBudget,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  useMyRequests,
  type RequestWithCategory,
} from "@/lib/requests";
import { formatDate } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "מרכז הבקרה · Bidly" }] }),
});

function DashboardPage() {
  const { role } = useAuth();
  const isCustomer = role !== "supplier"; // customer is the current phase's only surface
  const q = useMyRequests();

  const requests = q.data ?? [];
  const recent = requests.slice(0, 3);
  const openCount = requests.filter((r) => r.status === "open").length;
  const awardedCount = requests.filter((r) => r.status === "awarded").length;

  return (
    <PageContainer>
      <div className="py-10 sm:py-14">
        <div className="request-spine-navy ps-5">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            <span className="h-px w-6 bg-primary" aria-hidden />
            מרכז הבקרה
          </span>
          <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[34px]">
            {isCustomer ? "הבקשות שלכם, במקום אחד." : "בקשות פתוחות עבורכם."}
          </h1>
          <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
            {isCustomer
              ? "פרסמו בקשה חדשה, עקבו אחר הצעות שהתקבלו, וסגרו את הספק המתאים ביותר."
              : "הצעות ספקים ייפתחו לאחר שמערכת ההתאמות תופעל."}
          </p>
        </div>

        {isCustomer ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="בקשות פתוחות" value={openCount} />
            <StatTile label="נבחר ספק" value={awardedCount} />
            <StatTile label="סה״כ בקשות" value={requests.length} />
          </div>
        ) : null}

        <div className="mt-10">
          <Section
            eyebrow={isCustomer ? "הבקשות שלי" : "בקשות פתוחות"}
            title={isCustomer ? "אחרונות" : "בקרוב"}
            action={
              isCustomer ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/app/requests"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-[13px] font-semibold text-foreground hover:border-border-strong hover:bg-accent"
                  >
                    כל הבקשות
                  </Link>
                  <Link
                    to="/app/requests/new"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover"
                  >
                    <Plus className="h-4 w-4" />
                    בקשה חדשה
                  </Link>
                </div>
              ) : null
            }
          >
            {q.isPending ? (
              <LoadingState />
            ) : q.isError ? (
              <ErrorState error={q.error} onRetry={() => q.refetch()} />
            ) : recent.length === 0 ? (
              <EmptyRequests />
            ) : (
              <ul className="grid gap-3">
                {recent.map((r) => (
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

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-e1">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-[26px] font-bold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

export function RequestRow({ r }: { r: RequestWithCategory }) {
  const tone = REQUEST_STATUS_TONE[r.status];
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "primary"
        ? "text-primary"
        : tone === "danger"
          ? "text-danger"
          : "text-muted-foreground";
  return (
    <li>
      <Link
        to="/app/requests/$id"
        params={{ id: r.id }}
        className={cn(
          "request-spine-navy group flex items-center justify-between gap-4 rounded-xl border border-border bg-surface ps-5 pe-4 py-4 shadow-e1 transition-colors hover:border-border-strong hover:bg-accent/40",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              בקשה · {r.category?.name_he ?? "—"}
            </span>
            <span className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", toneClass)}>
              · {REQUEST_STATUS_LABEL[r.status]}
            </span>
          </div>
          <h3 className="mt-1 truncate text-[15px] font-bold text-foreground">{r.title}</h3>
          <p className="mt-1 truncate text-[12px] text-muted-foreground">
            {r.city} · {formatBudget(r)} · {formatDate(r.created_at)} · {r.offers_count} הצעות
          </p>
        </div>
        <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />
      </Link>
    </li>
  );
}
