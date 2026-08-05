import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigationMock = vi.hoisted(() => vi.fn());
const routeState = vi.hoisted(() => ({ current: "/supplier" }));
const authState = vi.hoisted(() => ({
  current: { role: "supplier" as "customer" | "supplier", signOut: vi.fn() },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    activeOptions: _activeOptions,
    activeProps,
    className,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    to: string;
    activeOptions?: unknown;
    activeProps?: { className?: string };
  }) => {
    const isActive = routeState.current === to;
    return (
      <a
        href={to}
        className={`${className ?? ""} ${isActive ? (activeProps?.className ?? "") : ""}`}
        aria-current={isActive ? "page" : undefined}
        onClick={(event) => {
          event.preventDefault();
          navigationMock(to);
        }}
        {...props}
      >
        {children}
      </a>
    );
  },
  useNavigate: () => vi.fn(),
}));

vi.mock("@/components/app/NotificationsBell", () => ({
  NotificationsBell: () => null,
}));

vi.mock("@/components/app/PageContainer", () => ({
  PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState.current,
}));

import { WorkspaceHeader } from "./WorkspaceChrome";

describe("WorkspaceHeader", () => {
  afterEach(() => {
    cleanup();
    navigationMock.mockReset();
    routeState.current = "/supplier";
    authState.current = { role: "supplier", signOut: vi.fn() };
  });

  it("links the workspace item to the existing supplier dashboard", () => {
    render(<WorkspaceHeader homeTo="/supplier" />);
    const link = screen.getByRole("link", { name: "מרחב עבודה" });

    expect(link.getAttribute("href")).toBe("/supplier");
    fireEvent.click(link);
    expect(navigationMock).toHaveBeenCalledWith("/supplier");
  });

  it("keeps the logo link pointed at the correct role dashboard", () => {
    const { rerender } = render(<WorkspaceHeader homeTo="/supplier" />);
    const supplierLogoLink = screen.getByRole("link", { name: "Bidly — דף הבית" });
    expect(supplierLogoLink.getAttribute("href")).toBe("/supplier");
    expect(supplierLogoLink.querySelector("svg")).toBeTruthy();

    authState.current = { role: "customer", signOut: vi.fn() };
    rerender(<WorkspaceHeader />);
    const customerLogoLink = screen.getByRole("link", { name: "Bidly — דף הבית" });
    expect(customerLogoLink.getAttribute("href")).toBe("/app");
    expect(customerLogoLink.querySelector("svg")).toBeTruthy();
  });

  it("preserves the active workspace navigation styling", () => {
    render(<WorkspaceHeader homeTo="/supplier" />);
    const link = screen.getByRole("link", { name: "מרחב עבודה" });

    expect(link.getAttribute("aria-current")).toBe("page");
    expect(link.className).toContain("bg-accent");
    expect(link.className).toContain("text-foreground");
  });

  it("does not mark the workspace item active on the matched-request list", () => {
    routeState.current = "/supplier/requests";
    render(<WorkspaceHeader homeTo="/supplier" />);
    const link = screen.getByRole("link", { name: "מרחב עבודה" });

    expect(link.getAttribute("aria-current")).toBeNull();
    expect(link.className).not.toMatch(/(?:^|\s)bg-accent(?:\s|$)/);
  });

  it("keeps customer and supplier navigation separated", () => {
    authState.current = { role: "customer", signOut: vi.fn() };
    routeState.current = "/app";
    const { rerender } = render(<WorkspaceHeader />);

    expect(screen.getByRole("navigation", { name: "ניווט לקוח" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "הבקשות שלי" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "בקשות מותאמות" })).toBeNull();

    authState.current = { role: "supplier", signOut: vi.fn() };
    routeState.current = "/supplier";
    rerender(<WorkspaceHeader homeTo="/supplier" />);

    expect(screen.getByRole("navigation", { name: "ניווט נותן שירות" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "בקשות מותאמות" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "הבקשות שלי" })).toBeNull();
  });

  it("keeps the complete role navigation visible in the mobile header", () => {
    render(
      <div style={{ width: 320 }}>
        <WorkspaceHeader homeTo="/supplier" />
      </div>,
    );

    const navigation = screen.getByRole("navigation", { name: "ניווט נותן שירות" });
    expect(navigation.className).toContain("w-full");
    expect(navigation.className).not.toContain("hidden");
    expect(screen.getByRole("link", { name: "פרופיל" })).toBeTruthy();
  });
});
