import { useState } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getGoogleOAuthRedirectUrl } from "@/lib/auth-routing";

type OAuthDiagnostic = {
  provider: "google";
  code: string | null;
  message: string;
  status: number | null;
};

export function GoogleOAuthButton({ onError }: { onError: (message: string) => void }) {
  const [pending, setPending] = useState(false);

  async function continueWithGoogle() {
    onError("");
    setPending(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getGoogleOAuthRedirectUrl(window.location.origin),
        },
      });

      if (error) throw error;
    } catch (error) {
      const diagnostic = getOAuthDiagnostic(error);
      if (import.meta.env.DEV) {
        console.error("[Auth] Google OAuth initiation failed", diagnostic);
      }
      onError("לא הצלחנו להתחבר באמצעות Google. נסו שוב.");
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full"
      isLoading={pending}
      loadingLabel="עוברים ל־Google…"
      onClick={() => void continueWithGoogle()}
    >
      <GoogleMark />
      המשך עם Google
    </Button>
  );
}

export function AuthMethodDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[12px] font-medium text-muted-foreground">או באמצעות אימייל</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Google" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.63.39 3.17 1.04 4.55l3.35-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
      />
    </svg>
  );
}

function getOAuthDiagnostic(error: unknown): OAuthDiagnostic {
  const candidate = error as {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };

  return {
    provider: "google",
    code: typeof candidate?.code === "string" ? candidate.code : null,
    message: typeof candidate?.message === "string" ? candidate.message : "Unknown OAuth error",
    status: typeof candidate?.status === "number" ? candidate.status : null,
  };
}
