import type { AnchorHTMLAttributes, ComponentType, ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
  current: { user: null as { id: string } | null, role: null as string | null, loading: true },
}));
const routeState = vi.hoisted(() => ({ current: "/supplier" }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => ({ options: config }),
  Link: ({
    children,
    to,
    activeOptions,
    activeProps,
    className,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    to: string;
    activeOptions?: { exact?: boolean };
    activeProps?: { className?: string };
  }) => {
    const isActive = activeOptions?.exact
      ? routeState.current === to
      : routeState.current.startsWith(to);
    return (
      <a
        href={to}
        className={`${className ?? ""} ${isActive ? (activeProps?.className ?? "") : ""}`}
        aria-current={isActive ? "page" : undefined}
        {...props}
      >
        {children}
      </a>
    );
  },
  Outlet: () => <div data-testid="supplier-outlet" />,
  useNavigate: () => navigateMock,
}));

vi.mock("@/components/app/WorkspaceChrome", () => ({
  WorkspaceHeader: () => null,
  WorkspaceNavigation: () => (
    <nav aria-label="ניווט נותן שירות">
      <a href="/supplier/requests" aria-current="page" className="bg-accent text-foreground">
        בקשות מותאמות
      </a>
      <a href="/supplier/profile">פרופיל</a>
    </nav>
  ),
  WorkspaceSkeleton: () => null,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState.current,
}));

import { SupplierWorkspaceEmptyState } from "@/components/app/SupplierMatchedRequestsList";
import { Route as SupplierRoute, SupplierNavigation } from "@/routes/supplier";

const SupplierLayout = (SupplierRoute as unknown as { options: { component: ComponentType } })
  .options.component;

describe("supplier navigation", () => {
  afterEach(cleanup);
  beforeEach(() => {
    navigateMock.mockReset();
    authState.current = { user: null, role: null, loading: true };
    routeState.current = "/supplier";
  });

  it("opens and activates the dedicated matched-request list", () => {
    routeState.current = "/supplier/requests";
    render(<SupplierNavigation />);
    const link = screen.getByRole("link", { name: "בקשות מותאמות" });

    expect(link.getAttribute("href")).toBe("/supplier/requests");
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(link.className).toContain("bg-accent");
  });

  it("keeps the existing profile navigation route available", () => {
    render(<SupplierNavigation />);

    expect(screen.getByRole("link", { name: "פרופיל" }).getAttribute("href")).toBe(
      "/supplier/profile",
    );
  });

  it("does not render the supplier workspace for a customer", async () => {
    authState.current = { user: { id: "customer-1" }, role: "customer", loading: false };

    render(<SupplierLayout />);

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: "/app" }));
    expect(screen.queryByTestId("supplier-outlet")).toBeNull();
  });

  it("keeps a clear empty state when the supplier has no active matches", () => {
    render(<SupplierWorkspaceEmptyState />);

    expect(screen.getByText("אין התאמות פעילות")).toBeTruthy();
    expect(screen.getByText("אין כרגע בקשות שמתאימות לפרופיל שלכם.")).toBeTruthy();
  });
});
