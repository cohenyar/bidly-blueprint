import { describe, expect, it } from "vitest";

import {
  canShowSupplierOfferAction,
  toSubmitOfferInput,
  validateOfferForm,
  type OfferFormValues,
  type SupplierOfferVisibility,
} from "./offers";

const validForm: OfferFormValues = {
  price: "1250",
  estimated_days: "3",
  message: "פירוט מספק של ההצעה לביצוע העבודה המבוקשת.",
};

const visibleOffer: SupplierOfferVisibility = {
  isSupplier: true,
  hasActiveMatch: true,
  canViewRequest: true,
  requestStatus: "open",
  hasExistingOffer: false,
};

describe("offer form validation", () => {
  it("requires an estimated price", () => {
    expect(validateOfferForm({ ...validForm, price: "" }).price).toBe("יש להזין הערכת מחיר");
  });

  it.each(["0", "-1", "-250"])("rejects a non-positive price: %s", (price) => {
    expect(validateOfferForm({ ...validForm, price }).price).toBe("יש להזין מחיר גדול מ־0");
  });

  it.each(["not-a-number", "12.5", "Infinity"])("rejects an invalid numeric price: %s", (price) => {
    expect(validateOfferForm({ ...validForm, price }).price).toBe("יש להזין מחיר מספרי תקין");
  });

  it("accepts and converts a valid integer price", () => {
    expect(validateOfferForm(validForm)).toEqual({});
    expect(toSubmitOfferInput(validForm)).toEqual({
      price: 1250,
      estimated_days: 3,
      message: validForm.message,
    });
  });

  it.each(["", "קצר"])('accepts optional offer details: "%s"', (message) => {
    expect(validateOfferForm({ ...validForm, message })).toEqual({});
  });

  it("rejects offer details longer than 2,000 characters", () => {
    expect(validateOfferForm({ ...validForm, message: "א".repeat(2001) }).message).toBe(
      "פירוט ההצעה יכול להכיל עד 2,000 תווים.",
    );
  });

  it("keeps price and estimated days required when details are empty", () => {
    const errors = validateOfferForm({ price: "", estimated_days: "", message: "" });
    expect(errors.price).toBeTruthy();
    expect(errors.estimated_days).toBeTruthy();
    expect(errors.message).toBeUndefined();
  });
});

describe("supplier offer action visibility", () => {
  it("is visible only to an authorized matched supplier on an open request", () => {
    expect(canShowSupplierOfferAction(visibleOffer)).toBe(true);
  });

  it.each([
    ["customer", { isSupplier: false }],
    ["supplier without a Match", { hasActiveMatch: false }],
    ["supplier without Request access", { canViewRequest: false }],
    ["supplier on a closed Request", { requestStatus: "closed" as const }],
    ["supplier with an existing Offer", { hasExistingOffer: true }],
  ])("is hidden for %s", (_scenario, overrides) => {
    expect(canShowSupplierOfferAction({ ...visibleOffer, ...overrides })).toBe(false);
  });
});
