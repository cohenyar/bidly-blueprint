import { Inbox } from "lucide-react";

import { ErrorState, LoadingState, StateCard } from "@/components/app/StateCard";
import { formatCurrency, formatDateTime } from "@/lib/i18n";
import type { CustomerOfferRow } from "@/lib/offers";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<CustomerOfferRow["status"], string> = {
  submitted: "ממתינה לבחירה",
  selected: "נבחרה",
  rejected: "לא נבחרה",
  withdrawn: "נמשכה",
};

type Props = {
  isPending: boolean;
  error: unknown | null;
  offers: CustomerOfferRow[];
  selectedOfferId: string | null;
  requestStatus: Database["public"]["Enums"]["request_status"];
  selectingOfferId: string | null;
  onRetry: () => void;
  onSelect: (offer: CustomerOfferRow) => void;
};

export function CustomerOffersPanel({
  isPending,
  error,
  offers,
  selectedOfferId,
  requestStatus,
  selectingOfferId,
  onRetry,
  onSelect,
}: Props) {
  if (isPending) return <LoadingState label="טוען הצעות…" />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (offers.length === 0) {
    return (
      <StateCard
        icon={<Inbox className="h-5 w-5" strokeWidth={2.25} />}
        eyebrow="עדיין אין הצעות"
        title="הצעות מנותני שירות יופיעו כאן."
      />
    );
  }

  return (
    <div className="grid gap-4">
      {offers.map((offer) => (
        <CustomerOfferCard
          key={offer.id}
          offer={offer}
          selected={selectedOfferId === offer.id}
          canSelect={requestStatus === "open" && offer.status === "submitted"}
          selecting={selectingOfferId === offer.id}
          onSelect={() => onSelect(offer)}
        />
      ))}
    </div>
  );
}

export function CustomerOfferCard({
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
          {STATUS_LABEL[offer.status]}
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

      {offer.message.trim() ? (
        <div aria-label="פירוט ההצעה" className="mt-4 rounded-xl border border-border p-4">
          <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
            {offer.message}
          </p>
        </div>
      ) : null}
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
