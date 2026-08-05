import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const categoryQuery = vi.hoisted(() => ({
  current: {
    data: [] as Array<{
      id: string;
      slug: string;
      name_he: string;
      icon: string | null;
      is_active: boolean;
    }>,
    isLoading: false,
    isError: false,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => ({ options: config }),
  Link: ({
    children,
    to,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/taxonomy", () => ({
  useActiveCategories: () => categoryQuery.current,
}));

import { LandingPage, SiteHeader } from "@/routes/index";

describe("public Bidly homepage", () => {
  beforeEach(() => {
    categoryQuery.current = { data: [], isLoading: false, isError: false };
  });

  afterEach(cleanup);

  it("keeps logged-out navigation and both audience CTAs on existing routes", () => {
    render(<LandingPage />);

    expect(screen.getByRole("link", { name: "כניסה" }).getAttribute("href")).toBe("/login");
    expect(screen.getAllByRole("link", { name: "הרשמה" })[0].getAttribute("href")).toBe(
      "/register",
    );
    expect(screen.getAllByRole("link", { name: "פרסום בקשה" })[0].getAttribute("href")).toBe(
      "/register",
    );
    expect(screen.getAllByRole("link", { name: "אני נותן שירות" })[0].getAttribute("href")).toBe(
      "/register",
    );
  });

  it("shows active taxonomy categories and omits inactive rows", () => {
    categoryQuery.current = {
      data: [
        {
          id: "active-1",
          slug: "digital-marketing",
          name_he: "דיגיטל ושיווק",
          icon: null,
          is_active: true,
        },
        {
          id: "inactive-1",
          slug: "inactive",
          name_he: "קטגוריה לא פעילה",
          icon: null,
          is_active: false,
        },
      ],
      isLoading: false,
      isError: false,
    };

    render(<LandingPage />);

    const section = screen.getByRole("region", { name: "הקטלוג הפעיל ב־Bidly" });
    expect(within(section).getByText("דיגיטל ושיווק")).toBeTruthy();
    expect(within(section).queryByText("קטגוריה לא פעילה")).toBeNull();
  });

  it("keeps the homepage intact when the category query fails", () => {
    categoryQuery.current = { data: [], isLoading: false, isError: true };

    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "מוצאים את נותן השירות המתאים — בלי לרדוף אחרי הצעות",
      }),
    ).toBeTruthy();
    expect(screen.queryByRole("region", { name: "הקטלוג הפעיל ב־Bidly" })).toBeNull();
  });

  it("uses RTL mobile-first structure without fake statistics or testimonials", () => {
    const { container } = render(
      <div style={{ width: 320 }}>
        <LandingPage />
      </div>,
    );

    const page = container.querySelector("[dir='rtl']");
    expect(page).toBeTruthy();
    expect(
      screen
        .getAllByRole("link", { name: "פרסום בקשה" })
        .some((link) => link.className.includes("w-full")),
    ).toBe(true);
    expect(container.textContent).not.toMatch(/1,200|4\.8|24 דק|לקוחות ממליצים|סיפורי הצלחה/);
  });

  it("shows the inline Bidly identity in the public header", () => {
    const { container } = render(<SiteHeader />);

    expect(screen.getByRole("img", { name: "Bidly" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Bidly — דף הבית" }).getAttribute("href")).toBe("/");
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });
});
