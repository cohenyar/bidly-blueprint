import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => config,
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
  Outlet: () => null,
  useNavigate: () => vi.fn(),
}));

vi.mock("@/components/app/WorkspaceChrome", () => ({
  WorkspaceHeader: () => null,
  WorkspaceSkeleton: () => null,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: null, role: null, loading: true }),
}));

import { SupplierNavigation } from "@/routes/supplier";

describe("supplier navigation", () => {
  afterEach(cleanup);

  it("keeps the existing profile navigation route available", () => {
    render(<SupplierNavigation />);

    expect(screen.getByRole("link", { name: "פרופיל" }).getAttribute("href")).toBe(
      "/supplier/profile",
    );
  });
});
