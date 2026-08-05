import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BidlyLogo } from "@/components/app/BidlyLogo";

describe("BidlyLogo", () => {
  afterEach(cleanup);

  it("renders the full accessible wordmark as an inline two-shape SVG", () => {
    const { container } = render(<BidlyLogo />);

    expect(screen.getByRole("img", { name: "Bidly" })).toBeTruthy();
    expect(screen.getByText("Bidly")).toBeTruthy();
    expect(container.querySelectorAll("svg path")).toHaveLength(2);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("img")).toBeNull();
  });

  it("supports a compact symbol-only version", () => {
    const { container } = render(<BidlyLogo compact />);

    expect(screen.getByRole("img", { name: "Bidly" })).toBeTruthy();
    expect(screen.queryByText("Bidly")).toBeNull();
    expect(container.querySelector("svg")?.classList.contains("h-7")).toBe(true);
  });

  it("keeps the full desktop wordmark while allowing a compact mobile presentation", () => {
    render(<BidlyLogo compactOnMobile />);

    const wordmark = screen.getByText("Bidly");
    expect(wordmark.className).toContain("hidden");
    expect(wordmark.className).toContain("sm:inline");
  });

  it("preserves the connected silhouette in a single-color treatment", () => {
    const { container } = render(<BidlyLogo monochrome />);
    const paths = container.querySelectorAll("svg path");

    expect(paths[0].getAttribute("class")).toBe(paths[1].getAttribute("class"));
    expect(paths[1].getAttribute("opacity")).toBe("0.62");
  });
});
