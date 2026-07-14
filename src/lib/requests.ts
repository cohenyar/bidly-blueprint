/**
 * Customer-side request data access.
 *
 * Uses the browser Supabase client; RLS scopes every read/write to
 * the signed-in customer. No server functions are needed at this stage.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type RequestRow = Database["public"]["Tables"]["requests"]["Row"];
export type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type SubcategoryRow = Database["public"]["Tables"]["subcategories"]["Row"];
export type BudgetType = Database["public"]["Enums"]["budget_type"];
export type RequestStatus = Database["public"]["Enums"]["request_status"];

export type RequestWithCategory = RequestRow & {
  category: Pick<CategoryRow, "id" | "slug" | "name_he"> | null;
  subcategory: Pick<SubcategoryRow, "id" | "slug" | "name_he"> | null;
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  open: "פעילה",
  awarded: "נבחר ספק",
  closed: "סגורה",
  cancelled: "בוטלה",
};

export const REQUEST_STATUS_TONE: Record<RequestStatus, "success" | "primary" | "muted" | "danger"> = {
  open: "success",
  awarded: "primary",
  closed: "muted",
  cancelled: "danger",
};

/* ─────────────── Queries ─────────────── */

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name_he, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubcategories(categoryId: string | null) {
  return useQuery({
    queryKey: ["subcategories", categoryId],
    enabled: !!categoryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("id, slug, name_he, sort_order, is_active, category_id")
        .eq("category_id", categoryId!)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
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
        .select(
          "*, category:categories(id, slug, name_he), subcategory:subcategories(id, slug, name_he)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RequestWithCategory[];
    },
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: ["request", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select(
          "*, category:categories(id, slug, name_he), subcategory:subcategories(id, slug, name_he)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as RequestWithCategory | null;
    },
  });
}

/* ─────────────── Mutations ─────────────── */

export type CreateRequestInput = {
  title: string;
  description: string;
  city: string;
  category_id: string;
  subcategory_id: string | null;
  budget_type: BudgetType;
  budget_min: number | null;
  budget_max: number | null;
};

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRequestInput) => {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) throw new Error("לא מחובר");

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("requests")
        .insert({
          customer_id: userRes.user.id,
          title: input.title.trim(),
          description: input.description.trim(),
          city: input.city.trim(),
          category_id: input.category_id,
          subcategory_id: input.subcategory_id,
          budget_type: input.budget_type,
          budget_min: input.budget_min,
          budget_max: input.budget_max,
          status: "open",
          published_at: now,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-requests"] });
    },
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("requests")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_r, id) => {
      void qc.invalidateQueries({ queryKey: ["my-requests"] });
      void qc.invalidateQueries({ queryKey: ["request", id] });
    },
  });
}

/* ─────────────── Formatting ─────────────── */

export function formatBudget(r: Pick<RequestRow, "budget_type" | "budget_min" | "budget_max">): string {
  if (r.budget_type === "open") return "תקציב פתוח";
  const fmt = (n: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n);
  if (r.budget_type === "fixed") return fmt(r.budget_min ?? 0);
  return `${fmt(r.budget_min ?? 0)} – ${fmt(r.budget_max ?? 0)}`;
}
