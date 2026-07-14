import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PageContainer } from "@/components/app/PageContainer";
import { BidlyLogo } from "@/components/app/BidlyLogo";
import { formatCurrency } from "@/lib/i18n";

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
        <ValueProposition />
        <HowItWorks />
        <Benefits />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <PageContainer>
        <div className="flex h-16 items-center justify-between">
          <BidlyLogo />
          <nav className="flex items-center gap-2">
            <Link to="/login" className={ctaClasses("secondary", "md")}>
              כניסה
            </Link>
            <Link to="/register" className={ctaClasses("primary", "md")}>
              פתיחת חשבון
            </Link>
          </nav>
        </div>
      </PageContainer>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,theme(colors.accent)_0%,transparent_60%)]"
      />
      <PageContainer>
        <div className="grid gap-12 py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              זירת השירותים ההפוכה של ישראל
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              פרסמו מה שאתם צריכים.{" "}
              <span className="text-primary">תנו לספקים להתחרות.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              ב־Bidly אתם מפרסמים בקשה אחת, מקבלים הצעות מותאמות אישית מבעלי
              עסקים רלוונטיים, ובוחרים את ההצעה שהכי מתאימה לכם — הכול במקום
              אחד, בעברית, ובמחירים בשקלים.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className={ctaClasses("primary", "lg")}>
                פתיחת חשבון
              </Link>
              <Link to="/login" className={ctaClasses("secondary", "lg")}>
                כניסה
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              חינם להצטרפות · ללא עמלת פרסום · אפשר לבטל בכל שלב
            </p>
          </div>

          <HeroPreview />
        </div>
      </PageContainer>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              בקשה
            </p>
            <h3 className="mt-1 text-lg font-semibold">
              שיפוץ משרד · 120 מ״ר
            </h3>
          </div>
          <span className="rounded-full bg-info/15 px-2.5 py-1 text-xs font-medium text-info">
            פתוחה
          </span>
        </div>
        <div className="mt-5 space-y-3">
          <OfferRow supplier="נורביה עיצוב פנים" price={48200} rating={4.9} highlighted />
          <OfferRow supplier="מרידיאן בנייה" price={51900} rating={4.7} />
          <OfferRow supplier="אטלס קבלנות" price={54300} rating={4.6} />
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <span>3 הצעות התקבלו</span>
          <span className="tabular-nums">
            המחיר הנמוך ביותר {formatCurrency(48200)}
          </span>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute -bottom-6 -left-6 -z-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
      />
    </div>
  );
}

function OfferRow({
  supplier,
  price,
  rating,
  highlighted = false,
}: {
  supplier: string;
  price: number;
  rating: number;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm ${
        highlighted ? "border-primary/40 bg-primary/5" : "border-border bg-background"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{supplier}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          ★ {rating.toFixed(1)}
        </p>
      </div>
      <span className="font-semibold text-foreground tabular-nums">
        {formatCurrency(price)}
      </span>
    </div>
  );
}

function ValueProposition() {
  const items = [
    {
      title: "ללקוחות",
      body: "מתארים פעם אחת מה צריך. בעלי מקצוע רלוונטיים מגיעים אליכם עם הצעות מפורטות ומדויקות שאפשר להשוות.",
    },
    {
      title: "לבעלי עסקים",
      body: "מפסיקים לרדוף אחרי לידים. מוצאים בקשות שמתאימות לכם, ומגישים הצעה ישירות — בלי שיחות קרות.",
    },
    {
      title: "שקיפות מובנית",
      body: "דירוגים, זמני מענה והיסטוריית הצעות גלויים לשני הצדדים, כדי שכולם יוכלו לבחור בביטחון.",
    },
  ];

  return (
    <section className="border-b border-border/60 py-20">
      <PageContainer>
        <SectionHeading
          eyebrow="למה Bidly"
          title="זירה שנבנתה סביב מה שאתם באמת צריכים"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <FeatureCard key={item.title} title={item.title}>
              {item.body}
            </FeatureCard>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "פרסמו בקשה",
      body: "שתפו מה אתם צריכים, מסגרת תקציב ולוח זמנים. בחרו קטגוריה כדי שהספקים הנכונים יראו אתכם.",
    },
    {
      step: "02",
      title: "קבלו הצעות מותאמות",
      body: "בעלי עסקים מובחרים שולחים הצעות מפורטות — מחיר, היקף עבודה ולוחות זמנים.",
    },
    {
      step: "03",
      title: "השוו ובחרו",
      body: "רואים את כל ההצעות זו לצד זו, בודקים דירוגים, ובוחרים את הספק המתאים ביותר.",
    },
  ];

  return (
    <section className="border-b border-border/60 bg-surface py-20">
      <PageContainer>
        <SectionHeading
          eyebrow="איך זה עובד"
          title="שלושה צעדים מבקשה לעסקה חתומה"
        />
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <li
              key={s.step}
              className="relative rounded-xl border border-border bg-background p-6"
            >
              <span className="text-xs font-semibold tracking-widest text-primary tabular-nums">
                {s.step}
              </span>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </PageContainer>
    </section>
  );
}

function Benefits() {
  const benefits = [
    "ללא עמלות פרסום ללקוחות",
    "פרופילי ספקים מאומתים",
    "השוואת הצעות מובנית",
    "דירוג הדדי לאחר כל עסקה",
    "התראות בזמן אמת בתוך המערכת",
    "בעלות מלאה על הנתונים שלכם",
  ];

  return (
    <section className="border-b border-border/60 py-20">
      <PageContainer>
        <SectionHeading
          eyebrow="יתרונות"
          title="נבנה עבור לקוחות פרטיים, עסקים ובעלי מקצוע עצמאיים"
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <li
              key={b}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <span className="text-sm text-foreground">{b}</span>
            </li>
          ))}
        </ul>
      </PageContainer>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="py-20">
      <PageContainer>
        <div className="rounded-3xl bg-primary px-8 py-14 text-primary-foreground shadow-lg shadow-primary/20 sm:px-14">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                מוכנים לתת לספקים להתחרות עליכם?
              </h2>
              <p className="mt-4 max-w-xl text-primary-foreground/80">
                פתחו חשבון Bidly תוך דקות, ופרסמו את הבקשה הראשונה שלכם עוד היום.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link to="/register" className={ctaClasses("onPrimary", "lg")}>
                פתיחת חשבון
              </Link>
              <Link to="/login" className={ctaClasses("onPrimaryOutline", "lg")}>
                כניסה
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border py-10">
      <PageContainer>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <BidlyLogo />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Bidly. כל הזכויות שמורות.
          </p>
        </div>
      </PageContainer>
    </footer>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function FeatureCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

type CtaVariant = "primary" | "secondary" | "onPrimary" | "onPrimaryOutline";
type CtaSize = "md" | "lg";

function ctaClasses(variant: CtaVariant, size: CtaSize): string {
  const sizeClasses = size === "lg" ? "h-11 px-5 text-sm" : "h-9 px-4 text-sm";
  const variantClasses: Record<CtaVariant, string> = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm shadow-primary/20",
    secondary:
      "bg-transparent text-foreground border border-border hover:bg-accent",
    onPrimary:
      "bg-primary-foreground text-primary hover:bg-primary-foreground/90",
    onPrimaryOutline:
      "bg-transparent text-primary-foreground border border-primary-foreground/40 hover:bg-primary-foreground/10",
  };
  return `inline-flex items-center justify-center rounded-md font-medium transition-colors ${sizeClasses} ${variantClasses[variant]}`;
}
