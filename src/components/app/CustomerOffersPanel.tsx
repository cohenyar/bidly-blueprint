import { useMemo, useState } from "react";
import { Inbox } from "lucide-react";

import { ErrorState, LoadingState, StateCard } from "@/components/app/StateCard";
import { formatCurrency, formatDateTime } from "@/lib/i18n";
import type { CustomerOfferRow } from "@/lib/offers";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<CustomerOfferRow["status"], string> = {
  submitted: "ממתינה לבחירה",
  selected: "הצעה נבחרה",
  rejected: "לא נבחרה",
  withdrawn: "נמשכה",
};

export type CustomerOfferSort = "price" | "time" | "newest";

export function sortCustomerOffers(offers: CustomerOfferRow[], sort: CustomerOfferSort) {
  return [...offers].sort((left, right) => {
    if (sort === "price") {
      return (
        left.price - right.price ||
        left.estimated_days - right.estimated_days ||
        Date.parse(right.created_at) - Date.parse(left.created_at)
      );
    }
    if (sort === "time") {
      return (
        left.estimated_days - right.estimated_days ||
        left.price - right.price ||
        Date.parse(right.created_at) - Date.parse(left.created_at)
      );
    }
    return Date.parse(right.created_at) - Date.parse(left.created_at);
  });
}

export function getSubmittedOfferHighlights(offers: CustomerOfferRow[]) {
  const submitted = offers.filter((offer) => offer.status === "submitted");
  if (submitted.length < 2) {
    return { lowestPrice: new Set<string>(), shortestTime: new Set<string>() };
  }

  const lowestPrice = Math.min(...submitted.map((offer) => offer.price));
  const shortestTime = Math.min(...submitted.map((offer) => offer.estimated_days));
  return {
    lowestPrice: new Set(
      submitted.filter((offer) => offer.price === lowestPrice).map((offer) => offer.id),
    ),
    shortestTime: new Set(
      submitted.filter((offer) => offer.estimated_days === shortestTime).map((offer) => offer.id),
    ),
  };
}

type Props = {
  isPending: boolean;
  error: unknown | null;
  offers: CustomerOfferRow[];
  selectedOfferId: string | null;
  requestStatus: Database["public"]["Enums"]["request_status"];
  selectingOfferId: string | null;
  selectionPending?: boolean;
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
  selectionPending = false,
  onRetry,
  onSelect,
}: Props) {
  const [sort, setSort] = useState<CustomerOfferSort>("price");
  const sortedOffers = useMemo(() => sortCustomerOffers(offers, sort), [offers, sort]);
  const highlights = useMemo(() => getSubmittedOfferHighlights(offers), [offers]);

  if (isPending) return <LoadingState label="טוען הצעות..." />;
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} title="לא הצלחנו לטעון את ההצעות" />;
  }
  if (offers.length === 0) {
    return (
      <StateCard
        icon={<Inbox className="h-5 w-5" strokeWidth={2.25} />}
        eyebrow="הצעות ספקים"
        title="עדיין לא התקבלו הצעות לבקשה"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="customer-offer-sort" className="text-[12px] font-semibold text-foreground">
          מיון הצעות
        </label>
        <select
          id="customer-offer-sort"
          value={sort}
          onChange={(event) => setSort(event.target.value as CustomerOfferSort)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-[13px] font-semibold text-foreground shadow-e1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        >
          <option value="price">המחיר הנמוך ביותר</option>
          <option value="time">זמן הביצוע הקצר ביותר</option>
          <option value="newest">החדש ביותר</option>
        </select>
      </div>
      <div className="grid gap-4">
        {sortedOffers.map((offer) => (
          <CustomerOfferCard
            key={offer.id}
            offer={offer}
            selected={selectedOfferId === offer.id}
            canSelect={requestStatus === "open" && offer.status === "submitted" && !selectedOfferId}
            selecting={selectingOfferId === offer.id}
            selectionPending={selectionPending}
            lowestPrice={highlights.lowestPrice.has(offer.id)}
            shortestTime={highlights.shortestTime.has(offer.id)}
            onSelect={() => {
              const price = new Intl.NumberFormat("he-IL").format(offer.price);
              if (
                window.confirm(
                  `האם לבחור בהצעה של ${offer.business_name} במחיר ${price} ₪?\nזמן ביצוע משוער: ${offer.estimated_days} ימים.`,
                )
              ) {
                onSelect(offer);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function CustomerOfferCard({
  offer,
  selected,
  canSelect,
  selecting,
  selectionPending,
  lowestPrice,
  shortestTime,
  onSelect,
}: {
  offer: CustomerOfferRow;
  selected: boolean;
  canSelect: boolean;
  selecting: boolean;
  selectionPending: boolean;
  lowestPrice: boolean;
  shortestTime: boolean;
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
          {offer.base_city || offer.years_experience !== null ? (
            <p className="mt-1 text-[12px] text-muted-foreground">
              {[
                offer.base_city,
                offer.years_experience === null ? null : `${offer.years_experience} שנות ניסיון`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-semibold",
            selected ? "bg-success-soft text-success" : "bg-surface-muted text-muted-foreground",
          )}
        >
          {selected ? "הצעה נבחרה" : STATUS_LABEL[offer.status]}
        </span>
      </div>

      {lowestPrice || shortestTime ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {lowestPrice ? (
            <span className="rounded-full bg-success-soft px-3 py-1 text-[11px] font-semibold text-success">
              המחיר הנמוך ביותר
            </span>
          ) : null}
          {shortestTime ? (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
              הזמן הקצר ביותר
            </span>
          ) : null}
        </div>
      ) : null}

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
            disabled={selectionPending}
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
