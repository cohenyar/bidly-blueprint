import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { BidlyLogo } from "@/components/app/BidlyLogo";
import { NotificationsBell } from "@/components/app/NotificationsBell";
import { PageContainer } from "@/components/app/PageContainer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  customer: "לקוח",
  supplier: "נותן שירות",
  admin: "מנהל מערכת",
};

type WorkspaceRole = "customer" | "supplier";

const CUSTOMER_NAVIGATION = [
  { to: "/app", label: "אזור אישי", exact: true },
  { to: "/app/requests", label: "הבקשות שלי", exact: true },
  { to: "/app/requests/new", label: "בקשה חדשה", exact: true },
] as const;

const SUPPLIER_NAVIGATION = [
  { to: "/supplier", label: "מרחב עבודה", exact: true },
  { to: "/supplier/requests", label: "בקשות מותאמות", exact: true },
  { to: "/supplier/profile", label: "פרופיל", exact: true },
] as const;

export function WorkspaceHeader({ homeTo = "/app" }: { homeTo?: "/app" | "/supplier" }) {
  const navigate = useNavigate();
  const { role, signOut } = useAuth();
  const roleLabel = role ? ROLE_LABEL[role] : "משתמש";
  const workspaceRole: WorkspaceRole = role === "supplier" ? "supplier" : "customer";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <PageContainer>
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4">
          <Link
            to={homeTo}
            aria-label="Bidly — דף הבית"
            className="order-1 inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BidlyLogo />
          </Link>

          <WorkspaceNavigation
            role={workspaceRole}
            className="order-3 w-full overflow-x-auto border-t border-border py-2 md:order-2 md:w-auto md:border-t-0 md:py-0"
          />

          <div className="order-2 flex items-center gap-2 md:order-3">
            <span className="hidden rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:inline-flex">
              {roleLabel}
            </span>
            <NotificationsBell
              requestRoute={role === "supplier" ? "/supplier/requests/$id" : "/app/requests/$id"}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="התנתקות"
              onClick={() => {
                void signOut().then(() => navigate({ to: "/" }));
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">התנתקות</span>
            </Button>
          </div>
        </div>
      </PageContainer>
    </header>
  );
}

export function WorkspaceNavigation({
  role,
  className,
}: {
  role: WorkspaceRole;
  className?: string;
}) {
  const items = role === "supplier" ? SUPPLIER_NAVIGATION : CUSTOMER_NAVIGATION;

  return (
    <nav
      aria-label={role === "supplier" ? "ניווט נותן שירות" : "ניווט לקוח"}
      className={cn("flex items-center gap-1", className)}
    >
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.exact }}
          className="shrink-0 rounded-lg px-3 py-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          activeProps={{ className: "bg-accent text-foreground" }}
        >
          {item.label}
        </Link>
      ))}
    </nav>
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
