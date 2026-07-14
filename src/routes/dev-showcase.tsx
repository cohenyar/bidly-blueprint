import { createFileRoute, notFound } from "@tanstack/react-router";
import { Clock } from "lucide-react";

import { PageContainer } from "@/components/app/PageContainer";
import { Section } from "@/components/app/Section";
import { MetricChip } from "@/components/app/MetricChip";
import { StatPill } from "@/components/app/StatPill";
import { SupplierIdentity } from "@/components/app/SupplierIdentity";
import { AiSurface } from "@/components/app/AiSurface";
import { TimelineIndicator } from "@/components/app/TimelineIndicator";
import { OfferCard } from "@/components/app/OfferCard";
import { RequestCard } from "@/components/app/RequestCard";
import { HeroProductMock } from "@/components/app/HeroProductMock";

/**
 * Internal design showcase. Dev-only living design system reference.
 * Gated by `import.meta.env.DEV` — a 404 in production builds.
 */
export const Route = createFileRoute("/dev-showcase")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: Showcase,
});

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-surface">
      <div className={`h-16 ${className}`} />
      <div className="px-3 py-2 text-[11px] font-mono text-muted-foreground">
        {name}
      </div>
    </div>
  );
}

function Showcase() {
  return (
    <div className="min-h-screen bg-background">
      <PageContainer>
        <div className="py-10 space-y-16">
          <header>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Internal · Development only
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Bidly Design System
            </h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Living reference for the Procurement Command Center primitives.
              Not exposed in production builds.
            </p>
          </header>

          <Section eyebrow="Palette" title="Semantic tokens">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <Swatch name="primary" className="bg-primary" />
              <Swatch name="success" className="bg-success" />
              <Swatch name="ai" className="bg-ai" />
              <Swatch name="warning" className="bg-warning" />
              <Swatch name="surface" className="bg-surface border-b border-border" />
              <Swatch name="surface-muted" className="bg-surface-muted" />
            </div>
          </Section>

          <Section eyebrow="Elevation" title="Soft elevation scale">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`rounded-xl bg-surface p-6 text-sm shadow-e${i}`}
                >
                  shadow-e{i}
                </div>
              ))}
            </div>
          </Section>

          <Section eyebrow="Chips" title="MetricChip · StatPill">
            <div className="flex flex-wrap gap-2">
              <MetricChip value="120" unit="מ״ר" />
              <MetricChip icon={<Clock />} value="30" unit="ימים" />
              <MetricChip value="פעילה" tone="success" />
              <MetricChip value="AI" tone="ai" />
              <StatPill label="1,200+ בעלי מקצוע" />
            </div>
          </Section>

          <Section eyebrow="Supplier" title="SupplierIdentity">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-surface p-4">
                <SupplierIdentity
                  name="נורביה עיצוב פנים"
                  city="תל אביב"
                  rating={4.9}
                  specialty="שיפוצי משרדים"
                />
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <SupplierIdentity
                  name="אטלס קבלנות"
                  city="חיפה"
                  rating={4.6}
                  size="sm"
                />
              </div>
            </div>
          </Section>

          <Section eyebrow="AI" title="AiSurface">
            <AiSurface
              title="הצעה #3 מציעה את יחס המחיר/דירוג הטוב ביותר"
              body="על בסיס 47 עסקאות דומות."
              confidence={92}
            />
          </Section>

          <Section eyebrow="Timeline" title="TimelineIndicator">
            <div className="rounded-xl border border-border bg-surface p-6">
              <TimelineIndicator
                steps={[
                  { label: "בקשה" },
                  { label: "הצעות" },
                  { label: "השוואה" },
                  { label: "נבחר" },
                ]}
                currentIndex={2}
              />
            </div>
          </Section>

          <Section eyebrow="Cards" title="RequestCard · OfferCard">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RequestCard
                category="שיפוצים"
                title="שיפוץ משרד 120 מ״ר בתל אביב"
                body="חיפוי גבס, צביעה, החלפת רצפה."
                chips={<MetricChip value="120" unit="מ״ר" />}
              />
              <OfferCard
                supplier={{ name: "נורביה עיצוב פנים", city: "תל אביב", rating: 4.9 }}
                priceIls={48200}
                deliveryDays={28}
              />
              <OfferCard
                recommended
                supplier={{ name: "מרידיאן בנייה", city: "רמת גן", rating: 4.7 }}
                priceIls={51900}
                deliveryDays={35}
              />
              <OfferCard
                selected
                supplier={{ name: "נורביה עיצוב פנים", city: "תל אביב", rating: 4.9 }}
                priceIls={48200}
                deliveryDays={28}
              />
            </div>
          </Section>

          <Section eyebrow="Composition" title="HeroProductMock">
            <div className="max-w-2xl">
              <HeroProductMock />
            </div>
          </Section>
        </div>
      </PageContainer>
    </div>
  );
}
