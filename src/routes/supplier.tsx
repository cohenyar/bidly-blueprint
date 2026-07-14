import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { WorkspaceHeader, WorkspaceSkeleton } from "@/components/app/WorkspaceChrome";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/supplier")({
  component: SupplierLayout,
  ssr: false,
  head: () => ({
    meta: [{ title: "מרחב ספק · Bidly" }],
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
    if (role && role !== "supplier") {
      void navigate({ to: "/app" });
    }
  }, [loading, user, role, navigate]);

  if (loading || !user || role !== "supplier") return <WorkspaceSkeleton />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WorkspaceHeader />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
