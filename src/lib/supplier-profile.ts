/**
 * Supplier profile & taxonomy data access.
 *
 * All reads/writes go through the browser Supabase client. RLS restricts
 * every row to the signed-in supplier. No server functions are required
 * for Gate 1.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SupplierProfileRow =
  Database["public"]["Tables"]["supplier_profiles"]["Row"];
export type SupplierProfileInsert =
  Database["public"]["Tables"]["supplier_profiles"]["Insert"];
export type SupplierProfileUpdate =
  Database["public"]["Tables"]["supplier_profiles"]["Update"];

export type SupplierProfileInput = {
  business_name: string;
  description: string;
  service_area: string;
  starting_price_ils: number | null;
  years_experience: number | null;
  portfolio_links: string[];
};

const URL_RE = /^https?:\/\/\S+$/i;

export type SupplierProfileErrors = Partial<
  Record<keyof SupplierProfileInput, string>
>;

export function validateSupplierProfile(
  input: SupplierProfileInput,
): SupplierProfileErrors {
  const e: SupplierProfileErrors = {};
  const name = input.business_name.trim();
  if (name.length < 2 || name.length > 80)
    e.business_name = "שם עסק חייב להיות בין 2 ל-80 תווים.";
  if (input.description.length > 1000)
    e.description = "תיאור מוגבל ל-1000 תווים.";
  if (input.service_area.length > 200)
    e.service_area = "אזור שירות מוגבל ל-200 תווים.";
  if (
    input.starting_price_ils !== null &&
    (!Number.isFinite(input.starting_price_ils) ||
      input.starting_price_ils < 0)
  )
    e.starting_price_ils = "מחיר התחלה חייב להיות מספר חיובי.";
  if (
    input.years_experience !== null &&
    (!Number.isFinite(input.years_experience) ||
      input.years_experience < 0 ||
      input.years_experience > 100)
  )
    e.years_experience = "שנות ניסיון בטווח 0-100.";
  if (input.portfolio_links.length > 5)
    e.portfolio_links = "עד 5 קישורי תיק עבודות.";
  for (const link of input.portfolio_links) {
    if (link.length > 500 || !URL_RE.test(link)) {
      e.portfolio_links = "כל קישור חייב להיות כתובת http(s) תקינה.";
      break;
    }
  }
  return e;
}

/* ─────────────── Profile ─────────────── */

export function useMySupplierProfile() {
  return useQuery({
    queryKey: ["supplier_profile", "me"],
    queryFn: async (): Promise<SupplierProfileRow | null> => {
      const { data, error } = await supabase
        .from("supplier_profiles")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useSaveSupplierProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SupplierProfileInput) => {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const payload: SupplierProfileInsert = {
        user_id: uid,
        business_name: input.business_name.trim(),
        description: input.description,
        service_area: input.service_area,
        starting_price_ils: input.starting_price_ils,
        years_experience: input.years_experience,
        portfolio_links: input.portfolio_links,
      };

      const { data, error } = await supabase
        .from("supplier_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["supplier_profile"] });
    },
  });
}

/* ─────────────── Taxonomy ─────────────── */

export function useMySupplierCategories() {
  return useQuery({
    queryKey: ["supplier_categories", "me"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_categories")
        .select("category_id");
      if (error) throw error;
      return (data ?? []).map((r) => r.category_id);
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
      return (data ?? []).map((r) => r.subcategory_id);
    },
  });
}

export function useSyncSupplierCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      selected,
      current,
    }: {
      selected: string[];
      current: string[];
    }) => {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const toAdd = selected.filter((id) => !current.includes(id));
      const toRemove = current.filter((id) => !selected.includes(id));

      if (toRemove.length) {
        const { error } = await supabase
          .from("supplier_categories")
          .delete()
          .eq("supplier_id", uid)
          .in("category_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase
          .from("supplier_categories")
          .insert(toAdd.map((cid) => ({ supplier_id: uid, category_id: cid })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["supplier_categories"] });
      void qc.invalidateQueries({ queryKey: ["supplier_subcategories"] });
    },
  });
}

export function useSyncSupplierSubcategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      selected,
      current,
    }: {
      selected: string[];
      current: string[];
    }) => {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not authenticated");

      const toAdd = selected.filter((id) => !current.includes(id));
      const toRemove = current.filter((id) => !selected.includes(id));

      if (toRemove.length) {
        const { error } = await supabase
          .from("supplier_subcategories")
          .delete()
          .eq("supplier_id", uid)
          .in("subcategory_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase
          .from("supplier_subcategories")
          .insert(
            toAdd.map((sid) => ({ supplier_id: uid, subcategory_id: sid })),
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["supplier_subcategories"] });
    },
  });
}

/* ─────────────── Completion ─────────────── */

export type CompletionStatus = {
  hasProfile: boolean;
  hasBusinessName: boolean;
  hasDescription: boolean;
  hasServiceArea: boolean;
  hasCategories: boolean;
  hasSubcategories: boolean;
  percent: number;
};

export function computeCompletion(
  profile: SupplierProfileRow | null,
  categoryIds: string[],
  subcategoryIds: string[],
): CompletionStatus {
  const hasProfile = !!profile;
  const hasBusinessName = !!profile?.business_name?.trim();
  const hasDescription = !!profile?.description?.trim();
  const hasServiceArea = !!profile?.service_area?.trim();
  const hasCategories = categoryIds.length > 0;
  const hasSubcategories = subcategoryIds.length > 0;
  const checks = [
    hasBusinessName,
    hasDescription,
    hasServiceArea,
    hasCategories,
    hasSubcategories,
  ];
  const done = checks.filter(Boolean).length;
  const percent = Math.round((done / checks.length) * 100);
  return {
    hasProfile,
    hasBusinessName,
    hasDescription,
    hasServiceArea,
    hasCategories,
    hasSubcategories,
    percent,
  };
}
