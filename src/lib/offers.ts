/** Supplier-owned offer queries and Gate 4 submission. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type OfferRow = Database["public"]["Functions"]["get_supplier_offer"]["Returns"][number];
export type CustomerOfferRow = Omit<
  Database["public"]["Functions"]["get_customer_request_offers"]["Returns"][number],
  "business_description" | "base_city" | "years_experience"
> & {
  business_description: string | null;
  base_city: string | null;
  years_experience: number | null;
};

export type OfferStatus = Database["public"]["Enums"]["offer_status"];

export type SubmitOfferInput = {
  price: number;
  estimated_days: number;
  message: string;
};

export type UpdateSubmittedOfferInput = SubmitOfferInput & {
  offerId: string;
};

export type OfferValidationErrors = Partial<Record<keyof SubmitOfferInput, string>>;

export type OfferFormValues = {
  price: string;
  estimated_days: string;
  message: string;
};

export type SupplierOfferVisibility = {
  isSupplier: boolean;
  hasActiveMatch: boolean;
  canViewRequest: boolean;
  requestStatus: Database["public"]["Enums"]["request_status"];
  hasExistingOffer: boolean;
};

export type SubmittedOfferEditVisibility = {
  isSupplier: boolean;
  isOwnOffer: boolean;
  hasActiveMatch: boolean;
  requestStatus: Database["public"]["Enums"]["request_status"];
  offerStatus: OfferStatus;
};

export function canShowSupplierOfferAction({
  isSupplier,
  hasActiveMatch,
  canViewRequest,
  requestStatus,
  hasExistingOffer,
}: SupplierOfferVisibility) {
  return (
    isSupplier && hasActiveMatch && canViewRequest && requestStatus === "open" && !hasExistingOffer
  );
}

export function validateOfferForm(values: OfferFormValues): OfferValidationErrors {
  const errors: OfferValidationErrors = {};
  const rawPrice = values.price.trim();

  if (!rawPrice) {
    errors.price = "יש להזין הערכת מחיר";
  } else {
    const price = Number(rawPrice);
    if (!Number.isFinite(price) || !Number.isInteger(price) || price > 2_147_483_647) {
      errors.price = "יש להזין מחיר מספרי תקין";
    } else if (price <= 0) {
      errors.price = "יש להזין מחיר גדול מ־0";
    }
  }

  const estimatedDays = Number(values.estimated_days);
  if (
    !values.estimated_days.trim() ||
    !Number.isInteger(estimatedDays) ||
    estimatedDays < 1 ||
    estimatedDays > 365
  ) {
    errors.estimated_days = "מספר הימים חייב להיות בין 1 ל־365.";
  }

  if (values.message.trim().length > 2000) {
    errors.message = "פירוט ההצעה יכול להכיל עד 2,000 תווים.";
  }

  return errors;
}

export function toSubmitOfferInput(values: OfferFormValues): SubmitOfferInput {
  return {
    price: Number(values.price),
    estimated_days: Number(values.estimated_days),
    message: values.message,
  };
}

export function validateOffer(input: SubmitOfferInput): OfferValidationErrors {
  const errors: OfferValidationErrors = {};
  if (!Number.isInteger(input.price) || input.price <= 0 || input.price > 2_147_483_647) {
    errors.price = "יש להזין מחיר מספרי תקין";
  }
  if (
    !Number.isInteger(input.estimated_days) ||
    input.estimated_days < 1 ||
    input.estimated_days > 365
  ) {
    errors.estimated_days = "מספר הימים חייב להיות בין 1 ל־365.";
  }
  if (input.message.trim().length > 2000) {
    errors.message = "פירוט ההצעה יכול להכיל עד 2,000 תווים.";
  }
  return errors;
}

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const SUPPLIER_OFFER_PROJECTION =
  "id, request_id, price, estimated_days, message, status, created_at, updated_at, withdrawn_at";

const CUSTOMER_OFFER_PROJECTION =
  "id, request_id, price, estimated_days, message, status, created_at";

function isNoRowsError(error: SupabaseLikeError | null) {
  return error?.code === "PGRST116";
}

function offerLookupError(
  operation: "get_supplier_offer" | "offers.maybeSingle",
  error: SupabaseLikeError,
  requestId: string,
  supplierId: string,
) {
  const diagnostic = {
    operation,
    requestId,
    supplierId,
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };

  if (import.meta.env.DEV) {
    console.error("[Supplier offer lookup failed]", diagnostic);
  }

  return Object.assign(
    new Error(
      [
        `${operation} failed`,
        error.code ? `code=${error.code}` : null,
        error.message ? `message=${error.message}` : null,
        error.details ? `details=${error.details}` : null,
        error.hint ? `hint=${error.hint}` : null,
      ]
        .filter(Boolean)
        .join(" | "),
    ),
    {
      operation,
      requestId,
      supplierId,
      code: error.code,
      details: error.details,
      hint: error.hint,
    },
  );
}

function customerOfferLookupError(
  operation: "get_customer_request_offers" | "offers.customerRequest",
  error: SupabaseLikeError,
  requestId: string,
) {
  const diagnostic = {
    operation,
    requestId,
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };

  if (import.meta.env.DEV) {
    console.error("[Customer offer lookup failed]", diagnostic);
  }

  return Object.assign(
    new Error(
      [
        `${operation} failed`,
        error.code ? `code=${error.code}` : null,
        error.message ? `message=${error.message}` : null,
        error.details ? `details=${error.details}` : null,
        error.hint ? `hint=${error.hint}` : null,
      ]
        .filter(Boolean)
        .join(" | "),
    ),
    {
      operation,
      requestId,
      code: error.code,
      details: error.details,
      hint: error.hint,
    },
  );
}

export async function fetchSupplierOwnOffer(
  requestId: string,
  supplierId: string,
): Promise<OfferRow | null> {
  const rpcResult = await supabase.rpc("get_supplier_offer", {
    _request_id: requestId,
  });

  if (!rpcResult.error) return rpcResult.data?.[0] ?? null;
  if (isNoRowsError(rpcResult.error)) return null;

  // Compatibility for managed backends that have not yet applied the Core
  // hardening migration which creates get_supplier_offer(). Once present, the
  // SECURITY DEFINER RPC remains the only path used.
  if (rpcResult.error.code !== "PGRST202") {
    throw offerLookupError("get_supplier_offer", rpcResult.error, requestId, supplierId);
  }

  if (import.meta.env.DEV) {
    console.warn("[get_supplier_offer unavailable; using supplier-scoped compatibility query]", {
      requestId,
      supplierId,
      code: rpcResult.error.code,
      message: rpcResult.error.message,
      details: rpcResult.error.details,
      hint: rpcResult.error.hint,
    });
  }

  const directResult = await supabase
    .from("offers")
    .select(SUPPLIER_OFFER_PROJECTION)
    .eq("request_id", requestId)
    .eq("supplier_id", supplierId)
    .maybeSingle();

  if (!directResult.error) return directResult.data as OfferRow | null;
  if (isNoRowsError(directResult.error)) return null;
  throw offerLookupError("offers.maybeSingle", directResult.error, requestId, supplierId);
}

export function offerSubmissionErrorMessage(error: unknown): string {
  const candidate = error as SupabaseLikeError | null;
  const code = candidate?.code ?? "";
  const message = candidate?.message?.toLowerCase() ?? "";

  if (code === "23505" || message.includes("duplicate")) {
    return "כבר שלחתם הצעה לבקשה הזו. ההצעה הקיימת תיטען כעת.";
  }
  if (code === "23514" || code === "22000") {
    return (
      candidate?.message || "אחד מפרטי ההצעה אינו תקין. בדקו את המחיר, מספר הימים ופירוט ההצעה."
    );
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
  return candidate?.message || "שליחת ההצעה נכשלה. נסו שוב בעוד רגע.";
}

export function offerSelectionErrorMessage(error: unknown): string {
  const candidate = error as SupabaseLikeError | null;
  return candidate?.message || "בחירת ההצעה נכשלה. נסו שוב בעוד רגע.";
}

function offerSelectionError(error: SupabaseLikeError, requestId: string, offerId: string) {
  const diagnostic = {
    operation: "select_offer",
    requestId,
    offerId,
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };

  if (import.meta.env.DEV) console.error("[Offer selection failed]", diagnostic);

  return Object.assign(
    new Error(
      [
        "select_offer failed",
        error.code ? `code=${error.code}` : null,
        error.message ? `message=${error.message}` : null,
        error.details ? `details=${error.details}` : null,
        error.hint ? `hint=${error.hint}` : null,
      ]
        .filter(Boolean)
        .join(" | "),
    ),
    {
      code: error.code,
      details: error.details,
      hint: error.hint,
      requestId,
      offerId,
    },
  );
}

export function useOwnOffer(requestId: string, supplierId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["supplier-own-offer", requestId, supplierId],
    enabled: enabled && Boolean(requestId) && Boolean(supplierId),
    queryFn: () => (supplierId ? fetchSupplierOwnOffer(requestId, supplierId) : null),
  });
}

export function useSubmitOffer(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitOfferInput): Promise<string> => {
      const errors = validateOffer(input);
      if (Object.keys(errors).length > 0) {
        throw new Error("Invalid offer input");
      }

      const { data, error } = await supabase.rpc("submit_offer", {
        _request_id: requestId,
        _price: input.price,
        _estimated_days: input.estimated_days,
        _message: input.message.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["supplier-own-offer", requestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["supplier-matched-request", requestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["customer-request-offers", requestId],
      });
    },
  });
}

export function canEditSubmittedOffer({
  isSupplier,
  isOwnOffer,
  hasActiveMatch,
  requestStatus,
  offerStatus,
}: SubmittedOfferEditVisibility) {
  return (
    isSupplier &&
    isOwnOffer &&
    hasActiveMatch &&
    requestStatus === "open" &&
    offerStatus === "submitted"
  );
}

export function useUpdateSubmittedOffer(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateSubmittedOfferInput): Promise<string> => {
      const errors = validateOffer(input);
      if (Object.keys(errors).length > 0) {
        throw new Error("Invalid offer input");
      }

      const { data, error } = await supabase.rpc("update_submitted_offer", {
        _offer_id: input.offerId,
        _price: input.price,
        _estimated_days: input.estimated_days,
        _message: input.message.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["supplier-own-offer", requestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["supplier-matched-request", requestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["customer-request-offers", requestId],
      });
      void queryClient.invalidateQueries({ queryKey: ["request", requestId] });
    },
  });
}

export function useWithdrawOffer(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (offerId: string) => {
      const { data, error } = await supabase.rpc("withdraw_offer", {
        _offer_id: offerId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["supplier-own-offer", requestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["supplier-matched-request", requestId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["supplier-matched-requests", "active"],
      });
    },
  });
}

export async function fetchCustomerRequestOffers(requestId: string): Promise<CustomerOfferRow[]> {
  const rpcResult = await supabase.rpc("get_customer_request_offers", {
    _request_id: requestId,
  });

  if (!rpcResult.error) return rpcResult.data ?? [];

  if (rpcResult.error.code !== "PGRST202") {
    throw customerOfferLookupError("get_customer_request_offers", rpcResult.error, requestId);
  }

  if (import.meta.env.DEV) {
    console.warn(
      "[get_customer_request_offers unavailable; using request-owner RLS compatibility query]",
      {
        requestId,
        code: rpcResult.error.code,
        message: rpcResult.error.message,
        details: rpcResult.error.details,
        hint: rpcResult.error.hint,
      },
    );
  }

  // Compatibility for managed backends that have not yet applied the Core
  // hardening RPC. The original offers SELECT policy restricts these rows to
  // the authenticated owner of this request; supplier identity remains generic
  // until the SECURITY DEFINER projection RPC is available.
  const directResult = await supabase
    .from("offers")
    .select(CUSTOMER_OFFER_PROJECTION)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (directResult.error) {
    throw customerOfferLookupError("offers.customerRequest", directResult.error, requestId);
  }

  return (directResult.data ?? []).map((offer) => ({
    ...offer,
    business_name: "נותן שירות",
    business_description: null,
    base_city: null,
    years_experience: null,
  })) as CustomerOfferRow[];
}

export function useCustomerRequestOffers(requestId: string) {
  return useQuery({
    queryKey: ["customer-request-offers", requestId],
    enabled: Boolean(requestId),
    queryFn: () => fetchCustomerRequestOffers(requestId),
    retry: false,
  });
}

export function useSelectOffer(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (offerId: string) => {
      const { data, error } = await supabase.rpc("select_offer", {
        _offer_id: offerId,
      });
      if (error) throw offerSelectionError(error, requestId, offerId);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      void queryClient.invalidateQueries({ queryKey: ["request", requestId] });
      void queryClient.invalidateQueries({
        queryKey: ["customer-request-offers", requestId],
      });
    },
  });
}
