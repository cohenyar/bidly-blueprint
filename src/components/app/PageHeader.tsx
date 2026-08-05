import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  backAction,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  backAction?: ReactNode;
  className?: string;
}) {
  return (
    <header
      dir="rtl"
      className={cn(
        "flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="request-spine-navy min-w-0 max-w-3xl ps-5">
        {backAction ? <div className="mb-3">{backAction}</div> : null}
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-[32px]">
          {title}
        </h1>
        {subtitle ? (
          <div className="mt-2 max-w-[62ch] text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
            {subtitle}
          </div>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}
