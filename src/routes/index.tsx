import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Camera,
  Car,
  CheckCircle2,
  GraduationCap,
  Layers3,
  LockKeyhole,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { BidlyLogo } from "@/components/app/BidlyLogo";
import { HomepageProductPreview } from "@/components/app/HomepageProductPreview";
import { PageContainer } from "@/components/app/PageContainer";
import { PageHeader } from "@/components/app/PageHeader";
import { Section } from "@/components/app/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useActiveCategories } from "@/lib/taxonomy";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { property: "og:url", content: "/" },
      {
        name: "description",
        content: "מפרסמים בקשה אחת, מקבלים הצעות מנותני שירות מתאימים ומשווים מחיר וזמן במקום אחד.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
});

export function LandingPage() {
  const categoriesQuery = useActiveCategories();

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <SiteHeader />
      <main>
        <Hero />
        <HowItWorks />
        <ValueSections />
        <ServiceCategories
          categories={categoriesQuery.data ?? []}
          isLoading={categoriesQuery.isLoading}
          isError={categoriesQuery.isError}
        />
        <TrustSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <PageContainer>
        <div className="flex h-14 items-center justify-between gap-3">
          <Link
            to="/"
            aria-label="Bidly — דף הבית"
            className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BidlyLogo compactOnMobile />
          </Link>
          <nav aria-label="ניווט ציבורי" className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="quiet" size="sm">
              <Link to="/login">כניסה</Link>
            </Button>
            <Button asChild variant="quiet" size="sm" className="hidden sm:inline-flex">
              <Link to="/register">הרשמה</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">פרסום בקשה</Link>
            </Button>
          </nav>
        </div>
      </PageContainer>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div aria-hidden className="absolute inset-0 hero-dots opacity-55" />
      <PageContainer>
        <div className="relative grid gap-8 py-10 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-14">
          <div className="lg:col-span-6">
            <PageHeader
              eyebrow="שירותים בדרך פשוטה וברורה"
              title="מוצאים את נותן השירות המתאים — בלי לרדוף אחרי הצעות"
              subtitle="מפרסמים בקשה אחת, מקבלים הצעות מנותני שירות מתאימים ומשווים מחיר, זמן וניסיון במקום אחד."
              className="border-b-0 pb-0"
              action={
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link to="/register">
                      פרסום בקשה
                      <ArrowLeft aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                    <Link to="/register">אני נותן שירות</Link>
                  </Button>
                </div>
              }
            />
            <p className="mt-5 inline-flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
              <LockKeyhole className="h-4 w-4 text-primary" aria-hidden />
              הבקשות נחשפות רק לנותני שירות מתאימים.
            </p>
          </div>
          <div className="lg:col-span-6">
            <HomepageProductPreview />
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

const CUSTOMER_STEPS = [
  { title: "מפרסמים בקשה", body: "מתארים את השירות הדרוש ושומרים את הפרטים במקום אחד." },
  { title: "מקבלים הצעות מתאימות", body: "נותני שירות עם התאמה פעילה יכולים לעיין ולהגיש הצעה." },
  { title: "משווים ובוחרים", body: "משווים מחיר, זמן ופרטי הצעה ומחליטים בצורה מסודרת." },
];

const SUPPLIER_STEPS = [
  { title: "משלימים פרופיל", body: "מגדירים תחומים, שירותים ואופן מתן שירות." },
  { title: "מקבלים בקשות מותאמות", body: "רואים בקשות מורשות יחד עם ציון והסבר התאמה." },
  { title: "שולחים הצעה", body: "מגישים מחיר, זמן משוער ופירוט לפי הצורך." },
];

function HowItWorks() {
  return (
    <section className="border-b border-border bg-surface">
      <PageContainer>
        <div className="py-12 sm:py-16">
          <Section
            eyebrow="איך Bidly עובד"
            title="מסלול ברור לשני צדי הבקשה"
            description="אותו תהליך מסודר, עם חוויה נפרדת ללקוחות ולנותני שירות."
          >
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
              <StepTrack label="ללקוחות" steps={CUSTOMER_STEPS} />
              <StepTrack label="לנותני שירות" steps={SUPPLIER_STEPS} tone="supplier" />
            </div>
          </Section>
        </div>
      </PageContainer>
    </section>
  );
}

function StepTrack({
  label,
  steps,
  tone = "customer",
}: {
  label: string;
  steps: Array<{ title: string; body: string }>;
  tone?: "customer" | "supplier";
}) {
  return (
    <div>
      <Badge variant={tone === "supplier" ? "success" : "secondary"}>{label}</Badge>
      <ol className="mt-4 grid gap-4 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="border-t border-border pt-4">
            <span
              className={`font-numeric text-[12px] font-bold tabular-nums ${
                tone === "supplier" ? "text-success" : "text-primary"
              }`}
            >
              0{index + 1}
            </span>
            <h3 className="mt-2 text-[15px] font-bold text-foreground">{step.title}</h3>
            <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

const VALUE_COLUMNS = [
  {
    eyebrow: "ללקוחות",
    title: "פחות חיפוש, יותר השוואה",
    items: ["בקשה אחת במקום חיפוש ידני", "השוואת מחיר וזמן", "בחירת הצעה בצורה מסודרת"],
  },
  {
    eyebrow: "לנותני שירות",
    title: "בקשות עם הקשר ברור",
    items: ["בקשות שמתאימות לתחום השירות", "ציון התאמה והסבר", "שליחת הצעה מסודרת"],
  },
  {
    eyebrow: "לשני הצדדים",
    title: "תהליך שאפשר לעקוב אחריו",
    items: ["תהליך ברור", "סטטוסים מסודרים", "פרטיות לפי הרשאות המערכת"],
  },
];

function ValueSections() {
  return (
    <section className="border-b border-border bg-surface-muted">
      <PageContainer>
        <div className="py-12 sm:py-16">
          <div className="mb-7 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              למה Bidly
            </p>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-foreground">
              מידע רלוונטי בזמן הנכון
            </h2>
          </div>
          <div className="grid border-y border-border bg-surface md:grid-cols-3">
            {VALUE_COLUMNS.map((column, index) => (
              <div
                key={column.eyebrow}
                className={`p-5 sm:p-6 ${index > 0 ? "border-t border-border md:border-t-0 md:border-r" : ""}`}
              >
                <p className="text-[11px] font-bold text-primary">{column.eyebrow}</p>
                <h3 className="mt-2 text-[17px] font-bold text-foreground">{column.title}</h3>
                <ul className="mt-4 space-y-3">
                  {column.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-[13px] text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

type PublicCategory = {
  id: string;
  slug: string;
  name_he: string;
  icon: string | null;
  is_active: boolean;
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "construction-renovation": Building2,
  "electrical-plumbing": Zap,
  "cleaning-maintenance": Sparkles,
  "moving-logistics": Truck,
  "digital-marketing": MonitorSmartphone,
  "events-photography": Camera,
  automotive: Car,
  "lessons-professional-services": GraduationCap,
  building: Building2,
  transport: Truck,
  digital: MonitorSmartphone,
  camera: Camera,
  car: Car,
  education: GraduationCap,
};

export function ServiceCategories({
  categories,
  isLoading,
  isError,
}: {
  categories: PublicCategory[];
  isLoading: boolean;
  isError: boolean;
}) {
  if (isError) return null;
  const activeCategories = categories.filter((category) => category.is_active);
  if (!isLoading && activeCategories.length === 0) return null;

  return (
    <section className="border-b border-border bg-background" aria-labelledby="categories-title">
      <PageContainer>
        <div className="py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              תחומי שירות
            </p>
            <h2 id="categories-title" className="mt-2 text-2xl font-bold text-foreground">
              הקטלוג הפעיל ב־Bidly
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
              התחומים מוצגים ישירות מקטלוג השירותים המנוהל במערכת.
            </p>
          </div>

          {isLoading ? (
            <div
              role="status"
              aria-label="טוען תחומי שירות"
              className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-20 animate-pulse rounded-xl bg-surface-muted" />
              ))}
            </div>
          ) : (
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {activeCategories.map((category) => (
                <CategoryItem key={category.id} category={category} />
              ))}
            </ul>
          )}
        </div>
      </PageContainer>
    </section>
  );
}

function CategoryItem({ category }: { category: PublicCategory }) {
  const iconKey = category.icon?.trim().toLowerCase() ?? "";
  const Icon = CATEGORY_ICONS[iconKey] ?? CATEGORY_ICONS[category.slug] ?? Layers3;

  return (
    <li>
      <Card variant="standard" className="flex min-h-20 items-center gap-3 p-4 shadow-none">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <Icon className="h-4.5 w-4.5" aria-hidden />
        </span>
        <span className="break-words text-[13px] font-semibold leading-5 text-foreground">
          {category.name_he}
        </span>
      </Card>
    </li>
  );
}

const TRUST_ITEMS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: LockKeyhole,
    title: "בקשות פרטיות",
    body: "פרטי בקשה זמינים לנותני שירות רק לפי הרשאות והתאמה פעילה.",
  },
  {
    icon: BadgeCheck,
    title: "הצעות עם פרטים ברורים",
    body: "כל הצעה כוללת מחיר וזמן משוער, עם פירוט נוסף לפי הצורך.",
  },
  {
    icon: ShieldCheck,
    title: "הבחירה נשארת אצל הלקוח",
    body: "הלקוח משווה את ההצעות ובוחר את ההצעה המתאימה לבקשה.",
  },
  {
    icon: Layers3,
    title: "פרופיל ותיק עבודות",
    body: "מידע על נותן השירות ותיק העבודות מוצגים בהתאם לכללי המוצר.",
  },
];

function TrustSection() {
  return (
    <section className="border-b border-border bg-surface">
      <PageContainer>
        <div className="py-12 sm:py-16">
          <Section
            eyebrow="אמון ופרטיות"
            title="עקרונות מוצר, לא הבטחות ריקות"
            description="Bidly מציג לכל צד רק את המידע שנדרש לתהליך ובכפוף להרשאות המערכת."
          >
            <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {TRUST_ITEMS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3 border-t border-border pt-4">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-bold text-foreground">{title}</h3>
                    <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </PageContainer>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-b border-border bg-surface-muted">
      <PageContainer>
        <div className="flex flex-col gap-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-12">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              מתחילים מכאן
            </p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">בקשה אחת או פרופיל אחד.</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              בחרו את המסלול המתאים והמשיכו לתהליך ההרשמה הקיים.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/register">פרסום בקשה</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/register">הצטרפות כנותן שירות</Link>
            </Button>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="bg-background">
      <PageContainer>
        <div className="grid gap-8 py-10 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-start">
          <div className="max-w-sm">
            <BidlyLogo />
            <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
              זירת שירותים פרטית שמחברת בין בקשות לקוח לנותני שירות מתאימים.
            </p>
          </div>
          <FooterLinks
            title="כניסה"
            links={[
              { label: "כניסה לחשבון", to: "/login" },
              { label: "הרשמה", to: "/register" },
            ]}
          />
          <FooterLinks
            title="מסלולים"
            links={[
              { label: "פרסום בקשה", to: "/register" },
              { label: "אני נותן שירות", to: "/register" },
            ]}
          />
        </div>
        <div className="border-t border-border py-5 text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Bidly · כל הזכויות שמורות
        </div>
      </PageContainer>
    </footer>
  );
}

function FooterLinks({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; to: "/login" | "/register" }>;
}) {
  return (
    <nav aria-label={title}>
      <h2 className="text-[12px] font-bold text-foreground">{title}</h2>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              to={link.to}
              className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
