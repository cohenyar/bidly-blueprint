import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const portfolioMock = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  signedUrl: vi.fn(),
}));

vi.mock("@/lib/supplier-portfolio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supplier-portfolio")>();
  return {
    ...actual,
    uploadPortfolioImage: portfolioMock.upload,
    deletePortfolioImage: portfolioMock.remove,
    getPortfolioImageUrl: portfolioMock.signedUrl,
  };
});

import { SupplierPortfolioEditor } from "@/components/app/SupplierPortfolioEditor";

const oldPath = "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222-old.jpg";
const newPath = "11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333-new.jpg";

function Harness({ initialItems }: { initialItems: string[] }) {
  const [items, setItems] = useState(initialItems);
  return (
    <>
      <SupplierPortfolioEditor items={items} onChange={setItems} />
      <output data-testid="portfolio-values">{JSON.stringify(items)}</output>
    </>
  );
}

describe("SupplierPortfolioEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    portfolioMock.upload.mockResolvedValue(newPath);
    portfolioMock.remove.mockResolvedValue(undefined);
    portfolioMock.signedUrl.mockResolvedValue("https://signed.example.com/portfolio.jpg");
    const NativeURL = globalThis.URL;
    class TestURL extends NativeURL {
      static createObjectURL = vi.fn(() => "blob:portfolio-preview");
      static revokeObjectURL = vi.fn();
    }
    vi.stubGlobal("URL", TestURL);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uploads a valid JPG and shows a preview and success state", async () => {
    render(<Harness initialItems={[""]} />);
    fireEvent.click(screen.getByRole("button", { name: /העלאת תמונה/ }));

    const file = new File(["jpg"], "work.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("בחירת תמונה"), { target: { files: [file] } });

    await waitFor(() => expect(portfolioMock.upload).toHaveBeenCalledWith(file));
    expect(await screen.findByText("התמונה הועלתה בהצלחה.")).toBeTruthy();
    expect(screen.getByAltText("תצוגה מקדימה של תמונת תיק עבודות")).toBeTruthy();
    expect(screen.getByTestId("portfolio-values").textContent).toContain(newPath);
  });

  it("replaces an existing uploaded image and removes the previous object", async () => {
    render(<Harness initialItems={[oldPath]} />);
    expect(await screen.findByAltText("תצוגה מקדימה של תמונת תיק עבודות")).toBeTruthy();

    const replacement = new File(["png"], "new.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("החלפת תמונה"), {
      target: { files: [replacement] },
    });

    await waitFor(() => expect(portfolioMock.upload).toHaveBeenCalledWith(replacement));
    await waitFor(() => expect(portfolioMock.remove).toHaveBeenCalledWith(oldPath));
    expect(screen.getByTestId("portfolio-values").textContent).toContain(newPath);
  });

  it("preserves and safely opens an existing HTTPS portfolio URL", () => {
    render(<Harness initialItems={["https://example.com/portfolio"]} />);

    const link = screen.getByRole("link", { name: "פתיחת הקישור" });
    expect(link.getAttribute("href")).toBe("https://example.com/portfolio");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("shows exactly one source control at a time", () => {
    render(<Harness initialItems={[""]} />);

    expect(screen.getByLabelText("כתובת HTTPS")).toBeTruthy();
    expect(screen.queryByLabelText("בחירת תמונה")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /העלאת תמונה/ }));
    expect(screen.getByLabelText("בחירת תמונה")).toBeTruthy();
    expect(screen.queryByLabelText("כתובת HTTPS")).toBeNull();
  });

  it("removes an uploaded image from Storage before removing the item", async () => {
    render(<Harness initialItems={[oldPath]} />);

    fireEvent.click(screen.getByRole("button", { name: "הסרת פריט" }));

    await waitFor(() => expect(portfolioMock.remove).toHaveBeenCalledWith(oldPath));
    await waitFor(() => expect(screen.getByTestId("portfolio-values").textContent).toBe("[]"));
  });
});
