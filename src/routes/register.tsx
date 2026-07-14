import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";

import {
  AuthShell,
  AuthField,
  authInputClass,
  authSubmitClass,
} from "@/components/app/AuthCard";
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
      eyebrow="הצטרפות למרחב"
      title="פתיחת חשבון"
      subtitle="בחרו את סוג החשבון והתחילו לפרסם בקשות או להגיש הצעות."
      footer={
        <>
          כבר יש לכם חשבון?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            כניסה
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <fieldset>
          <legend className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            אני נרשם/ת בתור
          </legend>
          <div className="grid grid-cols-2 gap-2.5">
            <RoleOption
              value="customer"
              current={role}
              onChange={setRole}
              title="לקוח"
              desc="מפרסם בקשות"
            />
            <RoleOption
              value="supplier"
              current={role}
              onChange={setRole}
              title="בעל עסק"
              desc="מגיש הצעות"
            />
          </div>
        </fieldset>

        <AuthField label="שם מלא">
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            className={authInputClass}
          />
        </AuthField>

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

        <AuthField label="סיסמה" hint="לפחות 8 תווים.">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
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
          {submitting ? "רגע אחד…" : "יצירת חשבון"}
          {!submitting ? <ArrowLeft className="h-4 w-4" /> : null}
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
      className={`relative cursor-pointer rounded-lg border p-3 transition-all ${
        selected
          ? "request-spine-emerald border-primary bg-primary/[0.04] shadow-e1"
          : "border-border bg-background hover:border-border-strong"
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
      <span className="block text-[14px] font-semibold text-foreground">
        {title}
      </span>
      <span className="mt-0.5 block text-[12px] text-muted-foreground">
        {desc}
      </span>
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
