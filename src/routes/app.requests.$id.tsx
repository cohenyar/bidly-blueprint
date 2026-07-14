import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Ban, Inbox } from "lucide-react";

import { PageContainer } from "@/components/app/PageContainer";
import { Section } from "@/components/app/Section";
import { ErrorState, LoadingState, StateCard } from "@/components/app/StateCard";
import {
  formatBudget,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  useCancelRequest,
  useRequest,
} from "@/lib/requests";
import { formatDateTime } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/requests/$id")({
  component: RequestDetailsPage,
  head: () => ({ meta: [{ title: "בקשה · Bidly" }] }),
  notFoundComponent: () => (
    <PageContainer>
      <div className="py-14">
        <StateCard
          icon={<Ban className="h-5 w-5" strokeWidth={2.25} />}
          eyebrow="לא נמצא"
          title="הבקשה לא נמצאה"
          body="ייתכן שהיא נמחקה, או שאין לכם הרשאה לצפייה בה."
          action={
            <Link
              to="/app/requests"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover"
            >
              חזרה לרשימה
            </Link>
          }
        />
      </div>
    </PageContainer>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <PageContainer>
        <div className="py-14">
          <ErrorState
            error={error}
            onRetry={() => {
              router.invalidate();
              reset();
            }}
          />
        </div>
      </PageContainer>
    );
  },
});

function RequestDetailsPage() {
  const { id } = Route.useParams();
  const q = useRequest(id);
  const cancel = useCancelRequest();

  if (q.isPending) {
    return (
      <PageContainer>
        <div className="py-14">
          <LoadingState />
        </div>
      </PageContainer>
    );
  }
  if (q.isError) {
    return (
      <PageContainer>
        <div className="py-14">
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        </div>
      </PageContainer>
    );
  }
  const r = q.data;
  if (!r) {
    return (
      <PageContainer>
        <div className="py-14">
          <StateCard
            icon={<Ban className="h-5 w-5" strokeWidth={2.25} />}
            eyebrow="לא נמצא"
            title="הבקשה לא נמצאה"
          />
        </div>
      </PageContainer>
    );
  }

  const tone = REQUEST_STATUS_TONE[r.status];
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "primary"
        ? "text-primary"
        : tone === "danger"
          ? "text-danger"
          : "text-muted-foreground";
  const isTerminal = r.status === "closed" || r.status === "cancelled";

  return (
    <PageContainer>
      <div className="py-10 sm:py-14">
        <Link
          to="/app/requests"
          className="mb-6 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          לכל הבקשות
        </Link>

        <div className="request-spine-navy ps-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              בקשה · {r.category?.name_he ?? "—"}
              {r.subcategory ? ` · ${r.subcategory.name_he}` : ""}
            </span>
            <span
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.14em]",
                toneClass,
              )}
            >
              · {REQUEST_STATUS_LABEL[r.status]}
            </span>
          </div>
          <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[32px]">
            {r.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-muted-foreground">
            <MetaChip>{r.city}</MetaChip>
            <MetaChip>{formatBudget(r)}</MetaChip>
            <MetaChip>פורסמה: {formatDateTime(r.published_at ?? r.created_at)}</MetaChip>
            <MetaChip>{r.offers_count} הצעות</MetaChip>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-10">
            <Section eyebrow="תיאור" title="הפרטים שלכם">
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                  {r.description}
                </p>
              </div>
            </Section>

            <Section eyebrow="הצעות ספקים" title="ההצעות שהתקבלו">
              <StateCard
                icon={<Inbox className="h-5 w-5" strokeWidth={2.25} />}
                eyebrow="עדיין אין הצעות"
                title="ההצעות של הספקים יופיעו כאן."
                body="מערכת ההתאמות תפתח בקשה זו לספקים המתאימים בשלב הבא של הפרויקט."
              />
            </Section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-e1">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                פעולות
              </h4>
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  disabled={isTerminal || r.status === "awarded" || cancel.isPending}
                  onClick={() => {
                    if (window.confirm("לבטל את הבקשה?")) void cancel.mutateAsync(r.id);
                  }}
                  className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-[13px] font-semibold text-foreground hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cancel.isPending ? "מבטל…" : "ביטול הבקשה"}
                </button>
                {cancel.isError ? (
                  <p className="text-[12px] text-danger">
                    {(cancel.error as Error).message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 shadow-e1">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                מזהה בקשה
              </h4>
              <p dir="ltr" className="mt-2 break-all font-mono text-[12px] text-muted-foreground">
                {r.id}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] font-semibold text-muted-foreground">
      {children}
    </span>
  );
}
