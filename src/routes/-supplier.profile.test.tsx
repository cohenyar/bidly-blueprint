import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigationMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({
    children,
    to,
    onClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a
      href={to}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
        navigationMock(to);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/app/PageContainer", () => ({
  PageContainer: ({ children }: React.PropsWithChildren) => <main dir="rtl">{children}</main>,
}));

vi.mock("@/components/app/SupplierProfileForm", () => ({
  SupplierProfileForm: () => <div data-testid="supplier-profile-form" />,
}));

vi.mock("@/components/app/SupplierProfileOverview", () => ({
  SupplierProfileOverview: () => <div data-testid="supplier-profile-overview" />,
}));

import { SupplierProfilePage } from "@/routes/supplier.profile";

describe("Supplier profile route navigation", () => {
  beforeEach(() => {
    navigationMock.mockReset();
  });

  afterEach(cleanup);

  it("returns to the existing supplier area from the onboarding flow", () => {
    render(<SupplierProfilePage />);

    const action = screen.getByRole("link", { name: "חזרה לאזור הספק" });
    expect(action.getAttribute("href")).toBe("/supplier");
    expect(action.closest("[dir='rtl']")).toBeTruthy();
    expect(action.className).not.toContain("hidden");
    expect(screen.getByTestId("supplier-profile-overview")).toBeTruthy();
    expect(screen.getByTestId("supplier-profile-form")).toBeTruthy();

    fireEvent.click(action);
    expect(navigationMock).toHaveBeenCalledWith("/supplier");
  });

  it("keeps the supplier-area action rendered at mobile width", () => {
    render(
      <div style={{ width: 320 }}>
        <SupplierProfilePage />
      </div>,
    );

    const action = screen.getByRole("link", { name: "חזרה לאזור הספק" });
    expect(action.getAttribute("hidden")).toBeNull();
    expect(action.className).not.toContain("hidden");
  });
});
