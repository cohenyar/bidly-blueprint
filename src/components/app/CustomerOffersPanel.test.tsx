import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CustomerOfferRow } from "@/lib/offers";

import { CustomerOffersPanel } from "./CustomerOffersPanel";

const offer: CustomerOfferRow = {
  id: "offer-1",
  request_id: "request-1",
  price: 1250,
  estimated_days: 3,
  message: "",
  status: "submitted",
  created_at: "2026-08-01T08:00:00.000Z",
  business_name: "ספק בדיקה",
  business_description: null,
  base_city: "חיפה",
  years_experience: 5,
};

const baseProps = {
  isPending: false,
  error: null,
  offers: [] as CustomerOfferRow[],
  selectedOfferId: null,
  requestStatus: "open" as const,
  selectingOfferId: null,
  onRetry: vi.fn(),
  onSelect: vi.fn(),
};

describe("CustomerOffersPanel", () => {
  afterEach(cleanup);

  it("renders a loading state only while the query is pending", () => {
    render(<CustomerOffersPanel {...baseProps} isPending />);
    expect(screen.getByText("טוען הצעות…")).toBeTruthy();
  });

  it("settles to a clear empty state for zero offers", () => {
    render(<CustomerOffersPanel {...baseProps} />);
    expect(screen.getByText("עדיין אין הצעות")).toBeTruthy();
    expect(screen.queryByText("טוען הצעות…")).toBeNull();
  });

  it("renders multiple offers and omits an empty details block", () => {
    render(
      <CustomerOffersPanel
        {...baseProps}
        offers={[offer, { ...offer, id: "offer-2", business_name: "ספק נוסף", price: 900 }]}
      />,
    );

    expect(screen.getByText("ספק בדיקה")).toBeTruthy();
    expect(screen.getByText("ספק נוסף")).toBeTruthy();
    expect(screen.queryByLabelText("פירוט ההצעה")).toBeNull();
  });

  it("renders optional details only when present", () => {
    render(<CustomerOffersPanel {...baseProps} offers={[{ ...offer, message: "פירוט קצר" }]} />);

    expect(screen.getByLabelText("פירוט ההצעה")).toBeTruthy();
    expect(screen.getByText("פירוט קצר")).toBeTruthy();
  });

  it("settles on a real error and exposes a Hebrew retry action", () => {
    const onRetry = vi.fn();
    render(
      <CustomerOffersPanel
        {...baseProps}
        error={new Error("get_customer_request_offers failed | code=42501")}
        onRetry={onRetry}
      />,
    );

    expect(screen.queryByText("טוען הצעות…")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "ניסיון חוזר" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
