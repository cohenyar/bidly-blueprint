import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SupplierMatchedRequest } from "@/lib/supplier-requests";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
    params?: { id: string };
  }) => (
    <a href={params ? to.replace("$id", params.id) : to} {...props}>
      {children}
    </a>
  ),
}));

import { SupplierMatchedRequestCard } from "@/components/app/SupplierMatchedRequestCard";

const request: SupplierMatchedRequest = {
  id: "request-1",
  title: "תיקון נזילה",
  description: "נדרשת עזרה בתיקון נזילה.",
  city: "חיפה",
  budget_type: "open",
  budget_min: null,
  budget_max: null,
  status: "open",
  published_at: "2026-07-30T12:00:00.000Z",
  created_at: "2026-07-30T12:00:00.000Z",
  category: { id: "category-1", name_he: "אינסטלציה" },
  subcategory: { id: "profession-1", name_he: "אינסטלטור" },
  service: { id: "service-1", name_he: "תיקון נזילה" },
  service_area: { id: "area-1", name_he: "חיפה" },
  delivery_mode: "on_site",
  missing_service_text: null,
  questionnaire_answers: [],
  match_created_at: "2026-07-30T12:01:00.000Z",
  match_status: "active",
  match_score: 100,
  match_level: "התאמה מעולה",
  match_strength: "strong",
  match_explanations: [
    "תואם לקטגוריית אינסטלציה",
    "תואם לשירות תיקון נזילה",
    "תואם לכל דרישות הבקשה",
  ],
  match_badges: ["⭐ התאמה מעולה", "📍 באזור השירות שלך", "🔥 שירות מדויק"],
};

describe("SupplierMatchedRequestCard Smart Match details", () => {
  afterEach(cleanup);

  it("shows score, strong-fit level, badges, and expandable explanations", () => {
    render(<SupplierMatchedRequestCard request={request} />);

    expect(screen.getByText("100% · התאמה מעולה")).toBeTruthy();
    expect(screen.getByText("התאמה חזקה")).toBeTruthy();
    expect(screen.getByText("⭐ התאמה מעולה")).toBeTruthy();
    expect(screen.getByText("📍 באזור השירות שלך")).toBeTruthy();
    expect(screen.getByText("🔥 שירות מדויק")).toBeTruthy();

    const summary = screen.getByText("למה אני רואה את הבקשה?");
    const details = summary.closest("details");
    expect(details?.open).toBe(false);
    fireEvent.click(summary);
    expect(details?.open).toBe(true);
    expect(screen.getByText("• תואם לקטגוריית אינסטלציה")).toBeTruthy();
    expect(screen.getByText("• תואם לכל דרישות הבקשה")).toBeTruthy();
  });

  it("shows a weak-fit indicator for a medium Match", () => {
    render(
      <SupplierMatchedRequestCard
        request={{
          ...request,
          match_score: 60,
          match_level: "התאמה בינונית",
          match_strength: "weak",
          match_badges: [],
        }}
      />,
    );

    expect(screen.getByText("60% · התאמה בינונית")).toBeTruthy();
    expect(screen.getByText("התאמה חלשה")).toBeTruthy();
  });
});
