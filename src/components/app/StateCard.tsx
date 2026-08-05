import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    tone === "danger" ? "text-destructive" : tone === "success" ? "text-success" : "text-primary";
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn(
        "request-spine-navy rounded-xl border border-border bg-surface p-6 shadow-e1 sm:p-8",
        className,
      )}
    >
      <div className="mx-auto max-w-[48ch] text-center">
        <div
          className={cn(
            "mx-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface-muted",
            iconTone,
          )}
        >
          {icon}
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </p>
        <h3 className="mt-1.5 text-[18px] font-bold leading-snug text-foreground">{title}</h3>
        {body ? (
          <div className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{body}</div>
        ) : null}
        {action ? (
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LoadingState({ label = "טוען…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite">
      <StateCard
        icon={<Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.25} />}
        eyebrow="טעינה"
        title={label}
      />
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "לא הצלחנו לטעון את הנתונים",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const message =
    import.meta.env.DEV && error instanceof Error
      ? error.message
      : "אירעה שגיאה לא צפויה. נסו שוב בעוד רגע.";
  return (
    <StateCard
      tone="danger"
      icon={<AlertTriangle className="h-5 w-5" strokeWidth={2.25} />}
      eyebrow="שגיאה"
      title={title}
      body={<p dir="auto">{message}</p>}
      action={
        onRetry ? (
          <Button type="button" onClick={onRetry}>
            ניסיון חוזר
          </Button>
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
        <Button asChild>
          <Link to={ctaHref}>פרסום בקשה ראשונה</Link>
        </Button>
      }
    />
  );
}
