import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { AuthShell } from "@/components/app/AuthCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getAuthenticatedDestination, getOAuthCallbackError } from "@/lib/auth-routing";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
  ssr: false,
  head: () => ({
    meta: [{ title: "משלימים התחברות · Bidly" }],
  }),
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const redirectStarted = useRef(false);
  const callbackError = useMemo(
    () => getOAuthCallbackError(window.location.search, window.location.hash),
    [],
  );

  useEffect(() => {
    if (!import.meta.env.DEV || !callbackError) return;
    console.error("[Auth] Google OAuth callback failed", {
      provider: "google",
      message: callbackError,
    });
  }, [callbackError]);

  useEffect(() => {
    if (callbackError || loading || redirectStarted.current) return;

    if (!user) return;
    redirectStarted.current = true;
    const destination = getAuthenticatedDestination(role);
    if (destination === "/register") {
      void navigate({ to: "/register", search: { oauth: true }, replace: true });
      return;
    }
    void navigate({ to: destination, replace: true });
  }, [callbackError, loading, user, role, navigate]);

  const sessionFailed = !callbackError && !loading && !user;
  const failed = Boolean(callbackError) || sessionFailed;

  return (
    <AuthShell
      eyebrow="התחברות מאובטחת"
      title={failed ? "לא הצלחנו להשלים את ההתחברות" : "משלימים את ההתחברות"}
      subtitle={
        failed ? "אפשר לנסות שוב. פרטי החשבון שלכם לא שונו." : "עוד רגע נעביר אתכם למרחב המתאים."
      }
    >
      {failed ? (
        <div className="space-y-3">
          <Button asChild className="h-11 w-full">
            <Link to="/login">ניסיון התחברות נוסף</Link>
          </Button>
          <p className="text-center text-[12px] text-muted-foreground">
            אם הבעיה נמשכת, נסו להתחבר באמצעות אימייל.
          </p>
        </div>
      ) : (
        <div
          className="flex items-center justify-center gap-2 text-[14px] text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          בודקים את החשבון שלכם…
        </div>
      )}
    </AuthShell>
  );
}
