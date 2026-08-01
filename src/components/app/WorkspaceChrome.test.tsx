import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const navigationMock = vi.hoisted(() => vi.fn());
const routeState = vi.hoisted(() => ({ current: "/supplier" }));

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

vi.mock("@/components/app/BidlyLogo", () => ({
  BidlyLogo: () => <span>Bidly</span>,
}));

vi.mock("@/components/app/NotificationsBell", () => ({
  NotificationsBell: () => null,
}));

vi.mock("@/components/app/PageContainer", () => ({
  PageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ role: "supplier", signOut: vi.fn() }),
}));

import { WorkspaceHeader } from "./WorkspaceChrome";

describe("WorkspaceHeader", () => {
  afterEach(() => {
    cleanup();
    navigationMock.mockReset();
    routeState.current = "/supplier";
  });

  it("links the workspace item to the existing supplier dashboard", () => {
    render(<WorkspaceHeader homeTo="/supplier" />);
    const link = screen.getByRole("link", { name: "מרחב עבודה" });

    expect(link.getAttribute("href")).toBe("/supplier");
    fireEvent.click(link);
    expect(navigationMock).toHaveBeenCalledWith("/supplier");
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
});
