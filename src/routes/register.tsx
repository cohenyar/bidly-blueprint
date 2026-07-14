import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/components/app/AuthCard";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({
    meta: [
      { title: "הרשמה ל־Bidly — פתחו חשבון לקוח או ספק" },
      {
        name: "description",
        content:
          "פתחו חשבון ב־Bidly: לקוחות מפרסמים בקשות, בעלי עסקים מגישים הצעות. הרשמה חינם, ללא עמלת פרסום.",
      },
    ],
  }),
});

type Role = "customer" | "supplier";

function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("customer");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("הסיסמה חייבת לכלול לפחות 8 תווים.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { display_name: displayName, role },
      },
    });
    setSubmitting(false);
    if (err) {
      setError(translateAuthError(err.message));
      return;
    }
    void navigate({ to: "/app" });
  }

  return (
    <AuthShell
      title="פתיחת חשבון ב־Bidly"
      subtitle="בחרו את סוג החשבון והתחילו לפרסם בקשות או להגיש הצעות."
      footer={
        <>
          כבר יש לכם חשבון?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            כניסה
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">
            אני נרשם/ת בתור
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <RoleOption
              value="customer"
              current={role}
              onChange={setRole}
              title="לקוח"
              desc="מחפש/ת שירות ורוצה לקבל הצעות"
            />
            <RoleOption
              value="supplier"
              current={role}
              onChange={setRole}
              title="בעל עסק"
              desc="נותן/ת שירות ומגיש/ה הצעות"
            />
          </div>
        </fieldset>

        <Field label="שם מלא">
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            className={inputClass}
          />
        </Field>

        <Field label="דוא״ל">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            dir="ltr"
            className={`${inputClass} text-left`}
          />
        </Field>

        <Field label="סיסמה" hint="לפחות 8 תווים.">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            dir="ltr"
            className={`${inputClass} text-left`}
          />
        </Field>

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
          {submitting ? "רגע אחד…" : "יצירת חשבון"}
        </button>
      </form>
    </AuthShell>
  );
}

function RoleOption({
  value,
  current,
  onChange,
  title,
  desc,
}: {
  value: Role;
  current: Role;
  onChange: (r: Role) => void;
  title: string;
  desc: string;
}) {
  const selected = value === current;
  return (
    <label
      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border bg-background hover:border-primary/40"
      }`}
    >
      <input
        type="radio"
        name="role"
        value={value}
        checked={selected}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span className="block text-sm font-semibold text-foreground">{title}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{desc}</span>
    </label>
  );
}

const inputClass =
  "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "כתובת הדוא״ל כבר רשומה. אפשר להתחבר במקום.";
  if (m.includes("password")) return "הסיסמה חלשה מדי. בחרו סיסמה חזקה יותר.";
  if (m.includes("invalid email")) return "כתובת דוא״ל לא תקינה.";
  return "אירעה שגיאה בהרשמה. נסו שוב.";
}
