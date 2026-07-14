import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, ShieldCheck, Zap, Users } from "lucide-react";
import { PageContainer } from "@/components/app/PageContainer";
import { Section } from "@/components/app/Section";
import { MetricChip } from "@/components/app/MetricChip";
import { StatPill } from "@/components/app/StatPill";
import { SupplierIdentity } from "@/components/app/SupplierIdentity";
import { AiSurface } from "@/components/app/AiSurface";
import { RequestSpine } from "@/components/app/RequestSpine";
import { TimelineIndicator } from "@/components/app/TimelineIndicator";
import { OfferCard } from "@/components/app/OfferCard";
import { RequestCard } from "@/components/app/RequestCard";
import { HeroProductMock } from "@/components/app/HeroProductMock";

export const Route = createFileRoute("/showcase")({
  component: Showcase,
});

function Showcase() {
  return (
    <div className="min-h-screen bg-background py-12">
      <PageContainer>
        <div className="space-y-14">
          <Section eyebrow="Phase B · Primitives" title="ספריית רכיבי Bidly">
            <p className="text-sm text-muted-foreground max-w-2xl">
              כל רכיב עוצב עם זהות ויזואלית ייחודית: Request Spine, סימון AI, מספרים
              טאבולריים ו־monogram של ספק — סימני היכר חוזרים.
            </p>
          </Section>

          <Section eyebrow="Metric chips" title="MetricChip · StatPill">
            <div className="flex flex-wrap gap-2 mb-4">
              <MetricChip value="3" unit="ימים" />
              <MetricChip value="4.9" unit="דירוג" tone="success" />
              <MetricChip value="₪1,500" tone="neutral" />
              <MetricChip value="12" unit="דק׳ תגובה" tone="warning" />
              <MetricChip value="AI" unit="ממליץ" tone="ai" />
            </div>
            <div className="flex flex-wrap gap-3">
              <StatPill icon={<ShieldCheck />} label="ללא עמלה" />
              <StatPill icon={<Users />} label="1,200+ בעלי מקצוע" />
              <StatPill icon={<Zap />} label="הצעה ראשונה תוך שעה" />
            </div>
          </Section>

          <Section eyebrow="Supplier" title="SupplierIdentity">
            <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
              <div className="rounded-xl border border-border bg-surface p-4">
                <SupplierIdentity
                  name="סטודיו נורד"
                  city="תל אביב"
                  rating={4.7}
                  specialty="מיתוג ולוגואים"
                />
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <SupplierIdentity
                  name="אלה ברנד"
                  city="ירושלים"
                  rating={4.9}
                  specialty="עיצוב אריזה"
                />
              </div>
            </div>
          </Section>

          <Section eyebrow="Timeline" title="TimelineIndicator">
            <div className="rounded-xl border border-border bg-surface p-6 max-w-2xl">
              <TimelineIndicator
                steps={[
                  { label: "בקשה נשלחה" },
                  { label: "הצעות מתקבלות" },
                  { label: "השוואה" },
                  { label: "נבחר ספק" },
                ]}
                currentIndex={2}
              />
            </div>
          </Section>

          <Section eyebrow="Request" title="RequestCard + Spine">
            <div className="max-w-xl">
              <RequestCard
                category="שיפוצים"
                title="שיפוץ משרד 120 מ״ר בתל אביב"
                body="חיפוי גבס, צביעה, החלפת רצפה, לוח זמנים של כחודש."
                chips={
                  <>
                    <MetricChip value="120" unit="מ״ר" />
                    <MetricChip value="₪45,000–55,000" />
                    <MetricChip value="30" unit="ימים" />
                  </>
                }
              />
            </div>
          </Section>

          <Section eyebrow="Offers" title="OfferCard (default · recommended · selected)">
            <div className="grid gap-4 md:grid-cols-3">
              <OfferCard
                supplier={{ name: "מרידיאן בנייה", city: "רמת גן", rating: 4.7 }}
                priceIls={51900}
                deliveryDays={35}
              />
              <OfferCard
                recommended
                supplier={{
                  name: "נורביה עיצוב פנים",
                  city: "תל אביב",
                  rating: 4.9,
                  specialty: "שיפוצי משרדים",
                }}
                priceIls={48200}
                deliveryDays={28}
              />
              <OfferCard
                selected
                supplier={{
                  name: "אטלס קבלנות",
                  city: "חיפה",
                  rating: 4.6,
                  specialty: "קבלנות ראשית",
                }}
                priceIls={54300}
                deliveryDays={30}
              />
            </div>
          </Section>

          <Section eyebrow="AI" title="AiSurface">
            <div className="max-w-xl">
              <AiSurface
                title="נורביה מציעה את יחס המחיר/דירוג הטוב ביותר"
                body="על בסיס 47 עסקאות דומות בקטגוריה בשנה האחרונה."
                confidence={87}
                actions={
                  <>
                    <button className="text-xs font-semibold text-ai hover:underline">קבל</button>
                    <button className="text-xs font-semibold text-muted-foreground hover:text-foreground">ערוך</button>
                    <button className="text-xs text-muted-foreground hover:text-foreground">התעלם</button>
                  </>
                }
              />
            </div>
          </Section>

          <Section eyebrow="Spine motif" title="RequestSpine · navy vs emerald">
            <div className="grid gap-3 max-w-xl">
              <RequestSpine tone="navy" className="rounded-xl border border-border bg-surface py-4 pe-4">
                <div className="text-sm font-semibold">בקשה פעילה · ממתינה להצעות</div>
                <div className="text-xs text-muted-foreground mt-1">navy spine · ברירת מחדל</div>
              </RequestSpine>
              <RequestSpine tone="emerald" className="rounded-xl border border-success/30 bg-success-soft/40 py-4 pe-4">
                <div className="text-sm font-semibold">ספק נבחר · העסקה נסגרה</div>
                <div className="text-xs text-muted-foreground mt-1">emerald spine · הצעה זוכה</div>
              </RequestSpine>
            </div>
          </Section>

          <Section eyebrow="Composed" title="HeroProductMock — סיפור השוק ההפוך">
            <div className="max-w-md">
              <HeroProductMock />
            </div>
          </Section>
        </div>
      </PageContainer>
    </div>
  );
}
