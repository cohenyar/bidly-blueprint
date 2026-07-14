import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { BidlyLogo } from "./BidlyLogo";
import { PageContainer } from "./PageContainer";

/**
 * AuthShell — the entrance to the Bidly workspace.
 *
 * Intentionally minimal: same header, typography, and elevation as the
 * landing page. The Request Spine appears as a subtle navy rule on the
 * inline-start edge of the card, tying the auth surface to the product's
 * signature motif without decorative flourish.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <PageContainer>
          <div className="flex h-14 items-center justify-between">
            <Link to="/" className="inline-flex">
              <BidlyLogo />
            </Link>
            <Link
              to="/"
              className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              חזרה לאתר
            </Link>
          </div>
        </PageContainer>
      </header>

      <main className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 hero-dots opacity-60"
        />
        <PageContainer>
          <div className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[440px] flex-col justify-center py-14 sm:py-20">
            <div className="request-spine-navy rounded-2xl border border-border bg-surface p-8 shadow-e2 sm:p-10">
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                <span className="h-px w-6 bg-primary" aria-hidden />
                {eyebrow}
              </span>
              <h1 className="mt-4 text-[26px] font-bold leading-[1.15] tracking-[-0.01em] text-foreground sm:text-[30px]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  {subtitle}
                </p>
              ) : null}
              <div className="mt-8">{children}</div>
            </div>

            {footer ? (
              <p className="mt-6 text-center text-[13px] text-muted-foreground">
                {footer}
              </p>
            ) : null}

            <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
              מוגן · מאובטח · ללא ספאם
            </p>
          </div>
        </PageContainer>
      </main>
    </div>
  );
}

/* Shared field primitives so login/register share the same visual language. */

export const authInputClass =
  "block w-full rounded-lg border border-input bg-background px-3.5 text-[14px] text-foreground shadow-e1 transition-colors placeholder:text-muted-foreground/70 hover:border-border-strong focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 h-11";

export const authSubmitClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-primary-foreground shadow-e1 transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60";

export function AuthField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-[12px] text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
