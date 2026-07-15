import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  Filter,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { PageContainer } from "@/components/app/PageContainer";
import { BidlyLogo } from "@/components/app/BidlyLogo";
import { Section } from "@/components/app/Section";
import { MetricChip } from "@/components/app/MetricChip";
import { StatPill } from "@/components/app/StatPill";
import { SupplierIdentity } from "@/components/app/SupplierIdentity";
import { AiSurface, AiMark } from "@/components/app/AiSurface";
import { TimelineIndicator } from "@/components/app/TimelineIndicator";
import { OfferCard } from "@/components/app/OfferCard";
import { RequestCard } from "@/components/app/RequestCard";
import { HeroProductMock } from "@/components/app/HeroProductMock";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [{ property: "og:url", content: "/" }],
    links: [{ rel: "canonical", href: "/" }],
  }),
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <StoryStep1 />
        <StoryStep2 />
        <StoryStep3 />
        <StoryStep4 />
        <TrustBand />
        <TwoSides />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ─────────────────────── Header ─────────────────────── */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <PageContainer>
        <div className="flex h-14 items-center justify-between">
          <BidlyLogo />
          <nav className="flex items-center gap-2">
            <Link to="/login" className={ctaClasses("ghost", "sm")}>
              כניסה
            </Link>
            <Link to="/register" className={ctaClasses("primary", "sm")}>
              פתיחת חשבון
            </Link>
          </nav>
        </div>
      </PageContainer>
    </header>
  );
}

/* ─────────────────────── Hero ─────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="absolute inset-0 hero-dots opacity-70" />
      <PageContainer>
        <div className="relative grid gap-10 py-14 lg:grid-cols-12 lg:gap-8 lg:py-20">
          {/* Narrative — 5 cols on lg (RTL: appears inline-start i.e. right) */}
          <div className="lg:col-span-5 lg:pt-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary shadow-e1">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              זירת השירותים ההפוכה של ישראל
            </div>
            <h1 className="mt-6 text-[34px] font-bold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[44px] lg:text-[52px] lg:leading-[1.02]">
              פרסמו בקשה אחת.
              <br />
              <span className="text-primary">קבלו הצעות מהמובילים.</span>
            </h1>
            <p className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              במקום לרדוף אחרי הצעות מחיר — בעלי מקצוע מובחרים שולחים לכם הצעות
              פרטיות, ואתם בוחרים את המתאים ביותר.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                to="/register"
                className={ctaClasses("primary", "lg") + " w-full sm:w-auto"}
              >
                אני מקבל שירות
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/register"
                className={ctaClasses("ghost", "lg") + " w-full sm:w-auto"}
              >
                אני בעל מקצוע
              </Link>
            </div>
            {/* Trust strip directly under CTAs */}
            <div className="mt-7 flex flex-wrap gap-2">
              <StatPill icon={<ShieldCheck />} label="ללא עמלה לצרכן" />
              <StatPill icon={<Users />} label="1,200+ בעלי מקצוע" />
              <StatPill icon={<Zap />} label="הצעה ראשונה תוך שעה" />
              <StatPill icon={<Lock />} label="הצעות פרטיות" />
            </div>
          </div>


          {/* Product mock — 7 cols on lg. Visually dominant. */}
          <div className="lg:col-span-7">
            <HeroProductMock />
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

/* ─────────────────────── Story Steps ─────────────────────── */

function StoryStep1() {
  return (
    <StorySection
      index={0}
      eyebrow="שלב 01 · בקשה"
      title="בקשה אחת. פירוט מלא. כל הספקים הרלוונטיים רואים אותה."
      body="במקום לפתוח 15 שיחות טלפון, מפרסמים בקשה אחת עם היקף, תקציב וזמנים. Bidly מנתבת אותה לבעלי מקצוע שמתמחים בדיוק בזה."
      visual={
        <div className="max-w-md">
          <RequestCard
            category="שיפוצים"
            title='שיפוץ משרד 120 מ״ר בתל אביב'
            body="חיפוי גבס, צביעה, החלפת רצפה, החלפת תאורה. סיום עד סוף הרבעון."
            chips={
              <>
                <MetricChip value="120" unit="מ״ר" />
                <MetricChip value="₪45,000–55,000" />
                <MetricChip icon={<Clock />} value="30" unit="ימים" />
              </>
            }
          />
          <div className="mt-3 flex items-center gap-2 ps-1 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            נשלחה אוטומטית ל־24 קבלנים מאומתים באזור
          </div>
        </div>
      }
      visualSide="end"
    />
  );
}

function StoryStep2() {
  return (
    <StorySection
      index={1}
      eyebrow="שלב 02 · הצעות"
      title="הצעות פרטיות זורמות פנימה. הספקים לא רואים זה את זה."
      body="כל ספק מגיש את ההצעה הטובה ביותר שלו — כי אין דרך לשחק. אתם רואים את כולן במקום אחד, בשקל אחד לצד השני."
      visual={
        <div className="relative">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <OfferCard
              compact
              supplier={{ name: "מרידיאן בנייה", city: "רמת גן", rating: 4.7 }}
              priceIls={51900}
              deliveryDays={35}
            />
            <OfferCard
              compact
              recommended
              supplier={{
                name: "נורביה עיצוב פנים",
                city: "תל אביב",
                rating: 4.9,
              }}
              priceIls={48200}
              deliveryDays={28}
            />
            <OfferCard
              compact
              supplier={{ name: "אטלס קבלנות", city: "חיפה", rating: 4.6 }}
              priceIls={54300}
              deliveryDays={30}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            כל הצעה חסויה — הספקים לא חשופים למחירי המתחרים
          </div>
        </div>
      }
      visualSide="start"
    />
  );
}

function StoryStep3() {
  return (
    <StorySection
      index={2}
      eyebrow="שלב 03 · השוואה"
      title="Bidly AI ממליץ. אתם מחליטים."
      body="ה־AI שלנו משווה מחיר, דירוג, זמני מענה והיסטוריית עסקאות דומות — וממליץ על ההצעה עם היחס הטוב ביותר. תמיד ייעוץ, אף פעם לא החלטה במקומכם."
      visual={
        <div className="max-w-md">
          <AiSurface
            title="נורביה עיצוב פנים — יחס המחיר/דירוג הטוב ביותר"
            body="על בסיס 47 עסקאות דומות בקטגוריה שיפוצי משרדים בשנה האחרונה."
            confidence={92}
            actions={
              <>
                <span className="text-xs font-semibold text-ai">קבל המלצה</span>
                <span className="text-xs text-muted-foreground">
                  ערוך · התעלם
                </span>
              </>
            }
          />
          <div className="mt-4 flex items-center gap-3 ps-1 text-xs text-muted-foreground">
            <AiMark />
            AI ממליץ בלבד — הבחירה תמיד שלכם
          </div>
        </div>
      }
      visualSide="end"
    />
  );
}

function StoryStep4() {
  return (
    <StorySection
      index={3}
      eyebrow="שלב 04 · בחירה"
      title="בוחרים ספק אחד. הספקים האחרים מקבלים תשובה מכובדת."
      body="ברגע הבחירה, הספק הנבחר מקבל התראה, שאר הספקים מקבלים סגירה נעימה, וההיסטוריה נשמרת לבקשות הבאות שלכם."
      visual={
        <div className="max-w-md">
          <OfferCard
            selected
            supplier={{
              name: "נורביה עיצוב פנים",
              city: "תל אביב",
              rating: 4.9,
              specialty: "שיפוצי משרדים ומסחר",
            }}
            priceIls={48200}
            deliveryDays={28}
          />
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-3.5 w-3.5 text-success" />
              הספק קיבל התראה
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-3.5 w-3.5 text-success" />
              היסטוריה נשמרה
            </div>
          </div>
        </div>
      }
      visualSide="start"
    />
  );
}

function StorySection({
  index,
  eyebrow,
  title,
  body,
  visual,
  visualSide,
}: {
  index: number;
  eyebrow: string;
  title: string;
  body: string;
  visual: ReactNode;
  /** which side (in RTL) the visual sits on: 'start' = right, 'end' = left */
  visualSide: "start" | "end";
}) {
  const isEnd = visualSide === "end";
  const bg = index % 2 === 1 ? "bg-surface-muted" : "bg-background";
  return (
    <section className={`border-b border-border ${bg}`}>
      <PageContainer>
        <div className="grid gap-10 py-16 lg:grid-cols-12 lg:items-center lg:gap-12 lg:py-24">
          <div
            className={`lg:col-span-5 ${
              isEnd ? "lg:order-1" : "lg:order-2"
            }`}
          >
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              <span className="tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="h-px w-8 bg-primary/40" />
              {eyebrow.replace(/^שלב \d\d · /, "")}
            </div>
            <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl lg:text-[32px]">
              {title}
            </h2>
            <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
          <div
            className={`lg:col-span-7 ${
              isEnd ? "lg:order-2" : "lg:order-1"
            }`}
          >
            <div className={isEnd ? "lg:ps-8" : "lg:pe-8"}>{visual}</div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

/* ─────────────────────── Trust band ─────────────────────── */

function TrustBand() {
  return (
    <section className="border-b border-border">
      <PageContainer>
        <div className="py-14">
          <div className="mb-8 flex items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                מספרים
              </div>
              <h2 className="mt-2 text-2xl font-bold text-foreground">
                בנוי לאמון. מיועד לתוצאות.
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <TrustTile value="1,200+" label="בעלי מקצוע מאומתים" />
            <TrustTile value="24 דק׳" label="זמן תגובה חציוני" />
            <TrustTile value="4.8" label="דירוג ממוצע לספק" />
            <TrustTile value="0%" label="עמלה מהצרכן" tone="success" />
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

function TrustTile({
  value,
  label,
  tone = "neutral",
}: {
  value: string;
  label: string;
  tone?: "neutral" | "success";
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-e1">
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-px ${
          tone === "success" ? "bg-success" : "bg-primary/40"
        }`}
      />
      <div
        className={`font-numeric tabular-nums text-[32px] font-bold leading-none tracking-[-0.02em] ${
          tone === "success" ? "text-success" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="mt-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}


/* ─────────────────────── Two sides ─────────────────────── */

function TwoSides() {
  return (
    <section className="border-b border-border bg-surface-muted">
      <PageContainer>
        <div className="py-16 lg:py-20">
          <div className="mb-10 max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              שני צדדים · שווקים בזה־זמנית
            </div>
            <h2 className="mt-3 text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              זירה אחת. שתי חוויות. מאוזנות בכוונה.
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SideCard
              label="ללקוחות"
              title="לרכז את כל ההצעות במקום אחד"
              points={[
                "בקשה אחת. עשרות בעלי מקצוע רלוונטיים.",
                "השוואה שקופה עם המלצת AI.",
                "בעלות מלאה על הבחירה — אף פעם לחץ מכירה.",
              ]}
              cta="פרסמו בקשה"
            />
            <SideCard
              label="לספקים"
              title="להפסיק לרדוף. להתחיל להגיש הצעות."
              points={[
                "מקבלים בקשות שמתאימות בדיוק למומחיות שלכם.",
                "רואים רק את הבקשה — לא את הצעות המתחרים.",
                "בונים מוניטין בכל עסקה סגורה.",
              ]}
              cta="הצטרפו כספק"
              variant="dark"
            />
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

function SideCard({
  label,
  title,
  points,
  cta,
  variant = "light",
}: {
  label: string;
  title: string;
  points: string[];
  cta: string;
  variant?: "light" | "dark";
}) {
  const dark = variant === "dark";
  return (
    <div
      className={`relative rounded-2xl border p-7 shadow-e2 ${
        dark
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-foreground"
      }`}
    >
      <div
        className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
          dark ? "text-primary-foreground/70" : "text-primary"
        }`}
      >
        {label}
      </div>
      <h3 className="mt-3 text-xl font-bold leading-snug">{title}</h3>
      <ul className="mt-5 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-3 text-sm">
            <BadgeCheck
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                dark ? "text-success" : "text-success"
              }`}
              strokeWidth={2.5}
            />
            <span
              className={dark ? "text-primary-foreground/90" : "text-foreground"}
            >
              {p}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link
          to="/register"
          className={ctaClasses(dark ? "onPrimary" : "primary", "md")}
        >
          {cta}
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────── Closing CTA ─────────────────────── */

function ClosingCta() {
  return (
    <section className="border-b border-border">
      <PageContainer>
        <div className="py-16 lg:py-24">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                מוכנים להתחיל
              </div>
              <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[40px]">
                תנו לספקים המובילים
                <br />
                <span className="text-primary">להתחרות עליכם.</span>
              </h2>
              <p className="mt-4 max-w-[46ch] text-[15px] text-muted-foreground">
                פתיחת חשבון תוך דקה. הבקשה הראשונה נשלחת חינם — כמו כל הבקשות
                אחריה.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link to="/register" className={ctaClasses("primary", "lg")}>
                  פתיחת חשבון
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <Link to="/login" className={ctaClasses("ghost", "lg")}>
                  כבר יש לי חשבון
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="pointer-events-none absolute inset-0 -z-10 hero-dots opacity-60" />
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-e3">
                  <TimelineIndicator
                    steps={[
                      { label: "בקשה" },
                      { label: "הצעות" },
                      { label: "השוואה" },
                      { label: "נבחר" },
                    ]}
                    currentIndex={3}
                    className="mb-4"
                  />
                  <OfferCard
                    selected
                    supplier={{
                      name: "נורביה עיצוב פנים",
                      city: "תל אביב",
                      rating: 4.9,
                      specialty: "שיפוצי משרדים",
                    }}
                    priceIls={48200}
                    deliveryDays={28}
                  />
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-ai" />
                      נבחר בעזרת AI
                    </span>
                    <span className="tabular-nums">3 הצעות · חסך 6,100 ₪</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

/* ─────────────────────── Footer ─────────────────────── */

function SiteFooter() {
  return (
    <footer className="py-10">
      <PageContainer>
        <div className="flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <BidlyLogo />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Bidly · כל הזכויות שמורות
          </p>
        </div>
      </PageContainer>
    </footer>
  );
}

/* ─────────────────────── CTA helper ─────────────────────── */

type CtaVariant = "primary" | "ghost" | "onPrimary";
type CtaSize = "sm" | "md" | "lg";

function ctaClasses(variant: CtaVariant, size: CtaSize): string {
  const sizeClasses =
    size === "lg"
      ? "h-11 px-5 text-sm"
      : size === "md"
        ? "h-10 px-4 text-sm"
        : "h-9 px-3.5 text-[13px]";
  const variantClasses: Record<CtaVariant, string> = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary-hover shadow-e1",
    ghost:
      "bg-transparent text-foreground border border-border hover:border-border-strong hover:bg-accent",
    onPrimary:
      "bg-primary-foreground text-primary hover:bg-primary-foreground/90",
  };
  return `inline-flex items-center gap-2 justify-center rounded-lg font-semibold transition-colors ${sizeClasses} ${variantClasses[variant]}`;
}
