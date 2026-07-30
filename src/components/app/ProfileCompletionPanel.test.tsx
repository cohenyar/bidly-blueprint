import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CompletionStatus } from "@/lib/supplier-profile";

vi.mock("@tanstack/react-router", () => ({
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

import { ProfileCompletionPanel } from "@/components/app/ProfileCompletionPanel";

const baseStatus: CompletionStatus = {
  hasProfile: true,
  hasBusinessName: true,
  hasDescription: true,
  hasBusinessDetails: true,
  hasServiceArea: true,
  hasCategories: true,
  hasSubcategories: true,
  hasServices: true,
  hasStructuredAreas: true,
  hasAvailableServices: true,
  hasAvailableServiceAreas: true,
  isSubmitted: false,
  isLegacy: false,
  percent: 75,
  items: [],
};

describe("ProfileCompletionPanel navigation", () => {
  afterEach(cleanup);

  it("shows the completion action for an incomplete supplier and reuses the profile route", () => {
    render(
      <div dir="rtl">
        <ProfileCompletionPanel status={baseStatus} />
      </div>,
    );

    const action = screen.getByRole("link", { name: "חזרה להשלמת הפרופיל" });
    expect(action.getAttribute("href")).toBe("/supplier/profile");
    expect(action.closest("[dir='rtl']")).toBeTruthy();
  });

  it("shows the completion action when onboarding is not submitted even at 100 percent", () => {
    render(<ProfileCompletionPanel status={{ ...baseStatus, percent: 100 }} />);

    expect(screen.getByRole("link", { name: "חזרה להשלמת הפרופיל" })).toBeTruthy();
  });

  it("hides the completion action for a fully completed and submitted supplier", () => {
    render(
      <ProfileCompletionPanel
        status={{ ...baseStatus, isSubmitted: true, isLegacy: false, percent: 100 }}
      />,
    );

    expect(screen.queryByRole("link", { name: "חזרה להשלמת הפרופיל" })).toBeNull();
  });
});
