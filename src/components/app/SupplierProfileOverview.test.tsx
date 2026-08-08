import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  profile: vi.fn(),
  onboarding: vi.fn(),
  categories: vi.fn(),
  professions: vi.fn(),
  services: vi.fn(),
  areas: vi.fn(),
  myCategories: vi.fn(),
  myProfessions: vi.fn(),
  myServices: vi.fn(),
  myAreas: vi.fn(),
}));

vi.mock("@/lib/supplier-profile", () => ({
  useMySupplierProfile: hooks.profile,
  useSupplierOnboardingState: hooks.onboarding,
  useCategoriesForSupplier: hooks.categories,
  useProfessionsForSupplier: hooks.professions,
  useServices: hooks.services,
  useServiceAreas: hooks.areas,
  useMySupplierCategories: hooks.myCategories,
  useMySupplierProfessionSelections: hooks.myProfessions,
  useMySupplierServices: hooks.myServices,
  useMySupplierServiceAreas: hooks.myAreas,
}));

vi.mock("./SupplierPortfolioGallery", () => ({
  SupplierPortfolioGallery: ({ items }: { items: string[] }) => (
    <div data-testid="portfolio-gallery">{items.join(",")}</div>
  ),
}));

import { SupplierProfileOverview } from "./SupplierProfileOverview";

const profile = {
  user_id: "supplier-1",
  business_name: "חשמל הצפון",
  business_type: "עוסק מורשה",
  description: "שירותי חשמל מקצועיים לבתים ולעסקים.",
  base_city: "חיפה",
  service_mode: "both",
  max_travel_km: 40,
  remote_available: true,
  service_area: "",
  starting_price_ils: 250,
  years_experience: 8,
  portfolio_links: ["https://portfolio.example/work"],
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

function query(data: unknown) {
  return { data, error: null, isPending: false, refetch: vi.fn() };
}

describe("SupplierProfileOverview", () => {
  beforeEach(() => {
    hooks.profile.mockReturnValue(query(profile));
    hooks.onboarding.mockReturnValue(
      query({ eligibility_policy: "current", submitted_at: "2026-08-01T00:00:00Z" }),
    );
    hooks.categories.mockReturnValue(query([{ id: "category-1", name_he: "חשמל" }]));
    hooks.professions.mockReturnValue(query([{ id: "profession-1", name_he: "חשמלאי" }]));
    hooks.services.mockReturnValue(query([{ id: "service-1", name_he: "תיקון קצר" }]));
    hooks.areas.mockReturnValue(query([{ id: "area-1", name_he: "חיפה והקריות" }]));
    hooks.myCategories.mockReturnValue(query(["category-1"]));
    hooks.myProfessions.mockReturnValue(
      query([{ subcategory_id: "profession-1", is_primary: true }]),
    );
    hooks.myServices.mockReturnValue(
      query([{ service_id: "service-1", subcategory_id: "profession-1" }]),
    );
    hooks.myAreas.mockReturnValue(query(["area-1"]));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the saved professional identity, taxonomy, and portfolio", () => {
    render(<SupplierProfileOverview />);

    expect(screen.getByRole("heading", { name: "חשמל הצפון" })).toBeTruthy();
    expect(screen.getByText("פרופיל פעיל")).toBeTruthy();
    expect(screen.getByText("עוסק מורשה")).toBeTruthy();
    expect(screen.getByText("חיפה")).toBeTruthy();
    expect(screen.getByText("חשמלאי · ראשי")).toBeTruthy();
    expect(screen.getByText("תיקון קצר")).toBeTruthy();
    expect(screen.getByText("חיפה והקריות")).toBeTruthy();
    expect(screen.getByTestId("portfolio-gallery").textContent).toContain("portfolio.example");
    expect(screen.getByRole("link", { name: "עריכת הפרופיל" }).getAttribute("href")).toBe(
      "#profile-editor",
    );
  });

  it("omits the optional About section when no optional data is stored", () => {
    hooks.profile.mockReturnValue(
      query({
        ...profile,
        description: "",
        years_experience: null,
        starting_price_ils: null,
        portfolio_links: [],
      }),
    );

    render(<SupplierProfileOverview />);

    expect(screen.queryByRole("heading", { name: "אודות העסק" })).toBeNull();
    expect(screen.getByTestId("portfolio-gallery").textContent).toBe("");
  });
});
