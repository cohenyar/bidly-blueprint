import { BadgeCheck, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SupplierIdentity — the reusable "who is this supplier" block that appears
 * on offer cards, comparison columns, and supplier profiles.
 *
 * Signature: navy monogram on ai-soft tint (never a photo), name in
 * semibold, an emerald verified check ring, a rating rendered as
 * `★ 4.9` in Manrope tabular numerals, and a location dot with city.
 * Same molecule everywhere = recognizable pattern.
 */
export function SupplierIdentity({
  name,
  city,
  rating,
  verified = true,
  specialty,
  size = "md",
  className,
}: {
  name: string;
  city?: string;
  rating?: number;
  verified?: boolean;
  specialty?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const monoSize = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";

  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      <div className="relative shrink-0">
        <div
          className={cn(
            "inline-flex items-center justify-center rounded-lg bg-ai-soft text-primary font-bold border border-ai-border",
            monoSize,
          )}
          aria-hidden
        >
          {initials}
        </div>
        {verified && (
          <span
            className="absolute -bottom-1 -left-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-surface text-success"
            title="ספק מאומת"
          >
            <BadgeCheck className="h-4 w-4" strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate font-semibold text-sm text-foreground leading-tight">
            {name}
          </span>
          {typeof rating === "number" && (
            <span className="inline-flex items-center gap-0.5 text-xs text-foreground font-numeric tabular-nums shrink-0">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
          {city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {city}
            </span>
          )}
          {specialty && (
            <>
              {city && <span aria-hidden>·</span>}
              <span className="truncate">{specialty}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
