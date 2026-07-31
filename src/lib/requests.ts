import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { BUCKET as REQUEST_ATTACHMENTS_BUCKET } from "@/lib/attachments";

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

type ProjectedService = Pick<ServiceRow, "id" | "slug" | "name_he"> & {
  subcategory:
    | (Pick<SubcategoryRow, "id" | "slug" | "name_he"> & {
        category: Pick<CategoryRow, "id" | "slug" | "name_he"> | null;
      })
    | null;
};

type RequestProjectionRow = RequestRow & {
  service: ProjectedService | null;
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

// Restore the service_area embed after migrations 7–10 add requests.service_area_id.
export const REQUEST_PROJECTION =
  "*, service:services!requests_service_id_fkey(id, slug, name_he, subcategory:subcategories!services_subcategory_id_fkey(id, slug, name_he, category:categories!subcategories_category_id_fkey(id, slug, name_he)))";

export function normalizeRequestProjection<
  T extends {
    service: ProjectedService | null;
    service_area?: unknown;
  },
>(
  row: T,
): Omit<T, "service" | "service_area"> & {
  category: Pick<CategoryRow, "id" | "slug" | "name_he"> | null;
  subcategory: Pick<SubcategoryRow, "id" | "slug" | "name_he"> | null;
  service: Pick<ServiceRow, "id" | "slug" | "name_he"> | null;
  service_area: null;
} {
  const { service, service_area: _serviceArea, ...request } = row;
  const subcategory = service?.subcategory ?? null;

  void _serviceArea;

  return {
    ...request,
    category: subcategory?.category ?? null,
    subcategory: subcategory
      ? {
          id: subcategory.id,
          slug: subcategory.slug,
          name_he: subcategory.name_he,
        }
      : null,
    service: service
      ? {
          id: service.id,
          slug: service.slug,
          name_he: service.name_he,
        }
      : null,
    service_area: null,
  };
}

function throwRequestProjectionError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}): never {
  if (import.meta.env.DEV) {
    const diagnostic = {
      query: "requests.select(REQUEST_PROJECTION)",
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    };

    console.error("[Supabase request projection failed]", diagnostic);
    throw new Error(
      [
        `Query: ${diagnostic.query}`,
        `Code: ${diagnostic.code ?? "unknown"}`,
        `Message: ${diagnostic.message ?? "unknown"}`,
        `Details: ${diagnostic.details ?? "none"}`,
        `Hint: ${diagnostic.hint ?? "none"}`,
      ].join("\n"),
      { cause: error },
    );
  }

  throw error;
}

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
        .select(REQUEST_PROJECTION)
        .not("published_at", "is", null)
        .order("created_at", { ascending: false });
      if (error) throwRequestProjectionError(error);
      return (data ?? []).map((row) =>
        normalizeRequestProjection(row as unknown as RequestProjectionRow),
      );
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
        .select(REQUEST_PROJECTION)
        .eq("id", id)
        .maybeSingle();
      if (error) throwRequestProjectionError(error);
      return data ? normalizeRequestProjection(data as unknown as RequestProjectionRow) : null;
    },
  });
}

export function useExistingRequestDraft() {
  return useQuery({
    queryKey: ["request-draft"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("id, title, updated_at")
        .is("published_at", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAcquireRequestDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("get_or_create_request_draft");
      if (error) {
        if (import.meta.env.DEV) {
          const diagnostic = {
            rpc: "get_or_create_request_draft",
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          };

          console.error("[Supabase RPC failed]", diagnostic);
          throw new Error(
            [
              `RPC: ${diagnostic.rpc}`,
              `Code: ${diagnostic.code ?? "unknown"}`,
              `Message: ${diagnostic.message ?? "unknown"}`,
              `Details: ${diagnostic.details ?? "none"}`,
              `Hint: ${diagnostic.hint ?? "none"}`,
            ].join("\n"),
            { cause: error },
          );
        }

        throw error;
      }
      return data;
    },
    onSuccess: (requestId) => {
      void queryClient.invalidateQueries({ queryKey: ["request", requestId] });
      void queryClient.invalidateQueries({ queryKey: ["request-draft"] });
    },
  });
}

export function useDeleteRequestDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data: attachments, error: attachmentError } = await supabase
        .from("request_attachments")
        .select("storage_path")
        .eq("request_id", requestId);
      if (attachmentError) throw attachmentError;

      const storagePaths = (attachments ?? []).map((attachment) => attachment.storage_path);
      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(REQUEST_ATTACHMENTS_BUCKET)
          .remove(storagePaths);
        if (storageError) throw storageError;
      }

      const { data, error } = await supabase
        .from("requests")
        .delete()
        .eq("id", requestId)
        .is("published_at", null)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Request draft was not found or could not be deleted");
      return data.id;
    },
    onSuccess: (requestId) => {
      queryClient.removeQueries({ queryKey: ["request", requestId] });
      queryClient.removeQueries({ queryKey: ["attachments", requestId] });
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

export type RequestPublishValidationErrors = Partial<
  Record<
    | "title"
    | "description"
    | "city"
    | "category_id"
    | "service"
    | "delivery_mode"
    | "service_area_id"
    | "budget",
    string
  >
>;

// The managed schema now enforces delivery compatibility during publication.
export const CURRENT_REQUEST_SCHEMA_SUPPORTS_DELIVERY = true;

export function isRequestPublishDisabled({
  publishPending,
  autosavePending,
  questionnairePending,
  taxonomySaving,
}: {
  publishPending: boolean;
  autosavePending: boolean;
  questionnairePending: boolean;
  taxonomySaving: boolean;
}) {
  return publishPending || autosavePending || questionnairePending || taxonomySaving;
}

export function buildRequestDraftUpdatePayload(input: RequestDraftInput) {
  return {
    title: input.title.trim() || null,
    description: input.description.trim() || null,
    city: input.city.trim() || null,
    category_id: input.category_id || null,
    subcategory_id: input.subcategory_id || null,
    service_id: input.service_id || null,
    missing_service_text: input.missing_service_text.trim() || null,
    delivery_mode: input.delivery_mode || null,
    service_area_id: input.delivery_mode === "on_site" ? input.service_area_id || null : null,
    budget_type: input.budget_type,
    budget_min: input.budget_min,
    budget_max: input.budget_max,
  } satisfies Database["public"]["Tables"]["requests"]["Update"];
}

export function validateRequestPublishFields(
  input: RequestDraftInput,
): RequestPublishValidationErrors {
  const errors: RequestPublishValidationErrors = {};

  if (input.title.trim().length < 3 || input.title.trim().length > 120) {
    errors.title = "הכותרת חייבת להכיל 3–120 תווים.";
  }
  if (input.description.length > 4000) {
    errors.description = "התיאור יכול להכיל עד 4,000 תווים.";
  }
  if (input.city.trim().length < 2 || input.city.trim().length > 80) {
    errors.city = "יש להזין עיר תקינה.";
  }
  if (!input.category_id) {
    errors.category_id = "יש לבחור קטגוריה.";
  }
  if (!input.service_id && input.missing_service_text.trim().length < 3) {
    errors.service = "בחרו שירות או תארו את השירות שלא מצאתם.";
  }
  if (!input.delivery_mode) {
    errors.delivery_mode = "יש לבחור האם השירות יינתן במקום או מרחוק";
  } else if (input.delivery_mode === "on_site" && !input.service_area_id) {
    errors.service_area_id = "יש לבחור אזור שירות לפני פרסום הבקשה";
  }

  if (input.budget_type === "fixed") {
    const amount = input.budget_min;
    if (amount === null || !Number.isFinite(amount) || amount <= 0) {
      errors.budget = "יש להזין סכום חיובי.";
    }
  } else if (input.budget_type === "range") {
    const minimum = input.budget_min;
    const maximum = input.budget_max;
    if (
      minimum === null ||
      maximum === null ||
      !Number.isFinite(minimum) ||
      !Number.isFinite(maximum) ||
      minimum <= 0 ||
      maximum <= 0 ||
      minimum > maximum
    ) {
      errors.budget = "יש להזין טווח תקציב תקין.";
    }
  }

  return errors;
}

export function getRequestPublishValidationTarget(
  errors: RequestPublishValidationErrors,
): "delivery_mode" | "service_area_id" | null {
  if (errors.delivery_mode) return "delivery_mode";
  if (errors.service_area_id) return "service_area_id";
  return null;
}

export async function saveAndPublishRequestDraft({
  requestId,
  input,
  validationErrors,
  save,
  publish,
}: {
  requestId: string;
  input: RequestDraftInput;
  validationErrors: object;
  save: (input: RequestDraftInput) => Promise<unknown>;
  publish: (requestId: string) => Promise<string>;
}): Promise<string | null> {
  if (Object.keys(validationErrors).length > 0) return null;
  await save(input);
  return publish(requestId);
}

export function isDeliveryModeRequiredError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return (
    candidate.code === "22000" &&
    typeof candidate.message === "string" &&
    candidate.message.includes("Request delivery mode is required")
  );
}

export function isServiceAreaRequiredError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return (
    candidate.code === "22000" &&
    typeof candidate.message === "string" &&
    candidate.message.includes("On-site Request requires an active Service Area")
  );
}

export function getRequestPublishErrorMessage(error: unknown): string {
  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";

  const knownMessages: Record<string, string> = {
    "Request delivery mode is required": "יש לבחור האם השירות יינתן במקום או מרחוק",
    "On-site Request requires an active Service Area": "יש לבחור אזור שירות לפני פרסום הבקשה",
    "Remote Request must not have a Service Area": "בקשה מרחוק אינה יכולה לכלול אזור שירות.",
    "Selected Service does not support remote delivery": "השירות שנבחר אינו תומך בעבודה מרחוק.",
    "Required questionnaire answers are missing": "יש להשלים את כל שאלות החובה.",
    "Published Request is missing required fields": "יש להשלים את כל שדות החובה לפני הפרסום.",
    "Invalid title length": "כותרת הבקשה אינה באורך תקין.",
    "Invalid description length": "תיאור הבקשה ארוך מ־4,000 תווים.",
    "Invalid city": "יש להזין עיר תקינה.",
  };

  return knownMessages[message] || message || "פרסום הבקשה נכשל. הטיוטה נשמרה וניתן לנסות שוב.";
}

export function useSaveRequestDraft(requestId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RequestDraftInput) => {
      if (!requestId) throw new Error("Draft is not ready");
      const { data, error } = await supabase
        .from("requests")
        .update(buildRequestDraftUpdatePayload(input))
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
