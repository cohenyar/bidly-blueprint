import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { BidlyLogo } from "@/components/app/BidlyLogo";
import { NotificationsBell } from "@/components/app/NotificationsBell";
import { PageContainer } from "@/components/app/PageContainer";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  customer: "לקוח",
  supplier: "נותן שירות",
  admin: "מנהל מערכת",
};

export function WorkspaceHeader({
  extra,
  homeTo = "/app",
}: {
  extra?: ReactNode;
  homeTo?: "/app" | "/supplier";
}) {
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const roleLabel = role ? ROLE_LABEL[role] : "משתמש";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <PageContainer>
        <div className="grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to={homeTo}
              className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md"
            >
              <BidlyLogo />
            </Link>
            <span aria-hidden className="hidden h-4 w-px bg-border sm:inline-block" />
            <span className="hidden truncate text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:inline-block">
              מרחב עבודה
            </span>
            {extra}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:inline-flex">
              {roleLabel}
            </span>
            <NotificationsBell
              requestRoute={role === "supplier" ? "/supplier/requests/$id" : "/app/requests/$id"}
            />
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => navigate({ to: "/" }));
              }}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 text-[13px] font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>התנתקות</span>
            </button>
          </div>
        </div>
      </PageContainer>
    </header>
  );
}

export function WorkspaceSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <PageContainer>
          <div className="flex h-14 items-center justify-between">
            <div className="h-6 w-24 rounded-md bg-surface-muted animate-pulse" />
            <div className="h-9 w-24 rounded-lg bg-surface-muted animate-pulse" />
          </div>
        </PageContainer>
      </div>
      <PageContainer>
        <div className="py-10 sm:py-14">
          <div className="request-spine-navy ps-5">
            <div className="h-3 w-28 rounded bg-surface-muted animate-pulse" />
            <div className="mt-4 h-8 w-64 rounded-md bg-surface-muted animate-pulse" />
            <div className="mt-3 h-4 w-80 max-w-full rounded bg-surface-muted animate-pulse" />
          </div>
          <div className="mt-10 border-b border-border pb-4">
            <div className="h-3 w-24 rounded bg-surface-muted animate-pulse" />
            <div className="mt-2 h-6 w-56 rounded bg-surface-muted animate-pulse" />
          </div>
          <div className="mt-6 h-64 rounded-2xl border border-border bg-surface-muted/60 animate-pulse" />
        </div>
      </PageContainer>
    </div>
  );
}
