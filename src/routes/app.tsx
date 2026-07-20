import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { WorkspaceHeader, WorkspaceSkeleton } from "@/components/app/WorkspaceChrome";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/app")({
  component: AppLayout,
  ssr: false,
  head: () => ({
    meta: [{ title: "מרחב עבודה · Bidly" }],
  }),
});

function AppLayout() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/login" });
      return;
    }
    if (!loading && role === "supplier") {
      void navigate({ to: "/supplier" });
    }
  }, [loading, user, role, navigate]);

  if (loading || !user || role === "supplier") return <WorkspaceSkeleton />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WorkspaceHeader />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
