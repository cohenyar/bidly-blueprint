import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowRight, Ban, Inbox } from "lucide-react";

import { AttachmentUploader } from "@/components/app/AttachmentUploader";
import { PageContainer } from "@/components/app/PageContainer";
import { Section } from "@/components/app/Section";
import { ErrorState, LoadingState, StateCard } from "@/components/app/StateCard";
import { useCustomerRequestOffers, useSelectOffer, type CustomerOfferRow } from "@/lib/offers";
import { useRequestAnswerReview } from "@/lib/request-questionnaire";
import {
  formatBudget,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  useCancelRequest,
  useCloseRequest,
  useRequest,
} from "@/lib/requests";
import { formatCurrency, formatDateTime } from "@/lib/i18n";
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
              <MetaChip>אזור שירות: {r.service_area.name_he}</MetaChip>
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
              {offersQuery.isPending ? (
                <LoadingState label="טוען הצעות…" />
              ) : offersQuery.isError ? (
                <ErrorState error={offersQuery.error} onRetry={() => void offersQuery.refetch()} />
              ) : (offersQuery.data ?? []).length === 0 ? (
                <StateCard
                  icon={<Inbox className="h-5 w-5" strokeWidth={2.25} />}
                  eyebrow="עדיין אין הצעות"
                  title="הצעות מנותני שירות יופיעו כאן."
                />
              ) : (
                <div className="grid gap-4">
                  {(offersQuery.data ?? []).map((offer) => (
                    <CustomerOfferCard
                      key={offer.id}
                      offer={offer}
                      selected={r.selected_offer_id === offer.id}
                      canSelect={r.status === "open" && offer.status === "submitted"}
                      selecting={selectOffer.isPending && selectOffer.variables === offer.id}
                      onSelect={() => {
                        if (
                          window.confirm(`לבחור בהצעה של ${offer.business_name}? הבחירה סופית.`)
                        ) {
                          void selectOffer.mutateAsync(offer.id);
                        }
                      }}
                    />
                  ))}
                  {selectOffer.isError ? (
                    <p role="alert" className="text-[12px] text-danger">
                      בחירת ההצעה נכשלה. ייתכן שהבקשה או ההצעה כבר השתנו.
                    </p>
                  ) : null}
                </div>
              )}
            </Section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-e1">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                פעולות
              </h4>
              <div className="mt-4 space-y-2">
                {r.status === "open" ? (
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
                {cancel.isError ? (
                  <p role="alert" className="text-[12px] text-danger">
                    ביטול הבקשה נכשל. נסו שוב בעוד רגע.
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

const CUSTOMER_OFFER_STATUS_LABEL: Record<CustomerOfferRow["status"], string> = {
  submitted: "ממתינה לבחירה",
  selected: "נבחרה",
  rejected: "לא נבחרה",
  withdrawn: "נמשכה",
};

function CustomerOfferCard({
  offer,
  selected,
  canSelect,
  selecting,
  onSelect,
}: {
  offer: CustomerOfferRow;
  selected: boolean;
  canSelect: boolean;
  selecting: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border bg-surface p-5 shadow-e1 sm:p-6",
        selected ? "border-success/40" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-bold text-foreground">{offer.business_name}</h3>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {[
              offer.base_city,
              offer.years_experience === null ? null : `${offer.years_experience} שנות ניסיון`,
            ]
              .filter(Boolean)
              .join(" · ") || "פרטי ניסיון לא נמסרו"}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-semibold",
            selected ? "bg-success-soft text-success" : "bg-surface-muted text-muted-foreground",
          )}
        >
          {CUSTOMER_OFFER_STATUS_LABEL[offer.status]}
        </span>
      </div>

      {offer.business_description ? (
        <p className="mt-4 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
          {offer.business_description}
        </p>
      ) : null}

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-surface-muted/50 p-4">
          <dt className="text-[11px] font-semibold text-muted-foreground">מחיר</dt>
          <dd className="mt-1 text-[21px] font-bold text-foreground">
            {formatCurrency(offer.price)}
          </dd>
        </div>
        <div className="rounded-xl bg-surface-muted/50 p-4">
          <dt className="text-[11px] font-semibold text-muted-foreground">משך משוער</dt>
          <dd className="mt-1 text-[17px] font-bold text-foreground">
            {offer.estimated_days} ימים
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-xl border border-border p-4">
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
          {offer.message}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          נשלחה ב־{formatDateTime(offer.created_at)}
        </p>
        {canSelect ? (
          <button
            type="button"
            disabled={selecting}
            onClick={onSelect}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50"
          >
            {selecting ? "בוחר…" : "בחירת ההצעה"}
          </button>
        ) : null}
      </div>
    </article>
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
