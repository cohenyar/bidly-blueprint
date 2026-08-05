import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";

import { AuthShell, AuthField, authInputClass, authSubmitClass } from "@/components/app/AuthCard";
import { AuthMethodDivider, GoogleOAuthButton } from "@/components/app/GoogleOAuthButton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "כניסה ל־Bidly" },
      {
        name: "description",
        content: "כניסה לחשבון Bidly. נהלו את הבקשות וההצעות שלכם במקום אחד.",
      },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);
    if (err) {
      setError("פרטי ההתחברות אינם נכונים.");
      return;
    }
    void navigate({ to: "/app" });
  }

  return (
    <AuthShell
      eyebrow="כניסה למרחב"
      title="ברוכים השבים"
      subtitle="המשיכו מהמקום שבו עצרתם."
      footer={
        <>
          אין לכם עדיין חשבון?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            פתיחת חשבון
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <GoogleOAuthButton onError={setError} />
        <AuthMethodDivider />

        <AuthField label="דוא״ל">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            dir="ltr"
            className={`${authInputClass} text-left`}
          />
        </AuthField>

        <AuthField label="סיסמה">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            dir="ltr"
            className={`${authInputClass} text-left`}
          />
        </AuthField>

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={submitting} className={authSubmitClass}>
          {submitting ? "רגע אחד…" : "כניסה למרחב"}
          {!submitting ? <ArrowLeft className="h-4 w-4" /> : null}
        </button>
      </form>
    </AuthShell>
  );
}
