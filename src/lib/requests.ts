import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type RequestRow = Database["public"]["Tables"]["requests"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type SubcategoryRow = Database["public"]["Tables"]["subcategories"]["Row"];
export type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
export type ServiceAreaRow = Database["public"]["Tables"]["service_areas"]["Row"];
export type BudgetType = Database["public"]["Enums"]["budget_type"];
export type RequestStatus = Database["public"]["Enums"]["request_status"];
export type RequestDeliveryMode = "on_site" | "remote";

export type RequestWithCategory = RequestRow & {
  category: Pick<CategoryRow, "id" | "slug" | "name_he"> | null;
  subcategory: Pick<SubcategoryRow, "id" | "slug" | "name_he"> | null;
  service: Pick<ServiceRow, "id" | "slug" | "name_he"> | null;
  service_area: Pick<ServiceAreaRow, "id" | "slug" | "name_he"> | null;
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  open: "פעילה",
  awarded: "נבחר נותן שירות",
  closed: "סגורה",
  cancelled: "בוטלה",
};

export const REQUEST_STATUS_TONE: Record<
  RequestStatus,
  "success" | "primary" | "muted" | "danger"
> = {
  open: "success",
  awarded: "primary",
  closed: "muted",
  cancelled: "danger",
};

const requestProjection =
  "*, category:categories(id, slug, name_he), subcategory:subcategories(id, slug, name_he), service:services(id, slug, name_he), service_area:service_areas(id, slug, name_he)";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name_he, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubcategories(categoryId: string | null) {
  return useQuery({
    queryKey: ["subcategories", categoryId],
    enabled: Boolean(categoryId),
    queryFn: async () => {
      if (!categoryId) return [];
      const { data, error } = await supabase
        .from("subcategories")
        .select("id, slug, name_he, sort_order, is_active, category_id")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAllSubcategories() {
  return useQuery({
    queryKey: ["subcategories", "all-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("id, slug, name_he, sort_order, is_active, category_id")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useServicesForProfession(subcategoryId: string | null) {
  return useQuery({
    queryKey: ["services", subcategoryId],
    enabled: Boolean(subcategoryId),
    queryFn: async () => {
      if (!subcategoryId) return [];
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("subcategory_id", subcategoryId)
        .eq("is_active", true)
        .order("sort_order")
        .order("name_he");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRequestServiceAreas() {
  return useQuery({
    queryKey: ["service-areas", "request-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_areas")
        .select("id, slug, name_he, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order")
        .order("name_he");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyRequests() {
  return useQuery({
    queryKey: ["my-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select(requestProjection)
        .not("published_at", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RequestWithCategory[];
    },
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ["request", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select(requestProjection)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as RequestWithCategory | null;
    },
  });
}

export function useAcquireRequestDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("get_or_create_request_draft");
      if (error) throw error;
      return data;
    },
    onSuccess: (requestId) => {
      void queryClient.invalidateQueries({ queryKey: ["request", requestId] });
      void queryClient.invalidateQueries({ queryKey: ["request-draft"] });
    },
  });
}

export type RequestDraftInput = {
  title: string;
  description: string;
  city: string;
  category_id: string;
  subcategory_id: string;
  service_id: string;
  missing_service_text: string;
  delivery_mode: RequestDeliveryMode | "";
  service_area_id: string;
  budget_type: BudgetType;
  budget_min: number | null;
  budget_max: number | null;
};

export function useSaveRequestDraft(requestId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RequestDraftInput) => {
      if (!requestId) throw new Error("Draft is not ready");
      const { data, error } = await supabase
        .from("requests")
        .update({
          title: input.title.trim() || null,
          description: input.description.trim() || null,
          city: input.city.trim() || null,
          category_id: input.category_id || null,
          subcategory_id: input.subcategory_id || null,
          service_id: input.service_id || null,
          missing_service_text: input.missing_service_text.trim() || null,
          delivery_mode: input.delivery_mode || null,
          service_area_id:
            input.delivery_mode === "on_site" && input.service_area_id
              ? input.service_area_id
              : null,
          budget_type: input.budget_type,
          budget_min: input.budget_min,
          budget_max: input.budget_max,
        })
        .eq("id", requestId)
        .is("published_at", null)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["request", requestId] });
    },
  });
}

export function usePublishRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc("publish_request", {
        _request_id: requestId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (requestId) => {
      void queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["request", requestId] });
      void queryClient.invalidateQueries({ queryKey: ["request-draft"] });
    },
  });
}

export function useCancelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("cancel_request", {
        _request_id: id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["request", id] });
      void queryClient.invalidateQueries({ queryKey: ["customer-request-offers", id] });
    },
  });
}

export function useCloseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("close_request", {
        _request_id: id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["request", id] });
      void queryClient.invalidateQueries({ queryKey: ["customer-request-offers", id] });
    },
  });
}

export function formatBudget(
  request: Pick<RequestRow, "budget_type" | "budget_min" | "budget_max">,
): string {
  if (request.budget_type === "open") return "תקציב פתוח";
  const format = (amount: number) =>
    new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(amount);
  if (request.budget_type === "fixed") return format(request.budget_min ?? 0);
  return `${format(request.budget_min ?? 0)} – ${format(request.budget_max ?? 0)}`;
}
