import type { AnchorHTMLAttributes, ComponentType, ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
  current: { user: null as { id: string } | null, role: null as string | null, loading: true },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => ({ options: config }),
  Link: ({
    children,
    to,
    activeOptions: _activeOptions,
    activeProps: _activeProps,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    to: string;
    activeOptions?: unknown;
    activeProps?: unknown;
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="supplier-outlet" />,
  useNavigate: () => navigateMock,
}));

vi.mock("@/components/app/WorkspaceChrome", () => ({
  WorkspaceHeader: () => null,
  WorkspaceSkeleton: () => null,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState.current,
}));

import { SupplierWorkspaceEmptyState } from "@/routes/supplier.index";
import { Route as SupplierRoute, SupplierNavigation } from "@/routes/supplier";

const SupplierLayout = (SupplierRoute as unknown as { options: { component: ComponentType } })
  .options.component;

describe("supplier navigation", () => {
  afterEach(cleanup);
  beforeEach(() => {
    navigateMock.mockReset();
    authState.current = { user: null, role: null, loading: true };
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
