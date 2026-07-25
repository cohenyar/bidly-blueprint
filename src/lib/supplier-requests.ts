/**
 * Service-provider request access for the Supplier workspace.
 *
 * A caller-scoped database function returns only active matched rows and only
 * the request columns approved for the Supplier workspace. Suppliers have no
 * direct SELECT policy on `requests`, so hidden customer/offer fields cannot be
 * requested by bypassing this client module.
 */
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type RequestRow = Database["public"]["Tables"]["requests"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type SubcategoryRow = Database["public"]["Tables"]["subcategories"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type ServiceAreaRow = Database["public"]["Tables"]["service_areas"]["Row"];

export type SupplierQuestionnaireAnswer = {
  question_id: string;
  prompt_he: string;
  field_type: string;
  answer: Json;
};

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
  service: Pick<ServiceRow, "id" | "name_he"> | null;
  service_area: Pick<ServiceAreaRow, "id" | "name_he"> | null;
  delivery_mode: "on_site" | "remote" | null;
  missing_service_text: string | null;
  questionnaire_answers: SupplierQuestionnaireAnswer[];
  match_created_at: string;
  match_status: "active";
};

type ActiveSupplierRequestRpcRow =
  Database["public"]["Functions"]["get_active_supplier_requests"]["Returns"][number];

function mapSupplierRequest(row: ActiveSupplierRequestRpcRow): SupplierMatchedRequest {
  const questionnaireAnswers = Array.isArray(row.questionnaire_answers)
    ? row.questionnaire_answers.filter(isQuestionnaireAnswer)
    : [];
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    city: row.city,
    budget_type: row.budget_type,
    budget_min: row.budget_min,
    budget_max: row.budget_max,
    status: row.status,
    published_at: row.published_at,
    created_at: row.created_at,
    category: { id: row.category_id, name_he: row.category_name_he },
    subcategory:
      row.subcategory_id && row.subcategory_name_he
        ? { id: row.subcategory_id, name_he: row.subcategory_name_he }
        : null,
    service:
      row.service_id && row.service_name_he
        ? { id: row.service_id, name_he: row.service_name_he }
        : null,
    service_area:
      row.service_area_id && row.service_area_name_he
        ? { id: row.service_area_id, name_he: row.service_area_name_he }
        : null,
    delivery_mode:
      row.delivery_mode === "on_site" || row.delivery_mode === "remote" ? row.delivery_mode : null,
    missing_service_text: row.missing_service_text,
    questionnaire_answers: questionnaireAnswers,
    match_created_at: row.match_created_at,
    match_status: "active",
  };
}

function isQuestionnaireAnswer(value: Json): value is SupplierQuestionnaireAnswer {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.question_id === "string" &&
    typeof value.prompt_he === "string" &&
    typeof value.field_type === "string" &&
    "answer" in value
  );
}

export function useActiveMatchedRequests() {
  return useQuery({
    queryKey: ["supplier-matched-requests", "active"],
    queryFn: async (): Promise<SupplierMatchedRequest[]> => {
      const { data, error } = await supabase.rpc("get_active_supplier_requests");
      if (error) throw error;
      return (data ?? []).map(mapSupplierRequest);
    },
  });
}

export function useActiveMatchedRequest(id: string) {
  return useQuery({
    queryKey: ["supplier-matched-request", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<SupplierMatchedRequest | null> => {
      const { data, error } = await supabase.rpc("get_active_supplier_requests", {
        _request_id: id,
      });
      if (error) throw error;
      return data?.[0] ? mapSupplierRequest(data[0]) : null;
    },
  });
}
