import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { WorkspaceHeader, WorkspaceSkeleton } from "@/components/app/WorkspaceChrome";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/supplier")({
  component: SupplierLayout,
  ssr: false,
  head: () => ({
    meta: [{ title: "מרחב נותן שירות · Bidly" }],
  }),
});

function SupplierLayout() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    if (role !== "supplier") {
      void navigate({ to: "/app" });
    }
  }, [loading, user, role, navigate]);

  if (loading || !user || role !== "supplier") return <WorkspaceSkeleton />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WorkspaceHeader homeTo="/supplier" extra={<SupplierNavigation />} />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export function SupplierNavigation() {
  return (
    <nav aria-label="ניווט נותן שירות" className="hidden items-center gap-1 md:flex">
      <Link
        to="/supplier"
        activeOptions={{ exact: true }}
        className="rounded-md px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        activeProps={{ className: "bg-accent text-foreground" }}
      >
        בקשות מותאמות
      </Link>
      <Link
        to="/supplier/profile"
        className="rounded-md px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        activeProps={{ className: "bg-accent text-foreground" }}
      >
        פרופיל
      </Link>
    </nav>
  );
}
