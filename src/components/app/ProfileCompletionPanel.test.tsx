import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CompletionStatus } from "@/lib/supplier-profile";

const navigationMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
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
  beforeEach(() => {
    navigationMock.mockReset();
  });

  afterEach(cleanup);

  it("shows the completion action for an incomplete supplier and navigates to the profile route", () => {
    render(
      <div dir="rtl">
        <ProfileCompletionPanel status={baseStatus} />
      </div>,
    );

    const action = screen.getByRole("link", { name: "חזרה להשלמת הפרופיל" });
    expect(action.getAttribute("href")).toBe("/supplier/profile");
    expect(action.closest("[dir='rtl']")).toBeTruthy();
    expect(action.className).not.toContain("hidden");

    fireEvent.click(action);
    expect(navigationMock).toHaveBeenCalledWith("/supplier/profile");
  });

  it("shows the completion action when onboarding is not submitted even at 100 percent", () => {
    render(<ProfileCompletionPanel status={{ ...baseStatus, percent: 100 }} />);

    expect(screen.getByRole("link", { name: "חזרה להשלמת הפרופיל" })).toBeTruthy();
  });

  it("shows the profile-change action for a fully completed and submitted supplier", () => {
    render(
      <ProfileCompletionPanel
        status={{ ...baseStatus, isSubmitted: true, isLegacy: false, percent: 100 }}
      />,
    );

    const action = screen.getByRole("link", { name: "שינוי פרופיל" });
    expect(action.getAttribute("href")).toBe("/supplier/profile");

    fireEvent.click(action);
    expect(navigationMock).toHaveBeenCalledWith("/supplier/profile");
  });

  it("keeps the completion action for a submitted legacy supplier", () => {
    render(
      <ProfileCompletionPanel
        status={{ ...baseStatus, isSubmitted: true, isLegacy: true, percent: 100 }}
      />,
    );

    expect(screen.getByRole("link", { name: "חזרה להשלמת הפרופיל" })).toBeTruthy();
  });

  it("keeps the completion action rendered at mobile width", () => {
    render(
      <div dir="rtl" style={{ width: 320 }}>
        <ProfileCompletionPanel status={baseStatus} />
      </div>,
    );

    const action = screen.getByRole("link", { name: "חזרה להשלמת הפרופיל" });
    expect(action.getAttribute("hidden")).toBeNull();
    expect(action.className).not.toContain("hidden");
  });
});
