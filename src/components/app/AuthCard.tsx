import type { ReactNode } from "react";

import { BidlyLogo } from "./BidlyLogo";
import { PageContainer } from "./PageContainer";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <PageContainer>
          <div className="flex h-16 items-center">
            <a href="/" className="inline-flex">
              <BidlyLogo />
            </a>
          </div>
        </PageContainer>
      </header>
      <main className="flex items-start justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
            <div className="mt-6">{children}</div>
          </div>
          {footer ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
