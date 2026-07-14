import { ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { AiSurface } from "./AiSurface";
import { MetricChip } from "./MetricChip";
import { OfferCard } from "./OfferCard";
import { RequestCard } from "./RequestCard";
import { TimelineIndicator } from "./TimelineIndicator";

/**
 * HeroProductMock — a storytelling object, NOT a dashboard screenshot.
 *
 * Composed entirely of Bidly primitives (RequestCard, OfferCard,
 * SupplierIdentity, MetricChip, AiSurface, TimelineIndicator) arranged
 * top-to-bottom to narrate the reverse-marketplace workflow in one
 * glance: one request → many offers → AI recommends → customer selects.
 *
 * A thin navy rail visually connects the four layers, reinforcing the
 * Request Spine motif at scale. On first paint each layer fades+rises
 * with a 120ms stagger (disabled under prefers-reduced-motion).
 */
export function HeroProductMock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border bg-surface p-4 sm:p-6 shadow-e3",
        className,
      )}
      dir="rtl"
    >
      {/* window chrome — subtle "product surface" cue */}
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-border-strong" />
          <span className="h-2 w-2 rounded-full bg-border-strong" />
          <span className="h-2 w-2 rounded-full bg-border-strong" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Bidly · תצוגה חיה
        </span>
      </div>

      <TimelineIndicator
        steps={[
          { label: "בקשה" },
          { label: "הצעות" },
          { label: "השוואה" },
          { label: "נבחר" },
        ]}
        currentIndex={3}
        className="mb-6"
      />


      <div className="space-y-3 relative">
        <div className="animate-[fadeRise_.6s_ease-out_both]" style={{ animationDelay: "0ms" }}>
          <RequestCard
            category="עיצוב גרפי"
            title="עיצוב לוגו לחברת סטארטאפ בתחום הפינטק"
            body="מחפשים לוגו מודרני ונקי, כולל 3 סבבי תיקונים וקבצי מקור."
            chips={
              <>
                <MetricChip value="עד 7" unit="ימים" />
                <MetricChip value="₪1,500–2,500" />
              </>
            }
          />
        </div>

        <div
          className="grid grid-cols-3 gap-2.5 animate-[fadeRise_.6s_ease-out_both]"
          style={{ animationDelay: "120ms" }}
        >
          <OfferCard

            compact
            supplier={{ name: "סטודיו נורד", city: "תל אביב", rating: 4.7 }}
            priceIls={1800}
            deliveryDays={3}
          />
          <OfferCard
            compact
            supplier={{ name: "פיקסל ורוד", city: "חיפה", rating: 4.5 }}
            priceIls={2400}
            deliveryDays={5}
          />
          <OfferCard
            compact
            recommended
            supplier={{ name: "אלה ברנד", city: "ירושלים", rating: 4.9 }}
            priceIls={1500}
            deliveryDays={7}
          />
        </div>

        <div className="animate-[fadeRise_.6s_ease-out_both]" style={{ animationDelay: "240ms" }}>
          <AiSurface
            title="הצעה #3 מציעה את יחס המחיר/דירוג הטוב ביותר"
            body="מבוסס על היסטוריית עסקאות דומות ודירוגי לקוחות בקטגוריה."
            confidence={92}
          />
        </div>

        <div className="animate-[fadeRise_.6s_ease-out_both]" style={{ animationDelay: "360ms" }}>
          <OfferCard
            selected
            supplier={{
              name: "אלה ברנד",
              city: "ירושלים",
              rating: 4.9,
              specialty: "מיתוג ולוגואים",
            }}
            priceIls={1500}
            deliveryDays={7}
          />
        </div>
      </div>

      {/* Trust footer inside the mock reinforces the metric-chip language */}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-4">
        <MetricChip
          icon={<ShieldCheck />}
          value="הצעות"
          unit="פרטיות"
          tone="neutral"
        />
        <MetricChip
          icon={<Sparkles />}
          value="AI"
          unit="ממליץ בלבד"
          tone="ai"
        />
      </div>

      <style>{`
        @keyframes fadeRise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[fadeRise_\\.6s_ease-out_both\\] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
