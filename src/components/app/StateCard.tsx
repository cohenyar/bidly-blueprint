import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** Shared page-level state surfaces. All share the Bidly card language. */

export function StateCard({
  icon,
  eyebrow,
  title,
  body,
  action,
  tone = "neutral",
  className,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "danger" | "success";
  className?: string;
}) {
  const iconTone =
    tone === "danger"
      ? "text-danger"
      : tone === "success"
        ? "text-success"
        : "text-primary";
  return (
    <div
      className={cn(
        "request-spine-navy rounded-2xl border border-border bg-surface p-8 shadow-e1 sm:p-12",
        className,
      )}
    >
      <div className="mx-auto max-w-[52ch] text-center">
        <div
          className={cn(
            "mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-muted",
            iconTone,
          )}
        >
          {icon}
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-[20px] font-bold leading-snug text-foreground">
          {title}
        </h3>
        {body ? (
          <div className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            {body}
          </div>
        ) : null}
        {action ? (
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LoadingState({ label = "טוען…" }: { label?: string }) {
  return (
    <StateCard
      icon={<Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} />}
      eyebrow="טעינה"
      title={label}
    />
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const message =
    error instanceof Error ? error.message : "אירעה שגיאה לא צפויה.";
  return (
    <StateCard
      tone="danger"
      icon={<AlertTriangle className="h-5 w-5" strokeWidth={2.25} />}
      eyebrow="שגיאה"
      title="לא הצלחנו לטעון את הנתונים"
      body={<p dir="auto">{message}</p>}
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover"
          >
            ניסיון חוזר
          </button>
        ) : null
      }
    />
  );
}

export function EmptyRequests({ ctaHref = "/app/requests/new" }: { ctaHref?: string }) {
  return (
    <StateCard
      icon={<Inbox className="h-5 w-5" strokeWidth={2.25} />}
      eyebrow="עדיין לא פרסמתם בקשה"
      title="פרסמו בקשה כדי לקבל הצעות פרטיות מבעלי מקצוע."
      body="ניסוח בקשה לוקח פחות מדקה. תוך שעות ספורות תראו כאן את ההצעות הראשונות."
      action={
        <Link
          to={ctaHref}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-e1 hover:bg-primary-hover"
        >
          פרסום בקשה ראשונה
        </Link>
      }
    />
  );
}
