/** Supplier-owned offer queries and Gate 4 submission. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type OfferRow = Database["public"]["Tables"]["offers"]["Row"];
export type OfferStatus = Database["public"]["Enums"]["offer_status"];

export type SubmitOfferInput = {
  price: number;
  estimated_days: number;
  message: string;
};

export type OfferValidationErrors = Partial<Record<keyof SubmitOfferInput, string>>;

export function validateOffer(input: SubmitOfferInput): OfferValidationErrors {
  const errors: OfferValidationErrors = {};
  if (!Number.isInteger(input.price) || input.price <= 0 || input.price > 2_147_483_647) {
    errors.price = "יש להזין מחיר שלם וחיובי.";
  }
  if (
    !Number.isInteger(input.estimated_days) ||
    input.estimated_days < 1 ||
    input.estimated_days > 365
  ) {
    errors.estimated_days = "מספר הימים חייב להיות בין 1 ל־365.";
  }
  const message = input.message.trim();
  if (message.length < 20 || message.length > 2000) {
    errors.message = "ההודעה חייבת להכיל בין 20 ל־2,000 תווים.";
  }
  return errors;
}

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

export function offerSubmissionErrorMessage(error: unknown): string {
  const candidate = error as SupabaseLikeError | null;
  const code = candidate?.code ?? "";
  const message = candidate?.message?.toLowerCase() ?? "";

  if (code === "23505" || message.includes("duplicate")) {
    return "כבר שלחתם הצעה לבקשה הזו. ההצעה הקיימת תיטען כעת.";
  }
  if (code === "23514" || code === "22000") {
    return "אחד מפרטי ההצעה אינו תקין. בדקו את המחיר, מספר הימים וההודעה.";
  }
  if (
    code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission")
  ) {
    return "לא ניתן לשלוח הצעה לבקשה הזו. ייתכן שההתאמה או הבקשה כבר אינן פעילות.";
  }
  if (message.includes("not authenticated") || message.includes("jwt")) {
    return "החיבור שלכם פג. התחברו מחדש ונסו שוב.";
  }
  return "שליחת ההצעה נכשלה. נסו שוב בעוד רגע.";
}

export function useOwnOffer(requestId: string, enabled = true) {
  return useQuery({
    queryKey: ["supplier-own-offer", requestId],
    enabled: enabled && Boolean(requestId),
    queryFn: async (): Promise<OfferRow | null> => {
      const { data, error } = await supabase
        .from("offers")
        .select(
          "id, request_id, supplier_id, price, estimated_days, message, status, created_at, updated_at, withdrawn_at",
        )
        .eq("request_id", requestId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useSubmitOffer(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitOfferInput): Promise<OfferRow> => {
      const errors = validateOffer(input);
      if (Object.keys(errors).length > 0) {
        throw new Error("Invalid offer input");
      }

      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userResult.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("offers")
        .insert({
          request_id: requestId,
          supplier_id: userResult.user.id,
          price: input.price,
          estimated_days: input.estimated_days,
          message: input.message.trim(),
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (offer) => {
      queryClient.setQueryData(["supplier-own-offer", requestId], offer);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["supplier-own-offer", requestId],
      });
    },
  });
}
