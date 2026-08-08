import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => {
  const order = vi.fn();
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn();
  return { eq, from, order, rpc, select };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: supabaseMock.from,
    rpc: supabaseMock.rpc,
  },
}));

import {
  fetchCustomerRequestOffers,
  offerSelectionErrorMessage,
  useCustomerRequestOffers,
  useSelectOffer,
  useSubmitOffer,
  useUpdateSubmittedOffer,
  type CustomerOfferRow,
} from "./offers";

const offer: CustomerOfferRow = {
  id: "offer-1",
  request_id: "request-1",
  price: 1250,
  estimated_days: 3,
  message: "",
  status: "submitted",
  created_at: "2026-08-01T08:00:00.000Z",
  business_name: "ספק בדיקה",
  business_description: null,
  base_city: "חיפה",
  years_experience: 5,
  portfolio_links: [],
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("customer request offers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("settles to an empty list when the owner has zero offers", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [], error: null });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useCustomerRequestOffers("request-1"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toEqual([]);
  });

  it("returns multiple submitted offers from the owner-scoped RPC", async () => {
    const second = { ...offer, id: "offer-2", business_name: "ספק נוסף" };
    supabaseMock.rpc.mockResolvedValue({ data: [offer, second], error: null });

    await expect(fetchCustomerRequestOffers("request-1")).resolves.toEqual([offer, second]);
    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_customer_request_offers", {
      _request_id: "request-1",
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("uses the request-owner RLS fallback only when the RPC is missing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Function not found", details: null, hint: null },
    });
    supabaseMock.order.mockResolvedValue({
      data: [
        {
          id: offer.id,
          request_id: offer.request_id,
          price: offer.price,
          estimated_days: offer.estimated_days,
          message: offer.message,
          status: offer.status,
          created_at: offer.created_at,
        },
      ],
      error: null,
    });

    const result = await fetchCustomerRequestOffers("request-1");
    expect(supabaseMock.from).toHaveBeenCalledWith("offers");
    expect(supabaseMock.eq).toHaveBeenCalledWith("request_id", "request-1");
    expect(result[0]).toMatchObject({
      id: "offer-1",
      business_name: "נותן שירות",
      business_description: null,
    });
  });

  it("settles on a real owner/authorization query error and preserves diagnostics", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "permission denied",
        details: "Request is not owned by the authenticated customer",
        hint: "Verify request ownership",
      },
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useCustomerRequestOffers("request-1"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toEqual(
      expect.objectContaining({
        code: "42501",
        details: "Request is not owned by the authenticated customer",
        hint: "Verify request ownership",
      }),
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("invalidates the customer offer list after supplier submission", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: "offer-1", error: null });
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSubmitOffer("request-1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ price: 1250, estimated_days: 3, message: "" });
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["customer-request-offers", "request-1"],
    });
  });

  it("updates the existing Offer row and invalidates Supplier and Customer projections", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: "offer-1", error: null });
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useUpdateSubmittedOffer("request-1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        offerId: "offer-1",
        price: 1400,
        estimated_days: 4,
        message: "פרטים מתוקנים",
      });
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("update_submitted_offer", {
      _offer_id: "offer-1",
      _price: 1400,
      _estimated_days: 4,
      _message: "פרטים מתוקנים",
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["supplier-own-offer", "request-1"],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["customer-request-offers", "request-1"],
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["request", "request-1"] });
  });

  it("refreshes Request details, Offers, and Request lists after successful selection", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: "request-1", error: null });
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSelectOffer("request-1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync("offer-1");
    });

    expect(supabaseMock.rpc).toHaveBeenCalledWith("select_offer", { _offer_id: "offer-1" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["my-requests"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["request", "request-1"] });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["customer-request-offers", "request-1"],
    });
  });

  it("settles on selection failure while preserving the specific Supabase diagnostic", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "Offer not owned by this Request customer",
        details: "Request owner mismatch",
        hint: "Verify the authenticated customer",
      },
    });
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useSelectOffer("request-1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync("offer-1")).rejects.toThrow(
        /42501.*Request owner mismatch.*Verify the authenticated customer/,
      );
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(offerSelectionErrorMessage(result.current.error)).toMatch(/Offer not owned/);
  });
});
