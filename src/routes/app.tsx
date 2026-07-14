import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { BidlyLogo } from "@/components/app/BidlyLogo";
import { PageContainer } from "@/components/app/PageContainer";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/app")({
  component: AppLanding,
  ssr: false,
  head: () => ({
    meta: [{ title: "Bidly — האזור האישי" }],
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
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        טוען…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-background">
        <PageContainer>
          <div className="flex h-16 items-center justify-between">
            <BidlyLogo />
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => navigate({ to: "/" }));
              }}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              התנתקות
            </button>
          </div>
        </PageContainer>
      </header>
      <main>
        <PageContainer>
          <div className="py-16">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              ברוכים הבאים ל־Bidly
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              התחברתם בתור{" "}
              <span className="font-semibold text-foreground">
                {role ? ROLE_LABEL[role] : "משתמש"}
              </span>
              . האזור האישי המלא ייבנה בשלבים הבאים של הפרויקט.
            </p>
            <div className="mt-8 rounded-xl border border-border bg-surface p-6">
              <p className="text-sm text-muted-foreground">
                שלב 2 (הרשמה וכניסה) הושלם. בשלבים הבאים נוסיף את לוחות
                הבקרה, פרסום בקשות, הגשת הצעות וההשוואה.
              </p>
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  );
}
