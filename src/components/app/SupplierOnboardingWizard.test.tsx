import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const onboardingMock = vi.hoisted(() => ({
  currentStage: 1,
  profile: {
    business_name: "עסק לדוגמה",
    business_type: "עצמאי",
    description: "תיאור עסק מלא שמסביר היטב את השירות.",
    base_city: "חיפה",
    service_mode: null as "on_site" | "remote" | "both" | null,
    max_travel_km: null as number | null,
    remote_available: null as boolean | null,
    service_area: "",
    starting_price_ils: null,
    years_experience: null,
    portfolio_links: [],
  },
  professionSelections: [] as Array<{ subcategory_id: string; is_primary: boolean }>,
  services: [] as Array<{ id: string; subcategory_id: string; name_he: string }>,
  selectedServices: [] as Array<{ service_id: string; subcategory_id: string }>,
  areas: [] as Array<{ id: string; name_he: string }>,
  selectedAreas: [] as string[],
  saveProfile: vi.fn(),
  autosaveProfile: vi.fn(),
  saveStage: vi.fn(),
  syncCategories: vi.fn(),
  syncProfessions: vi.fn(),
  syncServices: vi.fn(),
  syncAreas: vi.fn(),
  submitOnboarding: vi.fn(),
}));

vi.mock("@/lib/supplier-profile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supplier-profile")>();
  const query = (data: unknown) => ({
    data,
    error: null,
    isPending: false,
    refetch: vi.fn(),
  });
  const mutation = (mutateAsync: ReturnType<typeof vi.fn>, mutate = vi.fn()) => ({
    isPending: false,
    mutate,
    mutateAsync,
  });

  return {
    ...actual,
    useMySupplierProfile: () => query(onboardingMock.profile),
    useSupplierOnboardingState: () =>
      query({
        current_stage: onboardingMock.currentStage,
        eligibility_policy: "current",
        submitted_at: null,
      }),
    useCategoriesForSupplier: () => query([]),
    useProfessionsForSupplier: () => query([]),
    useServices: () => query(onboardingMock.services),
    useServiceAreas: () => query(onboardingMock.areas),
    useMySupplierCategories: () => query([]),
    useMySupplierProfessionSelections: () => query(onboardingMock.professionSelections),
    useMySupplierServices: () => query(onboardingMock.selectedServices),
    useMySupplierServiceAreas: () => query(onboardingMock.selectedAreas),
    useSaveSupplierProfile: () =>
      mutation(onboardingMock.saveProfile, onboardingMock.autosaveProfile),
    useSaveSupplierOnboardingStage: () => mutation(onboardingMock.saveStage),
    useSyncSupplierCategories: () => mutation(onboardingMock.syncCategories),
    useSyncSupplierSubcategories: () => mutation(onboardingMock.syncProfessions),
    useSyncSupplierServices: () => mutation(onboardingMock.syncServices),
    useSyncSupplierServiceAreas: () => mutation(onboardingMock.syncAreas),
    useSubmitSupplierOnboarding: () => mutation(onboardingMock.submitOnboarding),
  };
});

import { SupplierOnboardingWizard } from "@/components/app/SupplierOnboardingWizard";

describe("SupplierOnboardingWizard stage validation", () => {
  beforeEach(() => {
    onboardingMock.currentStage = 1;
    onboardingMock.profile = {
      business_name: "עסק לדוגמה",
      business_type: "עצמאי",
      description: "תיאור עסק מלא שמסביר היטב את השירות.",
      base_city: "חיפה",
      service_mode: null,
      max_travel_km: null,
      remote_available: null,
      service_area: "",
      starting_price_ils: null,
      years_experience: null,
      portfolio_links: [],
    };
    onboardingMock.professionSelections = [];
    onboardingMock.services = [];
    onboardingMock.selectedServices = [];
    onboardingMock.areas = [];
    onboardingMock.selectedAreas = [];
    vi.clearAllMocks();
    onboardingMock.saveProfile.mockResolvedValue({});
    onboardingMock.saveStage.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("advances a valid stage-1 profile while stage-4 fields are unset", async () => {
    render(<SupplierOnboardingWizard />);

    fireEvent.click(screen.getByRole("button", { name: /שמירה והמשך/ }));

    await waitFor(() => {
      expect(onboardingMock.saveProfile).toHaveBeenCalledTimes(1);
      expect(onboardingMock.saveStage).toHaveBeenCalledWith(2);
    });
    expect(screen.getByRole("heading", { name: "מקצוע וקטגוריה" })).toBeTruthy();
  });

  it("still blocks invalid visible stage-1 fields", async () => {
    onboardingMock.profile = {
      ...onboardingMock.profile,
      business_type: "",
    };
    render(<SupplierOnboardingWizard />);

    fireEvent.click(screen.getByRole("button", { name: /שמירה והמשך/ }));

    expect(await screen.findByText("יש להזין סוג עסק.")).toBeTruthy();
    expect(onboardingMock.saveProfile).not.toHaveBeenCalled();
    expect(onboardingMock.saveStage).not.toHaveBeenCalled();
  });

  it("still blocks stage 4 when delivery and coverage values are missing", async () => {
    onboardingMock.currentStage = 4;
    render(<SupplierOnboardingWizard />);

    fireEvent.click(screen.getByRole("button", { name: /שמירה והמשך/ }));

    expect(await screen.findByText("יש לבחור אופן מתן שירות.")).toBeTruthy();
    expect(screen.getByText("יש להזין מרחק נסיעה של 0–500 ק״מ.")).toBeTruthy();
    expect(screen.getByText("יש לציין זמינות לשירות מרחוק.")).toBeTruthy();
    expect(onboardingMock.saveProfile).not.toHaveBeenCalled();
    expect(onboardingMock.saveStage).not.toHaveBeenCalled();
  });

  it("moves back without validating or saving an invalid current stage", async () => {
    onboardingMock.currentStage = 3;
    onboardingMock.professionSelections = [{ subcategory_id: "profession-1", is_primary: true }];
    onboardingMock.services = [
      {
        id: "service-1",
        subcategory_id: "profession-1",
        name_he: "שירות לדוגמה",
      },
    ];
    render(<SupplierOnboardingWizard />);

    fireEvent.click(screen.getByRole("button", { name: "חזרה" }));

    expect(screen.getByRole("heading", { name: "מקצוע וקטגוריה" })).toBeTruthy();
    await waitFor(() => expect(onboardingMock.saveStage).toHaveBeenCalledWith(2));
    expect(onboardingMock.syncServices).not.toHaveBeenCalled();
  });

  it("advances stage 3 when the selected professions have no managed services", async () => {
    onboardingMock.currentStage = 3;
    onboardingMock.professionSelections = [{ subcategory_id: "profession-1", is_primary: true }];
    render(<SupplierOnboardingWizard />);

    expect(
      screen.getByText(
        "עדיין לא הוגדרו שירותים מנוהלים למקצועות שבחרתם. ניתן להמשיך ולהוסיף שירותים לאחר עדכון הקטלוג.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /שמירה והמשך/ }));

    await waitFor(() => expect(onboardingMock.saveStage).toHaveBeenCalledWith(4));
    expect(screen.getByRole("heading", { name: "אזורי שירות" })).toBeTruthy();
    expect(onboardingMock.syncServices).not.toHaveBeenCalled();
  });

  it("still requires a service selection when managed services are available", async () => {
    onboardingMock.currentStage = 3;
    onboardingMock.professionSelections = [{ subcategory_id: "profession-1", is_primary: true }];
    onboardingMock.services = [
      {
        id: "service-1",
        subcategory_id: "profession-1",
        name_he: "שירות לדוגמה",
      },
    ];
    render(<SupplierOnboardingWizard />);

    fireEvent.click(screen.getByRole("button", { name: /שמירה והמשך/ }));

    expect((await screen.findByRole("alert")).textContent).toContain("יש לבחור לפחות שירות אחד.");
    expect(onboardingMock.syncServices).not.toHaveBeenCalled();
    expect(onboardingMock.saveStage).not.toHaveBeenCalled();
  });

  it("advances stage 4 when no managed service areas are available", async () => {
    onboardingMock.currentStage = 4;
    onboardingMock.profile = {
      ...onboardingMock.profile,
      service_mode: "on_site",
      max_travel_km: 25,
      remote_available: false,
    };
    render(<SupplierOnboardingWizard />);

    expect(
      screen.getByText(
        "עדיין לא הוגדרו אזורי שירות מנוהלים. ניתן להשלים את ההרשמה ולעדכן אזורי שירות לאחר עדכון הקטלוג.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /שמירה והמשך/ }));

    await waitFor(() => {
      expect(onboardingMock.saveProfile).toHaveBeenCalledTimes(1);
      expect(onboardingMock.saveStage).toHaveBeenCalledWith(5);
    });
    expect(screen.getByRole("heading", { name: "תיק עבודות" })).toBeTruthy();
    expect(onboardingMock.syncAreas).not.toHaveBeenCalled();
  });

  it("still requires an area selection when managed areas are available", async () => {
    onboardingMock.currentStage = 4;
    onboardingMock.profile = {
      ...onboardingMock.profile,
      service_mode: "on_site",
      max_travel_km: 25,
      remote_available: false,
    };
    onboardingMock.areas = [{ id: "area-1", name_he: "אזור חיפה" }];
    render(<SupplierOnboardingWizard />);

    fireEvent.click(screen.getByRole("button", { name: /שמירה והמשך/ }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "יש לבחור לפחות אזור שירות אחד.",
    );
    expect(onboardingMock.saveProfile).not.toHaveBeenCalled();
    expect(onboardingMock.syncAreas).not.toHaveBeenCalled();
    expect(onboardingMock.saveStage).not.toHaveBeenCalled();
  });

  it("shows the backend diagnostic when final submission fails", async () => {
    onboardingMock.currentStage = 6;
    onboardingMock.submitOnboarding.mockRejectedValue({
      code: "22000",
      message: "Supplier onboarding is incomplete",
      details: "A managed selection is missing",
      hint: "Review active taxonomy selections",
    });
    render(<SupplierOnboardingWizard />);

    fireEvent.click(screen.getByRole("button", { name: "שליחת הפרופיל" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("קוד 22000");
    expect(alert.textContent).toContain("Supplier onboarding is incomplete");
    expect(alert.textContent).toContain("A managed selection is missing");
    expect(alert.textContent).toContain("Review active taxonomy selections");
  });
});
