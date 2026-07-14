import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricChip } from "./MetricChip";
import { SupplierIdentity } from "./SupplierIdentity";

export type OfferCardProps = {
  supplier: {
    name: string;
    city?: string;
    rating?: number;
    specialty?: string;
  };
  priceIls: number;
  deliveryDays: number;
  selected?: boolean;
  recommended?: boolean;
  compact?: boolean;
  className?: string;
};

const ilsFormatter = new Intl.NumberFormat("he-IL", {
  maximumFractionDigits: 0,
});

/**
 * OfferCard — the flagship Bidly primitive. Recognizable at a glance:
 *
 *  1. Request Spine on inline-start (navy default, emerald when selected)
 *  2. SupplierIdentity block at top
 *  3. Price rendered in Display size, Manrope tabular numerals, ₪ glyph
 *     in muted color BEFORE the digits — the numeric-as-identity motif
 *  4. Delivery MetricChip in a fixed row
 *  5. Ghost + primary CTA footer, or a "נבחר" chip when selected
 */
export function OfferCard({
  supplier,
  priceIls,
  deliveryDays,
  selected = false,
  recommended = false,
  compact = false,
  className,
}: OfferCardProps) {
  return (
    <article
      className={cn(
        "relative rounded-xl border bg-surface shadow-e1 transition-all",
        "hover:shadow-e2 hover:border-border-strong",
        selected
          ? "request-spine-emerald border-success/40 bg-success-soft/40"
          : "request-spine-navy border-border",
        compact ? "ps-4 pe-3 py-3" : "ps-5 pe-4 py-4",
        className,
      )}
    >
      {recommended && !selected && (
        <span className="absolute -top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground start-4">
          מומלץ
        </span>
      )}
      {selected && (
        <span className="absolute -top-2 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success-foreground start-4">
          <Check className="h-3 w-3" strokeWidth={3} />
          נבחר
        </span>
      )}

      <SupplierIdentity
        name={supplier.name}
        city={supplier.city}
        rating={supplier.rating}
        specialty={supplier.specialty}
        size={compact ? "sm" : "md"}
      />

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-baseline gap-1 min-w-0">
          <span className="text-xs text-muted-foreground font-numeric">₪</span>
          <span
            className={cn(
              "font-numeric tabular-nums font-bold text-foreground leading-none tracking-tight",
              compact ? "text-2xl" : "text-3xl",
            )}
          >
            {ilsFormatter.format(priceIls)}
          </span>
        </div>
        <MetricChip
          icon={<Clock />}
          value={deliveryDays}
          unit="ימים"
          tone={selected ? "success" : "neutral"}
        />
      </div>
    </article>
  );
}
