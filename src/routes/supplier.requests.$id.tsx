import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Ban, CheckCircle2, FileText, Inbox } from "lucide-react";

import { PageContainer } from "@/components/app/PageContainer";
import { Section } from "@/components/app/Section";
import { ErrorState, LoadingState, StateCard } from "@/components/app/StateCard";
import {
  SupplierOfferForm,
  SupplierOfferPrompt,
  SupplierOwnOffer,
} from "@/components/app/SupplierOfferPanel";
import { SupplierRequestAttachments } from "@/components/app/SupplierRequestAttachments";
import { useAuth } from "@/lib/auth-context";
import { canEditSubmittedOffer, canShowSupplierOfferAction, useOwnOffer } from "@/lib/offers";
import { formatDateTime } from "@/lib/i18n";
import { formatBudget } from "@/lib/requests";
import { useActiveMatchedRequest } from "@/lib/supplier-requests";

export const Route = createFileRoute("/supplier/requests/$id")({
  component: SupplierRequestDetailsPage,
  head: () => ({ meta: [{ title: "בקשה מותאמת · Bidly" }] }),
});

function SupplierRequestDetailsPage() {
  const { id } = Route.useParams();
  const { role, user } = useAuth();
  const requestQuery = useActiveMatchedRequest(id);
  const ownOfferQuery = useOwnOffer(id, user?.id);
  const [offerSubmitted, setOfferSubmitted] = useState(false);
  const [offerUpdated, setOfferUpdated] = useState(false);
  const [offerFormOpen, setOfferFormOpen] = useState(false);
  const [offerEditOpen, setOfferEditOpen] = useState(false);

  if (requestQuery.isPending) {
    return (
      <PageContainer>
        <div className="py-14">
          <LoadingState label="טוען את הבקשה המותאמת…" />
        </div>
      </PageContainer>
    );
  }
  if (requestQuery.isError) {
    return (
      <PageContainer>
        <div className="py-14">
          <ErrorState error={requestQuery.error} onRetry={() => void requestQuery.refetch()} />
        </div>
      </PageContainer>
    );
  }

  const request = requestQuery.data;
  if (!request) {
    if (ownOfferQuery.isPending) {
      return (
        <PageContainer>
          <div className="py-14">
            <LoadingState label="טוען את ההצעה שלכם…" />
          </div>
        </PageContainer>
      );
    }

    if (ownOfferQuery.isError) {
      return (
        <PageContainer>
          <div className="py-14">
            <StateCard
              icon={<FileText className="h-5 w-5" />}
              eyebrow="לא ניתן לבדוק את ההצעה"
              title="פרטי הבקשה אינם זמינים ולא הצלחנו לטעון את ההצעה שלכם."
              body={
                import.meta.env.DEV && ownOfferQuery.error instanceof Error ? (
                  <p dir="auto">{ownOfferQuery.error.message}</p>
                ) : undefined
              }
              action={
                <button
                  type="button"
                  onClick={() => void ownOfferQuery.refetch()}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
                >
                  ניסיון חוזר
                </button>
              }
            />
          </div>
        </PageContainer>
      );
    }

    if (ownOfferQuery.data) {
      return (
        <PageContainer>
          <div className="py-10 sm:py-14">
            <Link
              to="/supplier"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              חזרה למרחב נותן השירות
            </Link>
            <div className="mt-8 max-w-2xl">
              <StateCard
                icon={<Ban className="h-5 w-5" strokeWidth={2.25} />}
                eyebrow="פרטי הבקשה אינם זמינים"
                title="ההתאמה כבר אינה פעילה."
                body="מטעמי פרטיות, פרטי הבקשה והקבצים אינם מוצגים לאחר סיום ההתאמה. ההצעה שלכם נשארת זמינה לצפייה."
                className="mb-6"
              />
              <SupplierOwnOffer offer={ownOfferQuery.data} />
            </div>
          </div>
        </PageContainer>
      );
    }

    return (
      <PageContainer>
        <div className="py-14">
          <StateCard
            icon={<Ban className="h-5 w-5" strokeWidth={2.25} />}
            eyebrow="הבקשה אינה זמינה"
            title="לא נמצאה התאמה פעילה לבקשה הזו."
            body="ייתכן שהבקשה נסגרה, בוטלה או שההתאמה כבר אינה פעילה."
            action={
              <Link
                to="/supplier"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover"
              >
                חזרה לבקשות המותאמות
              </Link>
            }
          />
        </div>
      </PageContainer>
    );
  }

  const canStartOffer = canShowSupplierOfferAction({
    isSupplier: role === "supplier",
    hasActiveMatch: request.match_status === "active",
    canViewRequest: true,
    requestStatus: request.status,
    hasExistingOffer: Boolean(ownOfferQuery.data) || offerSubmitted,
  });
  const canEditOffer = ownOfferQuery.data
    ? canEditSubmittedOffer({
        isSupplier: role === "supplier",
        isOwnOffer: Boolean(user?.id),
        hasActiveMatch: request.match_status === "active",
        requestStatus: request.status,
        offerStatus: ownOfferQuery.data.status,
      })
    : false;

  return (
    <PageContainer>
      <div className="py-10 sm:py-14">
        <Link
          to="/supplier"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          לכל הבקשות המותאמות
        </Link>

        <div className="request-spine-navy mt-6 ps-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              בקשה מותאמת · {request.category?.name_he ?? "תחום לא זמין"}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              התאמה פעילה
            </span>
          </div>
          <h1 className="mt-3 text-[26px] font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[32px]">
            {request.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-muted-foreground">
            <MetaChip>{request.city}</MetaChip>
            {request.delivery_mode === "remote" ? (
              <MetaChip>שירות מרחוק</MetaChip>
            ) : request.service_area ? (
              <MetaChip>אזור שירות: {request.service_area.name_he}</MetaChip>
            ) : null}
            <MetaChip>{formatBudget(request)}</MetaChip>
            {request.subcategory ? <MetaChip>{request.subcategory.name_he}</MetaChip> : null}
            {request.service ? <MetaChip>{request.service.name_he}</MetaChip> : null}
            <MetaChip>
              פורסמה: {formatDateTime(request.published_at ?? request.created_at)}
            </MetaChip>
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          <div className="space-y-10">
            <Section eyebrow="פרטי הבקשה" title="מה הלקוח צריך">
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8">
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                  {request.description}
                </p>
                {request.missing_service_text ? (
                  <div className="mt-5 rounded-xl border border-border bg-surface-muted/50 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      השירות שהלקוח לא מצא בקטלוג
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[14px] text-foreground">
                      {request.missing_service_text}
                    </p>
                  </div>
                ) : null}
              </div>
            </Section>

            {request.questionnaire_answers.length ? (
              <Section eyebrow="פרטים מותאמים" title="תשובות לשאלון">
                <dl className="divide-y divide-border rounded-2xl border border-border bg-surface px-6 shadow-e1">
                  {request.questionnaire_answers.map((item) => (
                    <div key={item.question_id} className="py-4">
                      <dt className="text-[12px] font-semibold text-muted-foreground">
                        {item.prompt_he}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap text-[14px] text-foreground">
                        {formatQuestionnaireAnswer(item.answer)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Section>
            ) : null}

            <Section eyebrow="קבצים מצורפים" title="חומרים מהלקוח">
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-e1 sm:p-8">
                <SupplierRequestAttachments requestId={request.id} />
              </div>
            </Section>
          </div>

          <aside>
            <Section eyebrow="הצעה פרטית" title="ההצעה שלכם">
              {offerSubmitted ? (
                <div
                  role="status"
                  className="mb-4 flex items-start gap-2 rounded-xl border border-success/30 bg-success-soft p-4 text-[13px] text-success"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ההצעה נשלחה בהצלחה
                </div>
              ) : null}
              {offerUpdated ? (
                <div
                  role="status"
                  className="mb-4 flex items-start gap-2 rounded-xl border border-success/30 bg-success-soft p-4 text-[13px] text-success"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ההצעה עודכנה בהצלחה
                </div>
              ) : null}

              {ownOfferQuery.isPending ? (
                <LoadingState label="בודק אם כבר שלחתם הצעה…" />
              ) : ownOfferQuery.isError ? (
                <StateCard
                  icon={<FileText className="h-5 w-5" />}
                  eyebrow="לא ניתן לטעון את ההצעה"
                  title="לא הצלחנו לבדוק אם קיימת הצעה שלכם."
                  body={
                    import.meta.env.DEV && ownOfferQuery.error instanceof Error ? (
                      <p dir="auto">{ownOfferQuery.error.message}</p>
                    ) : (
                      "כדי למנוע שליחה כפולה, טענו מחדש לפני שתמשיכו."
                    )
                  }
                  action={
                    <button
                      type="button"
                      onClick={() => void ownOfferQuery.refetch()}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
                    >
                      ניסיון חוזר
                    </button>
                  }
                  className="p-6 sm:p-7"
                />
              ) : ownOfferQuery.data && offerEditOpen && canEditOffer ? (
                <SupplierOfferForm
                  requestId={request.id}
                  initialOffer={ownOfferQuery.data}
                  onSubmitted={() => {
                    setOfferUpdated(true);
                    setOfferEditOpen(false);
                  }}
                />
              ) : ownOfferQuery.data ? (
                <SupplierOwnOffer
                  offer={ownOfferQuery.data}
                  canWithdraw={canEditOffer}
                  canEdit={canEditOffer}
                  onEdit={() => {
                    setOfferUpdated(false);
                    setOfferEditOpen(true);
                  }}
                />
              ) : request.status !== "open" ? (
                <StateCard
                  icon={<Inbox className="h-5 w-5" />}
                  eyebrow="הבקשה אינה פתוחה"
                  title="לא ניתן לשלוח הצעה לבקשה הזו."
                  className="p-6 sm:p-7"
                />
              ) : offerSubmitted ? (
                <LoadingState label="טוען את ההצעה שנשלחה…" />
              ) : offerFormOpen && canStartOffer ? (
                <SupplierOfferForm
                  requestId={request.id}
                  onSubmitted={() => {
                    setOfferSubmitted(true);
                    setOfferFormOpen(false);
                  }}
                />
              ) : canStartOffer ? (
                <SupplierOfferPrompt onOpen={() => setOfferFormOpen(true)} />
              ) : null}
            </Section>
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 font-semibold">
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
