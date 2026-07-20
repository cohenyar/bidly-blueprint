/**
 * Service-provider request access for the Supplier workspace.
 *
 * Match rows are read first and restricted to `active`. Request reads are then
 * limited to those exact IDs. Supabase RLS remains the authorization boundary
 * for both queries; no unmatched marketplace data is fetched for client-side
 * filtering.
 */
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type RequestRow = Database["public"]["Tables"]["requests"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type SubcategoryRow = Database["public"]["Tables"]["subcategories"]["Row"];

export type SupplierMatchedRequest = Pick<
  RequestRow,
  | "id"
  | "title"
  | "description"
  | "city"
  | "budget_type"
  | "budget_min"
  | "budget_max"
  | "status"
  | "published_at"
  | "created_at"
> & {
  category: Pick<CategoryRow, "id" | "name_he"> | null;
  subcategory: Pick<SubcategoryRow, "id" | "name_he"> | null;
  match_created_at: string;
  match_status: "active";
};

const APPROVED_REQUEST_FIELDS =
  "id, title, description, city, budget_type, budget_min, budget_max, status, published_at, created_at, category:categories(id, name_he), subcategory:subcategories(id, name_he)" as const;

export function useActiveMatchedRequests() {
  return useQuery({
    queryKey: ["supplier-matched-requests", "active"],
    queryFn: async (): Promise<SupplierMatchedRequest[]> => {
      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("request_id, created_at, status")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (matchesError) throw matchesError;
      if (!matches?.length) return [];

      const { data: requests, error: requestsError } = await supabase
        .from("requests")
        .select(APPROVED_REQUEST_FIELDS)
        .in(
          "id",
          matches.map((match) => match.request_id),
        );
      if (requestsError) throw requestsError;

      const requestsById = new Map((requests ?? []).map((request) => [request.id, request]));

      return matches.flatMap((match) => {
        const request = requestsById.get(match.request_id);
        if (!request || match.status !== "active") return [];
        return [
          {
            ...request,
            match_created_at: match.created_at,
            match_status: "active" as const,
          },
        ];
      });
    },
  });
}

export function useActiveMatchedRequest(id: string) {
  return useQuery({
    queryKey: ["supplier-matched-request", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<SupplierMatchedRequest | null> => {
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .select("request_id, created_at, status")
        .eq("request_id", id)
        .eq("status", "active")
        .maybeSingle();
      if (matchError) throw matchError;
      if (!match || match.status !== "active") return null;

      const { data: request, error: requestError } = await supabase
        .from("requests")
        .select(APPROVED_REQUEST_FIELDS)
        .eq("id", id)
        .maybeSingle();
      if (requestError) throw requestError;
      if (!request) return null;

      return {
        ...request,
        match_created_at: match.created_at,
        match_status: "active",
      };
    },
  });
}
