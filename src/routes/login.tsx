import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/components/app/AuthCard";
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
      title="כניסה לחשבון"
      subtitle="שמחים לראות אתכם שוב."
      footer={
        <>
          אין לכם עדיין חשבון?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            הרשמה
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-foreground">דוא״ל</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            dir="ltr"
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-left text-sm text-foreground shadow-sm focus:border-ring focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-foreground">סיסמה</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            dir="ltr"
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-left text-sm text-foreground shadow-sm focus:border-ring focus:outline-none"
          />
        </label>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "רגע אחד…" : "כניסה"}
        </button>
      </form>
    </AuthShell>
  );
}
