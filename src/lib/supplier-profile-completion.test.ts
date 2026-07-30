import { describe, expect, it } from "vitest";

import {
  computeCompletion,
  type SupplierOnboardingState,
  type SupplierProfileRow,
} from "@/lib/supplier-profile";

const profile: SupplierProfileRow = {
  user_id: "00000000-0000-4000-8000-000000000001",
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
  created_at: "2026-07-30T00:00:00.000Z",
  updated_at: "2026-07-30T00:00:00.000Z",
};

const submitted: SupplierOnboardingState = {
  supplier_id: profile.user_id,
  current_stage: 6,
  eligibility_policy: "current",
  submitted_at: "2026-07-30T00:00:00.000Z",
  notice_dismissed_at: null,
  created_at: "2026-07-30T00:00:00.000Z",
  updated_at: "2026-07-30T00:00:00.000Z",
};

type CompletionOptions = {
  selectedServices?: string[];
  selectedAreas?: string[];
  hasAvailableServices: boolean;
  hasAvailableServiceAreas: boolean;
  serviceMode?: "on_site" | "remote" | "both";
};

function completion({
  selectedServices = [] as string[],
  selectedAreas = [] as string[],
  hasAvailableServices,
  hasAvailableServiceAreas,
  serviceMode = "on_site" as "on_site" | "remote" | "both",
}: CompletionOptions) {
  return computeCompletion(
    {
      ...profile,
      service_mode: serviceMode,
      max_travel_km: serviceMode === "remote" ? null : 25,
      remote_available: serviceMode === "on_site" ? false : true,
    },
    ["category-1"],
    ["profession-1"],
    selectedServices,
    selectedAreas,
    submitted,
    {
      hasPrimaryProfession: true,
      hasAvailableServices,
      hasAvailableServiceAreas,
    },
  );
}

describe("supplier profile completion applicability", () => {
  it("satisfies the Service requirement when selected professions have no active Services", () => {
    const status = completion({
      hasAvailableServices: false,
      hasAvailableServiceAreas: false,
    });

    expect(status.hasServices).toBe(true);
    expect(status.items.find((item) => item.id === "services")).toEqual({
      id: "services",
      label: "אין שירותים זמינים בקטלוג — לא נדרשת בחירה",
      complete: true,
    });
  });

  it("requires a valid selection when active Services are available", () => {
    const status = completion({
      hasAvailableServices: true,
      hasAvailableServiceAreas: false,
    });

    expect(status.hasServices).toBe(false);
    expect(status.percent).toBeLessThan(100);
  });

  it("satisfies on-site coverage when no active Service Areas exist", () => {
    const status = completion({
      selectedServices: ["service-1"],
      hasAvailableServices: true,
      hasAvailableServiceAreas: false,
    });

    expect(status.hasStructuredAreas).toBe(true);
    expect(status.items.find((item) => item.id === "service-areas")?.label).toBe(
      "אין אזורי שירות זמינים — לא נדרשת בחירה",
    );
  });

  it("requires an active selected Service Area when the catalog offers Areas", () => {
    const status = completion({
      selectedServices: ["service-1"],
      hasAvailableServices: true,
      hasAvailableServiceAreas: true,
    });

    expect(status.hasStructuredAreas).toBe(false);
    expect(status.percent).toBeLessThan(100);
  });

  it("does not add an Area requirement for a remote Supplier", () => {
    const status = completion({
      selectedServices: ["service-1"],
      hasAvailableServices: true,
      hasAvailableServiceAreas: true,
      serviceMode: "remote",
    });

    expect(status.hasStructuredAreas).toBe(true);
    expect(status.items.some((item) => item.id === "service-areas")).toBe(false);
  });

  it("reports 100% when every applicable requirement is complete", () => {
    const status = completion({
      selectedServices: [],
      selectedAreas: [],
      hasAvailableServices: false,
      hasAvailableServiceAreas: false,
    });

    expect(status.items.every((item) => item.complete)).toBe(true);
    expect(status.percent).toBe(100);
  });
});
