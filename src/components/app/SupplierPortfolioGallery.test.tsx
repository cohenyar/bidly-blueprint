import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const portfolioMock = vi.hoisted(() => ({
  signedUrl: vi.fn(),
}));

vi.mock("@/lib/supplier-portfolio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supplier-portfolio")>();
  return {
    ...actual,
    getPortfolioImageUrl: portfolioMock.signedUrl,
  };
});

import { SupplierPortfolioGallery } from "./SupplierPortfolioGallery";

const imagePath =
  "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222-work.jpg";

describe("SupplierPortfolioGallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    portfolioMock.signedUrl.mockResolvedValue("https://signed.example/work.jpg");
  });

  afterEach(cleanup);

  it("renders uploaded images and opens the original in a larger preview", async () => {
    render(<SupplierPortfolioGallery items={[imagePath]} />);

    const thumbnail = await screen.findByRole("button", {
      name: "פתיחת תמונת תיק עבודות בתצוגה גדולה",
    });
    expect(withinAspectRatioGrid(thumbnail)).toBe(true);

    fireEvent.click(thumbnail);
    expect(await screen.findByRole("dialog")).toBeTruthy();
    const preview = screen.getByRole("img");
    expect(preview.className).toContain("object-contain");
    expect(preview.getAttribute("src")).toBe("https://signed.example/work.jpg");
  });

  it("renders external portfolio links with safe new-tab attributes", () => {
    render(<SupplierPortfolioGallery items={["https://portfolio.example/work"]} />);

    const link = screen.getByRole("link", { name: /קישור חיצוני/ });
    expect(link.getAttribute("href")).toBe("https://portfolio.example/work");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("keeps a two-column grid at 320px and reports an empty portfolio clearly", async () => {
    const { container, rerender } = render(
      <div style={{ width: 320 }}>
        <SupplierPortfolioGallery items={[imagePath]} />
      </div>,
    );

    await waitFor(() => expect(portfolioMock.signedUrl).toHaveBeenCalledWith(imagePath));
    expect(container.querySelector(".grid")?.className).toContain("grid-cols-2");

    rerender(<SupplierPortfolioGallery items={[]} />);
    expect(screen.getByText("עדיין לא נוספו פריטים לתיק העבודות.")).toBeTruthy();
  });
});

function withinAspectRatioGrid(element: HTMLElement) {
  return (
    element.className.includes("aspect-[4/3]") && element.className.includes("overflow-hidden")
  );
}
