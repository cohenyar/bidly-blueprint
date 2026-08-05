import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Ban } from "lucide-react";

import { AttachmentUploader } from "@/components/app/AttachmentUploader";
import { CustomerOffersPanel } from "@/components/app/CustomerOffersPanel";
import { PageContainer } from "@/components/app/PageContainer";
import { Section } from "@/components/app/Section";
import { ErrorState, LoadingState, StateCard } from "@/components/app/StateCard";
import { offerSelectionErrorMessage, useCustomerRequestOffers, useSelectOffer } from "@/lib/offers";
import { useRequestAnswerReview } from "@/lib/request-questionnaire";
import {
  canCancelPublishedRequest,
  cancelRequestErrorMessage,
  formatBudget,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  useCancelRequest,
  useCloseRequest,
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
  errorComponent: RequestDetailsError,
});

function RequestDetailsError({ error, reset }: { error: Error; reset: () => void }) {
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
}

function RequestDetailsPage() {
  const { id } = Route.useParams();
  const q = useRequest(id);
  const answersQuery = useRequestAnswerReview(id);
  const offersQuery = useCustomerRequestOffers(id);
  const selectOffer = useSelectOffer(id);
  const cancel = useCancelRequest();
  const close = useCloseRequest();

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
  const effectiveSelectedOfferId =
    r.selected_offer_id ?? (selectOffer.isSuccess ? (selectOffer.variables ?? null) : null);

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
              {r.service ? ` · ${r.service.name_he}` : ""}
            </span>
            <span
              className={cn("text-[11px] font-semibold uppercase tracking-[0.14em]", toneClass)}
            >
              · {REQUEST_STATUS_LABEL[r.status]}
            </span>
          </div>
          <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[32px]">
            {r.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-muted-foreground">
            <MetaChip>{r.city}</MetaChip>
            {r.delivery_mode === "remote" ? (
              <MetaChip>שירות מרחוק</MetaChip>
            ) : r.service_area ? (
              <MetaChip>
                אזור שירות: {(r.service_area as { name_he: string }).name_he}
              </MetaChip>

            ) : null}
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
                {r.missing_service_text ? (
                  <div className="mt-5 rounded-xl border border-border bg-surface-muted/50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      השירות שלא נמצא בקטלוג
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[14px] text-foreground">
                      {r.missing_service_text}
                    </p>
                  </div>
                ) : null}
              </div>
            </Section>

            {(answersQuery.data ?? []).length ? (
              <Section eyebrow="פרטים מותאמים" title="התשובות שלכם">
                <dl className="divide-y divide-border rounded-2xl border border-border bg-surface px-6 shadow-e1">
                  {(answersQuery.data ?? []).map((item) => (
                    <div key={item.question_id} className="py-4">
                      <dt className="text-[12px] font-semibold text-muted-foreground">
                        {item.question?.prompt_he ?? "שאלה"}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap text-[14px] text-foreground">
                        {formatQuestionnaireAnswer(item.answer)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Section>
            ) : null}

            <Section eyebrow="קבצים מצורפים" title="חומרים תומכים">
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8">
                <AttachmentUploader requestId={r.id} canEdit={false} />
              </div>
            </Section>

            <Section eyebrow="הצעות ספקים" title="ההצעות שהתקבלו">
              <CustomerOffersPanel
                isPending={offersQuery.isPending}
                error={offersQuery.isError ? offersQuery.error : null}
                offers={offersQuery.data ?? []}
                selectedOfferId={effectiveSelectedOfferId}
                requestStatus={r.status}
                selectingOfferId={selectOffer.isPending ? (selectOffer.variables ?? null) : null}
                selectionPending={selectOffer.isPending}
                onRetry={() => void offersQuery.refetch()}
                onSelect={(offer) => {
                  void selectOffer.mutateAsync(offer.id);
                }}
              />
              {selectOffer.isSuccess ? (
                <p role="status" className="mt-3 text-[12px] font-semibold text-success">
                  ההצעה נבחרה בהצלחה
                </p>
              ) : null}
              {selectOffer.isError ? (
                <p role="alert" className="mt-3 text-[12px] text-danger">
                  {offerSelectionErrorMessage(selectOffer.error)}
                </p>
              ) : null}
            </Section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-e1">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                פעולות
              </h4>
              <div className="mt-4 space-y-2">
                {canCancelPublishedRequest(r) ? (
                  <button
                    type="button"
                    disabled={cancel.isPending}
                    onClick={() => {
                      if (window.confirm("לבטל את הבקשה?")) void cancel.mutateAsync(r.id);
                    }}
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-[13px] font-semibold text-foreground hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cancel.isPending ? "מבטל…" : "ביטול הבקשה"}
                  </button>
                ) : r.status === "awarded" ? (
                  <button
                    type="button"
                    disabled={close.isPending}
                    onClick={() => {
                      if (window.confirm("לסגור את הבקשה לאחר בחירת נותן השירות?")) {
                        void close.mutateAsync(r.id);
                      }
                    }}
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {close.isPending ? "סוגר…" : "סגירת הבקשה"}
                  </button>
                ) : (
                  <p className="text-[12px] text-muted-foreground">הבקשה נמצאת במצב סופי.</p>
                )}
                {cancel.isSuccess ? (
                  <p role="status" className="text-[12px] font-semibold text-success">
                    הבקשה בוטלה בהצלחה
                  </p>
                ) : null}
                {cancel.isError ? (
                  <p role="alert" className="text-[12px] text-danger">
                    {cancelRequestErrorMessage(cancel.error)}
                  </p>
                ) : null}
                {close.isError ? (
                  <p role="alert" className="text-[12px] text-danger">
                    סגירת הבקשה נכשלה. נסו שוב בעוד רגע.
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

function formatQuestionnaireAnswer(answer: unknown) {
  if (Array.isArray(answer)) return answer.map(String).join(", ");
  if (typeof answer === "number") return new Intl.NumberFormat("he-IL").format(answer);
  if (typeof answer === "string") return answer;
  return "—";
}
