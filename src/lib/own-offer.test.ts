import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const supplierEq = vi.fn(() => ({ maybeSingle }));
  const requestEq = vi.fn(() => ({ eq: supplierEq }));
  const select = vi.fn(() => ({ eq: requestEq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn();
  return { from, maybeSingle, requestEq, rpc, select, supplierEq };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: supabaseMock.from,
    rpc: supabaseMock.rpc,
  },
}));

import { fetchSupplierOwnOffer } from "./offers";

const offer = {
  id: "offer-1",
  request_id: "request-1",
  price: 1250,
  estimated_days: 3,
  message: "פירוט מספק של ההצעה לביצוע העבודה המבוקשת.",
  status: "submitted" as const,
  created_at: "2026-08-01T08:00:00.000Z",
  updated_at: "2026-08-01T08:00:00.000Z",
  withdrawn_at: null,
};

describe("fetchSupplierOwnOffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.maybeSingle.mockReset();
  });

  it("treats zero RPC rows as a normal no-offer state", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [], error: null });

    await expect(fetchSupplierOwnOffer("request-1", "supplier-1")).resolves.toBeNull();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("returns an existing supplier Offer", async () => {
    supabaseMock.rpc.mockResolvedValue({ data: [offer], error: null });

    await expect(fetchSupplierOwnOffer("request-1", "supplier-1")).resolves.toEqual(offer);
  });

  it("uses a request-and-supplier scoped maybeSingle fallback when the RPC is missing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find public.get_supplier_offer",
        details: null,
        hint: null,
      },
    });
    supabaseMock.maybeSingle.mockResolvedValue({ data: offer, error: null });

    await expect(fetchSupplierOwnOffer("request-1", "supplier-1")).resolves.toEqual(offer);
    expect(supabaseMock.from).toHaveBeenCalledWith("offers");
    expect(supabaseMock.requestEq).toHaveBeenCalledWith("request_id", "request-1");
    expect(supabaseMock.supplierEq).toHaveBeenCalledWith("supplier_id", "supplier-1");
    expect(supabaseMock.maybeSingle).toHaveBeenCalledOnce();
  });

  it("does not treat PGRST116 from maybeSingle as a failure", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Function not found" },
    });
    supabaseMock.maybeSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" },
    });

    await expect(fetchSupplierOwnOffer("request-1", "supplier-1")).resolves.toBeNull();
  });

  it("preserves a useful diagnostic for a real database error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "permission denied",
        details: "Supplier cannot read this Offer",
        hint: "Verify the authenticated role",
      },
    });

    await expect(fetchSupplierOwnOffer("request-1", "supplier-1")).rejects.toThrow(
      /code=42501.*permission denied.*Supplier cannot read.*Verify the authenticated role/,
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
