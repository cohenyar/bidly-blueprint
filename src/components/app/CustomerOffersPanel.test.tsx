import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CustomerOfferRow } from "@/lib/offers";

import {
  CustomerOffersPanel,
  getSubmittedOfferHighlights,
  sortCustomerOffers,
} from "./CustomerOffersPanel";

const offer: CustomerOfferRow = {
  id: "offer-1",
  request_id: "request-1",
  price: 1250,
  estimated_days: 3,
  message: "פירוט ההצעה",
  status: "submitted",
  created_at: "2026-08-01T08:00:00.000Z",
  business_name: "ספק בדיקה",
  business_description: "תיאור העסק",
  base_city: "חיפה",
  years_experience: 5,
};

const cheaperSlower: CustomerOfferRow = {
  ...offer,
  id: "offer-2",
  business_name: "ספק זול",
  price: 900,
  estimated_days: 6,
  message: "",
  created_at: "2026-08-02T08:00:00.000Z",
};

const newerFaster: CustomerOfferRow = {
  ...offer,
  id: "offer-3",
  business_name: "ספק מהיר",
  price: 1500,
  estimated_days: 2,
  created_at: "2026-08-03T08:00:00.000Z",
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

function renderedBusinessOrder() {
  return screen
    .getAllByRole("article")
    .map((article) => within(article).getByRole("heading", { level: 3 }).textContent);
}

describe("CustomerOffersPanel", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders one submitted Offer with all available comparison fields", () => {
    render(<CustomerOffersPanel {...baseProps} offers={[offer]} />);

    expect(screen.getByText("ספק בדיקה")).toBeTruthy();
    expect(screen.getByText(/1,250/)).toBeTruthy();
    expect(screen.getByText("3 ימים")).toBeTruthy();
    expect(screen.getByText(/חיפה.*5 שנות ניסיון/)).toBeTruthy();
    expect(screen.getByText("תיאור העסק")).toBeTruthy();
    expect(screen.getByLabelText("פירוט ההצעה")).toBeTruthy();
    expect(screen.getByText("ממתינה לבחירה")).toBeTruthy();
  });

  it("sorts multiple Offers by lowest price by default", () => {
    render(<CustomerOffersPanel {...baseProps} offers={[offer, newerFaster, cheaperSlower]} />);
    expect(renderedBusinessOrder()).toEqual(["ספק זול", "ספק בדיקה", "ספק מהיר"]);
  });

  it("sorts by shortest completion time", () => {
    render(<CustomerOffersPanel {...baseProps} offers={[offer, newerFaster, cheaperSlower]} />);
    fireEvent.change(screen.getByLabelText("מיון הצעות"), { target: { value: "time" } });
    expect(renderedBusinessOrder()).toEqual(["ספק מהיר", "ספק בדיקה", "ספק זול"]);
  });

  it("sorts by newest Offer", () => {
    render(<CustomerOffersPanel {...baseProps} offers={[offer, newerFaster, cheaperSlower]} />);
    fireEvent.change(screen.getByLabelText("מיון הצעות"), { target: { value: "newest" } });
    expect(renderedBusinessOrder()).toEqual(["ספק מהיר", "ספק זול", "ספק בדיקה"]);
  });

  it("highlights the objectively lowest price and shortest time", () => {
    render(<CustomerOffersPanel {...baseProps} offers={[offer, cheaperSlower, newerFaster]} />);
    const cards = screen.getAllByRole("article");
    const cheapCard = cards.find((card) => card.textContent?.includes("ספק זול"));
    const fastCard = cards.find((card) => card.textContent?.includes("ספק מהיר"));

    expect(cheapCard?.textContent).toContain("המחיר הנמוך ביותר");
    expect(cheapCard?.textContent).not.toContain("הזמן הקצר ביותר");
    expect(fastCard?.textContent).toContain("הזמן הקצר ביותר");
    expect(fastCard?.textContent).not.toContain("המחיר הנמוך ביותר");
  });

  it("allows one Offer to receive both objective badges", () => {
    const bestOnBoth = { ...cheaperSlower, estimated_days: 1 };
    const highlights = getSubmittedOfferHighlights([offer, bestOnBoth]);
    expect(highlights.lowestPrice.has(bestOnBoth.id)).toBe(true);
    expect(highlights.shortestTime.has(bestOnBoth.id)).toBe(true);
  });

  it("ignores non-submitted Offers when calculating active comparison badges", () => {
    const withdrawnCheap = { ...cheaperSlower, status: "withdrawn" as const, price: 1 };
    const highlights = getSubmittedOfferHighlights([offer, newerFaster, withdrawnCheap]);
    expect(highlights.lowestPrice.has(withdrawnCheap.id)).toBe(false);
    expect(highlights.lowestPrice.has(offer.id)).toBe(true);
  });

  it("does not render empty optional details or empty Supplier metadata", () => {
    render(
      <CustomerOffersPanel
        {...baseProps}
        offers={[
          {
            ...offer,
            message: "",
            business_description: null,
            base_city: null,
            years_experience: null,
          },
        ]}
      />,
    );

    expect(screen.queryByLabelText("פירוט ההצעה")).toBeNull();
    expect(screen.queryByText("פרטי ניסיון לא נמסרו")).toBeNull();
  });

  it("requires the detailed confirmation before selecting an Offer", () => {
    const onSelect = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CustomerOffersPanel {...baseProps} offers={[offer]} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "בחירת ההצעה" }));
    expect(confirm).toHaveBeenCalledWith(
      "האם לבחור בהצעה של ספק בדיקה במחיר 1,250 ₪?\nזמן ביצוע משוער: 3 ימים.",
    );
    expect(onSelect).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "בחירת ההצעה" }));
    expect(onSelect).toHaveBeenCalledWith(offer);
  });

  it("marks the selected Offer and removes all competing selection actions", () => {
    render(
      <CustomerOffersPanel
        {...baseProps}
        offers={[offer, cheaperSlower]}
        selectedOfferId={offer.id}
      />,
    );

    expect(screen.getByText("הצעה נבחרה")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "בחירת ההצעה" })).toBeNull();
  });

  it("disables every selection action while a selection is pending", () => {
    render(
      <CustomerOffersPanel
        {...baseProps}
        offers={[offer, cheaperSlower]}
        selectingOfferId={offer.id}
        selectionPending
      />,
    );

    expect(
      screen
        .getAllByRole("button", { name: /בחירת ההצעה|בוחר/ })
        .every((button) => button.hasAttribute("disabled")),
    ).toBe(true);
  });

  it("settles to the requested loading, empty, and error states", () => {
    const { rerender } = render(<CustomerOffersPanel {...baseProps} isPending />);
    expect(screen.getByText("טוען הצעות...")).toBeTruthy();

    rerender(<CustomerOffersPanel {...baseProps} />);
    expect(screen.getByText("עדיין לא התקבלו הצעות לבקשה")).toBeTruthy();

    const onRetry = vi.fn();
    rerender(
      <CustomerOffersPanel
        {...baseProps}
        error={new Error("get_customer_request_offers failed | code=42501")}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText("לא הצלחנו לטעון את ההצעות")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "ניסיון חוזר" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("preserves responsive card grids within the application-level RTL document", () => {
    render(<CustomerOffersPanel {...baseProps} offers={[offer]} />);
    const card = screen.getByRole("article");
    expect(card.className).toContain("sm:p-6");
    expect(card.querySelector("dl")?.className).toContain("sm:grid-cols-2");
  });
});

describe("sortCustomerOffers", () => {
  it("does not mutate the loaded query data", () => {
    const original = [offer, cheaperSlower];
    sortCustomerOffers(original, "price");
    expect(original).toEqual([offer, cheaperSlower]);
  });
});
