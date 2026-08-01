import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OfferRow } from "@/lib/offers";

const mutateAsync = vi.fn();

vi.mock("@/lib/offers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/offers")>();
  return {
    ...actual,
    useSubmitOffer: () => ({ isPending: false, mutateAsync }),
    useWithdrawOffer: () => ({ isPending: false, isError: false, mutateAsync: vi.fn() }),
  };
});

import { SupplierOfferForm, SupplierOfferPrompt, SupplierOwnOffer } from "./SupplierOfferPanel";

const submittedOffer: OfferRow = {
  id: "offer-1",
  request_id: "request-1",
  price: 1250,
  estimated_days: 3,
  message: "פירוט מספק של ההצעה לביצוע העבודה המבוקשת.",
  status: "submitted",
  created_at: "2026-07-31T08:00:00.000Z",
  updated_at: "2026-07-31T08:00:00.000Z",
  withdrawn_at: null,
};

function fillValidNonPriceFields() {
  fireEvent.change(screen.getByLabelText(/זמן משוער/), { target: { value: "3" } });
  fireEvent.change(screen.getByLabelText(/פירוט ההצעה/), {
    target: { value: submittedOffer.message },
  });
}

describe("SupplierOfferPanel", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue("offer-1");
  });

  it("shows a clear primary action before opening the form", () => {
    const onOpen = vi.fn();
    render(<SupplierOfferPrompt onOpen={onOpen} />);

    fireEvent.click(screen.getByRole("button", { name: "שליחת הצעה" }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it.each([
    ["", "יש להזין הערכת מחיר"],
    ["0", "יש להזין מחיר גדול מ־0"],
    ["-25", "יש להזין מחיר גדול מ־0"],
  ])("does not submit an invalid price %s", async (price, error) => {
    render(<SupplierOfferForm requestId="request-1" onSubmitted={vi.fn()} />);
    fillValidNonPriceFields();
    fireEvent.change(screen.getByLabelText(/הערכת מחיר/), { target: { value: price } });
    fireEvent.click(screen.getByRole("button", { name: "שליחת ההצעה" }));

    expect(await screen.findByText(error)).toBeTruthy();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("submits a valid numeric price and keeps the existing required fields", async () => {
    const onSubmitted = vi.fn();
    render(<SupplierOfferForm requestId="request-1" onSubmitted={onSubmitted} />);
    fillValidNonPriceFields();
    fireEvent.change(screen.getByLabelText(/הערכת מחיר/), { target: { value: "1250" } });
    fireEvent.click(screen.getByRole("button", { name: "שליחת ההצעה" }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        price: 1250,
        estimated_days: 3,
        message: submittedOffer.message,
      }),
    );
    expect(onSubmitted).toHaveBeenCalledOnce();
  });

  it("submits a valid price and estimated days with empty optional details", async () => {
    const onSubmitted = vi.fn();
    render(<SupplierOfferForm requestId="request-1" onSubmitted={onSubmitted} />);
    fireEvent.change(screen.getByLabelText(/הערכת מחיר/), { target: { value: "1250" } });
    fireEvent.change(screen.getByLabelText(/זמן משוער/), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "שליחת ההצעה" }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        price: 1250,
        estimated_days: 3,
        message: "",
      }),
    );
    expect(onSubmitted).toHaveBeenCalledOnce();
  });

  it("labels offer details as optional and keeps the 2,000-character maximum", () => {
    render(<SupplierOfferForm requestId="request-1" onSubmitted={vi.fn()} />);
    const details = screen.getByLabelText("פירוט ההצעה (אופציונלי)");

    expect(details.hasAttribute("required")).toBe(false);
    expect(details.hasAttribute("minlength")).toBe(false);
    expect(details.getAttribute("maxlength")).toBe("2000");
    expect(screen.queryByText(/לפחות 20 תווים/)).toBeNull();
  });

  it("renders a submitted Offer and its price instead of another form", () => {
    render(<SupplierOwnOffer offer={submittedOffer} />);

    expect(screen.getAllByText(/ההצעה נשלחה/)).toHaveLength(2);
    expect(screen.getByText(/1,250/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "שליחת הצעה" })).toBeNull();
  });

  it("does not render an empty details block for an offer without details", () => {
    render(<SupplierOwnOffer offer={{ ...submittedOffer, message: "" }} />);

    expect(screen.queryByText("פירוט ההצעה")).toBeNull();
  });
});
