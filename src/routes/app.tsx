import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, Inbox, LogOut, Plus } from "lucide-react";

import { BidlyLogo } from "@/components/app/BidlyLogo";
import { PageContainer } from "@/components/app/PageContainer";
import { Section } from "@/components/app/Section";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: AppLanding,
  ssr: false,
  head: () => ({
    meta: [{ title: "מרכז הבקרה · Bidly" }],
  }),
});

const ROLE_LABEL: Record<string, string> = {
  customer: "לקוח",
  supplier: "בעל עסק",
  admin: "מנהל מערכת",
};

function AppLanding() {
  const navigate = useNavigate();
  const { user, role, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <WorkspaceSkeleton />;
  }

  const roleLabel = role ? ROLE_LABEL[role] : "משתמש";
  const isSupplier = role === "supplier";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WorkspaceHeader
        roleLabel={roleLabel}
        onSignOut={() => {
          void signOut().then(() => navigate({ to: "/" }));
        }}
      />
      <main>
        <PageContainer>
          <div className="py-10 sm:py-14">
            {/* Page title block — mirrors landing eyebrow → H1 rhythm */}
            <div className="request-spine-navy ps-5">
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                <span className="h-px w-6 bg-primary" aria-hidden />
                מרכז הבקרה
              </span>
              <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[34px]">
                שלום, {roleLabel}.
              </h1>
              <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
                {isSupplier
                  ? "כאן יופיעו בקשות פתוחות שרלוונטיות אליכם, וההצעות שהגשתם."
                  : "כאן תוכלו לפרסם בקשות חדשות ולעקוב אחרי ההצעות שמתקבלות."}
              </p>
            </div>

            {/* Primary section — the empty workspace */}
            <div className="mt-10">
              <Section
                eyebrow={isSupplier ? "בקשות פתוחות" : "הבקשות שלי"}
                title={isSupplier ? "בקשות שממתינות להצעה" : "הבקשות שפרסמתם"}
                action={
                  isSupplier ? null : (
                    <Link
                      to="/app"
                      className={cn(
                        "inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-e1 transition-colors hover:bg-primary-hover",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      )}
                      aria-disabled
                    >
                      <Plus className="h-4 w-4" />
                      בקשה חדשה
                    </Link>
                  )
                }
              >
                <EmptyState isSupplier={isSupplier} />
              </Section>
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  );
}

/* ─────────────────────── Header ─────────────────────── */

function WorkspaceHeader({
  roleLabel,
  onSignOut,
}: {
  roleLabel: string;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <PageContainer>
        <div className="grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md"
            >
              <BidlyLogo />
            </Link>
            <span
              aria-hidden
              className="hidden h-4 w-px bg-border sm:inline-block"
            />
            <span className="hidden truncate text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:inline-block">
              מרחב עבודה
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:inline-flex">
              {roleLabel}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-[13px] font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>התנתקות</span>
            </button>
          </div>
        </div>
      </PageContainer>
    </header>
  );
}

/* ─────────────────────── Empty state ─────────────────────── */

function EmptyState({ isSupplier }: { isSupplier: boolean }) {
  return (
    <div className="request-spine-navy rounded-2xl border border-border bg-surface p-8 shadow-e1 sm:p-12">
      <div className="mx-auto max-w-[52ch] text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-muted text-primary">
          <Inbox className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {isSupplier ? "אין בקשות פתוחות כרגע" : "עדיין לא פרסמתם בקשה"}
        </p>
        <h3 className="mt-2 text-[20px] font-bold leading-snug text-foreground">
          {isSupplier
            ? "כשלקוח יפרסם בקשה בתחום שלכם — היא תופיע כאן."
            : "פרסמו בקשה כדי לקבל הצעות פרטיות מבעלי מקצוע מובילים."}
        </h3>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          {isSupplier
            ? "בזמן ההמתנה תוכלו לעדכן את פרופיל העסק ואת התחומים שאתם מכסים, כדי שנוכל להתאים אתכם לבקשות רלוונטיות ברגע שהן נכנסות."
            : "ניסוח בקשה לוקח פחות מדקה. תוך שעות ספורות תראו כאן את ההצעות הראשונות זו לצד זו, עם המלצה חכמה של המערכת."}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-e1 transition-colors hover:bg-primary-hover sm:w-auto",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            {isSupplier ? "עריכת פרופיל העסק" : "פרסום בקשה ראשונה"}
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Link
            to="/"
            className={cn(
              "inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-transparent px-4 text-[14px] font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-accent sm:w-auto",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            {isSupplier ? "איך עובדת המערכת" : "צפייה בסיור מהיר"}
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Skeleton ─────────────────────── */

function WorkspaceSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <PageContainer>
          <div className="flex h-14 items-center justify-between">
            <div className="h-6 w-24 rounded-md bg-surface-muted animate-pulse" />
            <div className="h-9 w-24 rounded-lg bg-surface-muted animate-pulse" />
          </div>
        </PageContainer>
      </div>
      <PageContainer>
        <div className="py-10 sm:py-14">
          <div className="request-spine-navy ps-5">
            <div className="h-3 w-28 rounded bg-surface-muted animate-pulse" />
            <div className="mt-4 h-8 w-64 rounded-md bg-surface-muted animate-pulse" />
            <div className="mt-3 h-4 w-80 max-w-full rounded bg-surface-muted animate-pulse" />
          </div>
          <div className="mt-10 border-b border-border pb-4">
            <div className="h-3 w-24 rounded bg-surface-muted animate-pulse" />
            <div className="mt-2 h-6 w-56 rounded bg-surface-muted animate-pulse" />
          </div>
          <div className="mt-6 h-64 rounded-2xl border border-border bg-surface-muted/60 animate-pulse" />
        </div>
      </PageContainer>
    </div>
  );
}
