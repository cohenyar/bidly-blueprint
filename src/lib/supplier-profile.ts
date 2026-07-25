import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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

const URL_RE = /^https?:\/\/\S+$/i;

export type SupplierProfileErrors = Partial<Record<keyof SupplierProfileInput, string>>;

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
    if (link.length > 500 || !URL_RE.test(link)) {
      errors.portfolio_links = "כל קישור חייב להיות כתובת HTTP(S) תקינה.";
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
  hasServiceArea: boolean;
  hasCategories: boolean;
  hasSubcategories: boolean;
  hasServices: boolean;
  hasStructuredAreas: boolean;
  isSubmitted: boolean;
  isLegacy: boolean;
  percent: number;
};

export function computeCompletion(
  profile: SupplierProfileRow | null,
  categoryIds: string[],
  subcategoryIds: string[],
  serviceIds: string[] = [],
  areaIds: string[] = [],
  onboarding: SupplierOnboardingState | null = null,
): CompletionStatus {
  const isLegacy = onboarding?.eligibility_policy === "legacy";
  const hasBusinessName = (profile?.business_name.trim().length ?? 0) >= 2;
  const hasDescription = (profile?.description.trim().length ?? 0) >= 20;
  const hasServiceArea = (profile?.service_area.trim().length ?? 0) >= 2;
  const hasCategories = categoryIds.length > 0;
  const hasSubcategories = subcategoryIds.length > 0;
  const hasServices = serviceIds.length > 0;
  const hasStructuredAreas = profile?.service_mode === "remote" || areaIds.length > 0;
  const isSubmitted =
    onboarding?.eligibility_policy === "current" && Boolean(onboarding.submitted_at);
  const checks = [
    hasBusinessName,
    hasDescription,
    Boolean(profile?.business_type && profile.base_city && profile.service_mode),
    hasCategories,
    hasSubcategories,
    hasServices,
    hasStructuredAreas,
    isSubmitted,
  ];
  return {
    hasProfile: profile !== null,
    hasBusinessName,
    hasDescription,
    hasServiceArea,
    hasCategories,
    hasSubcategories,
    hasServices,
    hasStructuredAreas,
    isSubmitted,
    isLegacy,
    percent: Math.round((checks.filter(Boolean).length / checks.length) * 100),
  };
}
