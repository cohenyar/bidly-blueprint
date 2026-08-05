import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ActiveCategory = Database["public"]["Tables"]["categories"]["Row"];

export function useActiveCategories() {
  return useQuery({
    // Preserve the existing cache key used by Supplier onboarding.
    queryKey: ["categories", "supplier-onboarding"],
    queryFn: async (): Promise<ActiveCategory[]> => {
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
