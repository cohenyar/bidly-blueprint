import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { isPortfolioStoragePath, isValidHttpsPortfolioUrl } from "@/lib/supplier-portfolio";

export type SupplierProfileRow = Database["public"]["Tables"]["supplier_profiles"]["Row"];
export type SupplierOnboardingState =
  Database["public"]["Tables"]["supplier_onboarding_state"]["Row"];
export type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
export type ServiceAreaRow = Database["public"]["Tables"]["service_areas"]["Row"];

export type SupplierProfileInput = {
  business_name: string;
  business_type: string;
  description: string;
  base_city: string;
  service_mode: "on_site" | "remote" | "both" | "";
  max_travel_km: number | null;
  remote_available: boolean | null;
  service_area: string;
  starting_price_ils: number | null;
  years_experience: number | null;
  portfolio_links: string[];
};

export type SupplierProfileErrors = Partial<Record<keyof SupplierProfileInput, string>>;

export function formatSupplierOnboardingError(error: unknown): string {
  const fallback = "לא ניתן להשלים את ההצטרפות. בדקו שכל השדות והבחירות נשמרו.";
  if (!error || typeof error !== "object") return fallback;

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  const details = [candidate.message, candidate.details, candidate.hint]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
  const code =
    typeof candidate.code === "string" && candidate.code.trim()
      ? `קוד ${candidate.code.trim()}`
      : null;
  const diagnostic = [code, ...details].filter(Boolean).join(" · ");

  return diagnostic ? `${fallback} פרטי השגיאה: ${diagnostic}` : fallback;
}

export function validateSupplierProfile(
  input: SupplierProfileInput,
  requireCurrentFields = false,
): SupplierProfileErrors {
  const errors: SupplierProfileErrors = {};
  const name = input.business_name.trim();
  if (name.length < 2 || name.length > 80) {
    errors.business_name = "שם העסק חייב להכיל 2–80 תווים.";
  }
  if (input.description.length > 1000) {
    errors.description = "התיאור מוגבל ל־1,000 תווים.";
  } else if (requireCurrentFields && input.description.trim().length < 20) {
    errors.description = "יש להזין תיאור עסק של 20 תווים לפחות.";
  }
  if (input.service_area.length > 200) {
    errors.service_area = "אזור השירות הישן מוגבל ל־200 תווים.";
  }
  if (requireCurrentFields) {
    if (input.business_type.trim().length < 2) {
      errors.business_type = "יש להזין סוג עסק.";
    }
    if (input.base_city.trim().length < 2) {
      errors.base_city = "יש להזין עיר בסיס.";
    }
    if (!input.service_mode) {
      errors.service_mode = "יש לבחור אופן מתן שירות.";
    }
    if (
      input.service_mode !== "remote" &&
      (input.max_travel_km === null ||
        !Number.isInteger(input.max_travel_km) ||
        input.max_travel_km < 0 ||
        input.max_travel_km > 500)
    ) {
      errors.max_travel_km = "יש להזין מרחק נסיעה של 0–500 ק״מ.";
    }
    if (input.remote_available === null) {
      errors.remote_available = "יש לציין זמינות לשירות מרחוק.";
    } else if (
      (input.service_mode === "remote" || input.service_mode === "both") &&
      !input.remote_available
    ) {
      errors.remote_available = "שירות מרחוק מחייב סימון זמינות מרחוק.";
    }
  }
  if (
    input.starting_price_ils !== null &&
    (!Number.isInteger(input.starting_price_ils) ||
      input.starting_price_ils < 0 ||
      input.starting_price_ils > 2_147_483_647)
  ) {
    errors.starting_price_ils = "מחיר ההתחלה חייב להיות מספר שלם ולא שלילי.";
  }
  if (
    input.years_experience !== null &&
    (!Number.isInteger(input.years_experience) ||
      input.years_experience < 0 ||
      input.years_experience > 100)
  ) {
    errors.years_experience = "שנות הניסיון חייבות להיות בטווח 0–100.";
  }
  if (input.portfolio_links.length > 5) {
    errors.portfolio_links = "ניתן לשמור עד חמישה קישורי תיק עבודות.";
  }
  for (const link of input.portfolio_links) {
    if (!isValidHttpsPortfolioUrl(link) && !isPortfolioStoragePath(link)) {
      errors.portfolio_links = "יש להזין קישור HTTPS תקין או להעלות תמונה נתמכת.";
      break;
    }
  }
  return errors;
}

async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

function invalidateSupplierQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["supplier_profile"] });
  void queryClient.invalidateQueries({ queryKey: ["supplier_categories"] });
  void queryClient.invalidateQueries({ queryKey: ["supplier_subcategories"] });
  void queryClient.invalidateQueries({ queryKey: ["supplier_services"] });
  void queryClient.invalidateQueries({ queryKey: ["supplier_service_areas"] });
  void queryClient.invalidateQueries({ queryKey: ["supplier_onboarding"] });
  void queryClient.invalidateQueries({ queryKey: ["supplier-matched-requests", "active"] });
}

export function useMySupplierProfile() {
  return useQuery({
    queryKey: ["supplier_profile", "me"],
    queryFn: async (): Promise<SupplierProfileRow | null> => {
      const { data, error } = await supabase.from("supplier_profiles").select("*").maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useSupplierOnboardingState() {
  return useQuery({
    queryKey: ["supplier_onboarding", "me"],
    queryFn: async (): Promise<SupplierOnboardingState | null> => {
      const { data, error } = await supabase
        .from("supplier_onboarding_state")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useSaveSupplierProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SupplierProfileInput) => {
      const userId = await requireUserId();
      const { data, error } = await supabase
        .from("supplier_profiles")
        .upsert(
          {
            user_id: userId,
            business_name: input.business_name.trim(),
            business_type: input.business_type.trim() || null,
            description: input.description.trim(),
            base_city: input.base_city.trim() || null,
            service_mode: input.service_mode || null,
            max_travel_km: input.service_mode === "remote" ? null : input.max_travel_km,
            remote_available: input.remote_available,
            service_area: input.service_area.trim(),
            starting_price_ils: input.starting_price_ils,
            years_experience: input.years_experience,
            portfolio_links: input.portfolio_links.map((link) => link.trim()),
          },
          { onConflict: "user_id" },
        )
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateSupplierQueries(queryClient),
  });
}

export function useCategoriesForSupplier() {
  return useQuery({
    queryKey: ["categories", "supplier-onboarding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("name_he");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProfessionsForSupplier() {
  return useQuery({
    queryKey: ["subcategories", "supplier-onboarding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("name_he");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useServices() {
  return useQuery({
    queryKey: ["services", "active"],
    queryFn: async (): Promise<ServiceRow[]> => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("name_he");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useServiceAreas() {
  return useQuery({
    queryKey: ["service_areas", "active"],
    queryFn: async (): Promise<ServiceAreaRow[]> => {
      const { data, error } = await supabase
        .from("service_areas")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("name_he");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMySupplierCategories() {
  return useQuery({
    queryKey: ["supplier_categories", "me"],
    queryFn: async () => {
      const { data, error } = await supabase.from("supplier_categories").select("category_id");
      if (error) throw error;
      return (data ?? []).map((row) => row.category_id);
    },
  });
}

export function useMySupplierProfessionSelections() {
  return useQuery({
    queryKey: ["supplier_subcategories", "me", "selections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_subcategories")
        .select("subcategory_id,is_primary");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMySupplierSubcategories() {
  return useQuery({
    queryKey: ["supplier_subcategories", "me"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_subcategories")
        .select("subcategory_id");
      if (error) throw error;
      return (data ?? []).map((row) => row.subcategory_id);
    },
  });
}

export function useMySupplierServices() {
  return useQuery({
    queryKey: ["supplier_services", "me"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_services")
        .select("service_id,subcategory_id");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMySupplierServiceAreas() {
  return useQuery({
    queryKey: ["supplier_service_areas", "me"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_service_areas")
        .select("service_area_id");
      if (error) throw error;
      return (data ?? []).map((row) => row.service_area_id);
    },
  });
}

export function useSyncSupplierCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ selected, current }: { selected: string[]; current: string[] }) => {
      const userId = await requireUserId();
      const selectedSet = new Set(selected);
      const currentSet = new Set(current);
      const toRemove = current.filter((id) => !selectedSet.has(id));
      const toAdd = selected.filter((id) => !currentSet.has(id));
      if (toRemove.length) {
        const { error } = await supabase
          .from("supplier_categories")
          .delete()
          .eq("supplier_id", userId)
          .in("category_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase
          .from("supplier_categories")
          .insert(toAdd.map((categoryId) => ({ supplier_id: userId, category_id: categoryId })));
        if (error) throw error;
      }
    },
    onSuccess: () => invalidateSupplierQueries(queryClient),
  });
}

export function useSyncSupplierSubcategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      selected,
      current,
      primaryId,
    }: {
      selected: string[];
      current: string[];
      primaryId: string | null;
    }) => {
      const userId = await requireUserId();
      const selectedSet = new Set(selected);
      const currentSet = new Set(current);
      const toRemove = current.filter((id) => !selectedSet.has(id));
      const toAdd = selected.filter((id) => !currentSet.has(id));

      if (toRemove.length) {
        const { error } = await supabase
          .from("supplier_subcategories")
          .delete()
          .eq("supplier_id", userId)
          .in("subcategory_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase.from("supplier_subcategories").insert(
          toAdd.map((subcategoryId) => ({
            supplier_id: userId,
            subcategory_id: subcategoryId,
            is_primary: false,
          })),
        );
        if (error) throw error;
      }

      const { error: clearError } = await supabase
        .from("supplier_subcategories")
        .update({ is_primary: false })
        .eq("supplier_id", userId)
        .eq("is_primary", true);
      if (clearError) throw clearError;

      if (primaryId && selectedSet.has(primaryId)) {
        const { error } = await supabase
          .from("supplier_subcategories")
          .update({ is_primary: true })
          .eq("supplier_id", userId)
          .eq("subcategory_id", primaryId);
        if (error) throw error;
      }
    },
    onSuccess: () => invalidateSupplierQueries(queryClient),
  });
}

export function useSyncSupplierServices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      selected,
      current,
      services,
    }: {
      selected: string[];
      current: string[];
      services: ServiceRow[];
    }) => {
      const userId = await requireUserId();
      const selectedSet = new Set(selected);
      const currentSet = new Set(current);
      const toRemove = current.filter((id) => !selectedSet.has(id));
      const toAdd = selected.filter((id) => !currentSet.has(id));
      if (toRemove.length) {
        const { error } = await supabase
          .from("supplier_services")
          .delete()
          .eq("supplier_id", userId)
          .in("service_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const rows = toAdd.map((serviceId) => {
          const service = services.find((candidate) => candidate.id === serviceId);
          if (!service) throw new Error("Unknown service");
          return {
            supplier_id: userId,
            service_id: serviceId,
            subcategory_id: service.subcategory_id,
          };
        });
        const { error } = await supabase.from("supplier_services").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => invalidateSupplierQueries(queryClient),
  });
}

export function useSyncSupplierServiceAreas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ selected, current }: { selected: string[]; current: string[] }) => {
      const userId = await requireUserId();
      const selectedSet = new Set(selected);
      const currentSet = new Set(current);
      const toRemove = current.filter((id) => !selectedSet.has(id));
      const toAdd = selected.filter((id) => !currentSet.has(id));
      if (toRemove.length) {
        const { error } = await supabase
          .from("supplier_service_areas")
          .delete()
          .eq("supplier_id", userId)
          .in("service_area_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase
          .from("supplier_service_areas")
          .insert(
            toAdd.map((serviceAreaId) => ({ supplier_id: userId, service_area_id: serviceAreaId })),
          );
        if (error) throw error;
      }
    },
    onSuccess: () => invalidateSupplierQueries(queryClient),
  });
}

export function useSaveSupplierOnboardingStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (currentStage: number) => {
      const userId = await requireUserId();
      const { error } = await supabase
        .from("supplier_onboarding_state")
        .update({ current_stage: currentStage })
        .eq("supplier_id", userId);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["supplier_onboarding"] }),
  });
}

export function useSubmitSupplierOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("submit_supplier_onboarding");
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateSupplierQueries(queryClient),
  });
}

export function useDismissSupplierEnhancementNotice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const userId = await requireUserId();
      const { error } = await supabase
        .from("supplier_onboarding_state")
        .update({ notice_dismissed_at: new Date().toISOString() })
        .eq("supplier_id", userId);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["supplier_onboarding"] }),
  });
}

export type CompletionStatus = {
  hasProfile: boolean;
  hasBusinessName: boolean;
  hasDescription: boolean;
  hasBusinessDetails: boolean;
  hasServiceArea: boolean;
  hasCategories: boolean;
  hasSubcategories: boolean;
  hasServices: boolean;
  hasStructuredAreas: boolean;
  hasAvailableServices: boolean;
  hasAvailableServiceAreas: boolean;
  isSubmitted: boolean;
  isLegacy: boolean;
  percent: number;
  items: CompletionItem[];
};

export type CompletionItem = {
  id:
    | "business-name"
    | "description"
    | "business-details"
    | "categories"
    | "primary-profession"
    | "services"
    | "service-areas"
    | "submitted";
  label: string;
  complete: boolean;
};

export type CompletionCatalogState = {
  hasPrimaryProfession: boolean;
  hasAvailableServices: boolean;
  hasAvailableServiceAreas: boolean;
};

export function computeCompletion(
  profile: SupplierProfileRow | null,
  categoryIds: string[],
  subcategoryIds: string[],
  serviceIds: string[] = [],
  areaIds: string[] = [],
  onboarding: SupplierOnboardingState | null = null,
  catalogState: CompletionCatalogState = {
    hasPrimaryProfession: subcategoryIds.length > 0,
    hasAvailableServices: true,
    hasAvailableServiceAreas: true,
  },
): CompletionStatus {
  const isLegacy = onboarding?.eligibility_policy === "legacy";
  const businessNameLength = profile?.business_name.trim().length ?? 0;
  const descriptionLength = profile?.description.trim().length ?? 0;
  const businessTypeLength = profile?.business_type?.trim().length ?? 0;
  const baseCityLength = profile?.base_city?.trim().length ?? 0;
  const hasBusinessName = businessNameLength >= 2 && businessNameLength <= 80;
  const hasDescription = descriptionLength >= 20 && descriptionLength <= 1000;
  const hasBusinessDetails =
    businessTypeLength >= 2 &&
    businessTypeLength <= 80 &&
    baseCityLength >= 2 &&
    baseCityLength <= 80 &&
    (profile?.service_mode === "on_site" ||
      profile?.service_mode === "remote" ||
      profile?.service_mode === "both") &&
    profile.remote_available !== null &&
    (profile.service_mode === "remote" ||
      (profile.max_travel_km !== null &&
        profile.max_travel_km >= 0 &&
        profile.max_travel_km <= 500)) &&
    (profile.service_mode === "on_site" || profile.remote_available);
  const hasServiceArea = (profile?.service_area.trim().length ?? 0) >= 2;
  const hasCategories = categoryIds.length > 0;
  const hasSubcategories = subcategoryIds.length > 0 && catalogState.hasPrimaryProfession;
  const hasServices = !catalogState.hasAvailableServices || serviceIds.length > 0;
  const hasStructuredAreas =
    profile?.service_mode === "remote" ||
    !catalogState.hasAvailableServiceAreas ||
    areaIds.length > 0;
  const isSubmitted =
    onboarding?.eligibility_policy === "current" && Boolean(onboarding.submitted_at);
  const items: CompletionItem[] = [
    { id: "business-name", label: "שם עסק", complete: hasBusinessName },
    { id: "description", label: "תיאור העסק", complete: hasDescription },
    {
      id: "business-details",
      label: "סוג עסק, עיר בסיס ואופן שירות",
      complete: hasBusinessDetails,
    },
    { id: "categories", label: "לפחות קטגוריה פעילה אחת", complete: hasCategories },
    { id: "primary-profession", label: "מקצוע ראשי פעיל", complete: hasSubcategories },
    {
      id: "services",
      label: catalogState.hasAvailableServices
        ? "לפחות שירות פעיל אחד"
        : "אין שירותים זמינים בקטלוג — לא נדרשת בחירה",
      complete: hasServices,
    },
  ];

  if (profile?.service_mode === "on_site" || profile?.service_mode === "both") {
    items.push({
      id: "service-areas",
      label: catalogState.hasAvailableServiceAreas
        ? "לפחות אזור שירות פעיל אחד"
        : "אין אזורי שירות זמינים — לא נדרשת בחירה",
      complete: hasStructuredAreas,
    });
  }

  items.push({
    id: "submitted",
    label: "בדיקה ושליחת הפרופיל",
    complete: isSubmitted,
  });

  return {
    hasProfile: profile !== null,
    hasBusinessName,
    hasDescription,
    hasBusinessDetails,
    hasServiceArea,
    hasCategories,
    hasSubcategories,
    hasServices,
    hasStructuredAreas,
    hasAvailableServices: catalogState.hasAvailableServices,
    hasAvailableServiceAreas: catalogState.hasAvailableServiceAreas,
    isSubmitted,
    isLegacy,
    percent: items.length
      ? Math.round((items.filter((item) => item.complete).length / items.length) * 100)
      : 0,
    items,
  };
}
