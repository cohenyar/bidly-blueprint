import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
    <a href={to} {...props}>
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

import { SupplierProfilePage } from "@/routes/supplier.profile";

describe("Supplier profile route navigation", () => {
  afterEach(cleanup);

  it("returns to the existing supplier area from the onboarding flow", () => {
    render(<SupplierProfilePage />);

    const action = screen.getByRole("link", { name: "חזרה לאזור הספק" });
    expect(action.getAttribute("href")).toBe("/supplier");
    expect(action.closest("[dir='rtl']")).toBeTruthy();
    expect(screen.getByTestId("supplier-profile-form")).toBeTruthy();
  });
});
