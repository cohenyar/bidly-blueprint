import { describe, expect, it } from "vitest";

import { MAX_SIZE_BYTES } from "@/lib/attachments";
import {
  getPortfolioSourceType,
  isPortfolioStoragePath,
  isValidHttpsPortfolioUrl,
  validatePortfolioImage,
} from "@/lib/supplier-portfolio";
import { validateSupplierProfile, type SupplierProfileInput } from "@/lib/supplier-profile";

const validProfile: SupplierProfileInput = {
  business_name: "עסק לדוגמה",
  business_type: "עצמאי",
  description: "תיאור עסק מלא שמסביר היטב את השירות.",
  base_city: "חיפה",
  service_mode: "on_site",
  max_travel_km: 25,
  remote_available: false,
  service_area: "",
  starting_price_ils: null,
  years_experience: null,
  portfolio_links: [],
};

describe("Supplier portfolio validation", () => {
  it("accepts JPG images", () => {
    expect(
      validatePortfolioImage(new File(["jpg"], "work.jpg", { type: "image/jpeg" })),
    ).toBeNull();
  });

  it.each([
    ["PNG", "work.png", "image/png"],
    ["WEBP", "work.webp", "image/webp"],
  ])("accepts %s images", (_, name, type) => {
    expect(validatePortfolioImage(new File(["image"], name, { type }))).toBeNull();
  });

  it("rejects non-image files", () => {
    expect(validatePortfolioImage(new File(["text"], "work.txt", { type: "text/plain" }))).toBe(
      "ניתן להעלות תמונות JPG, JPEG, PNG או WEBP בלבד.",
    );
  });

  it("rejects oversized images", () => {
    const file = { size: MAX_SIZE_BYTES + 1, type: "image/jpeg" } as File;
    expect(validatePortfolioImage(file)).toBe("התמונה גדולה מ־15MB.");
  });

  it("accepts valid HTTPS links and identifies existing portfolio URLs", () => {
    expect(isValidHttpsPortfolioUrl("https://example.com/work")).toBe(true);
    expect(getPortfolioSourceType("https://example.com/work")).toBe("external_link");
  });

  it.each(["http://example.com/work", "example.com/work", "https://", ""])(
    "rejects invalid or non-HTTPS link %j",
    (value) => {
      expect(isValidHttpsPortfolioUrl(value)).toBe(false);
    },
  );

  it("recognizes only the owned Storage-path format as an uploaded source", () => {
    const path =
      "00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002-work.jpg";
    expect(isPortfolioStoragePath(path)).toBe(true);
    expect(getPortfolioSourceType(path)).toBe("uploaded_image");
    expect(isPortfolioStoragePath("../work.jpg")).toBe(false);
  });

  it("allows either one uploaded image path or one external HTTPS source during profile save", () => {
    const uploadedPath =
      "00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002-work.jpg";
    expect(
      validateSupplierProfile({ ...validProfile, portfolio_links: [uploadedPath] }, false)
        .portfolio_links,
    ).toBeUndefined();
    expect(
      validateSupplierProfile(
        { ...validProfile, portfolio_links: ["https://example.com/work"] },
        false,
      ).portfolio_links,
    ).toBeUndefined();
  });

  it("rejects a non-HTTPS external source during profile save", () => {
    expect(
      validateSupplierProfile(
        { ...validProfile, portfolio_links: ["http://example.com/work"] },
        false,
      ).portfolio_links,
    ).toBe("יש להזין קישור HTTPS תקין או להעלות תמונה נתמכת.");
  });
});
