import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

import { useActiveMatchedRequests } from "@/lib/supplier-requests";

const smartRow = {
  id: "request-1",
  title: "בקשה חכמה",
  description: "תיאור",
  city: "חיפה",
  budget_type: "open" as const,
  budget_min: null,
  budget_max: null,
  status: "open" as const,
  published_at: "2026-07-30T12:00:00.000Z",
  created_at: "2026-07-30T12:00:00.000Z",
  category_id: "category-1",
  category_name_he: "אינסטלציה",
  subcategory_id: "profession-1",
  subcategory_name_he: "אינסטלטור",
  service_id: "service-1",
  service_name_he: "תיקון נזילה",
  missing_service_text: null,
  delivery_mode: "on_site",
  service_area_id: "area-1",
  service_area_name_he: "חיפה",
  questionnaire_answers: [],
  match_created_at: "2026-07-30T12:01:00.000Z",
  match_score: 100,
  match_level: "התאמה מעולה",
  match_strength: "strong",
  match_explanations: ["תואם לקטגוריית אינסטלציה", 42],
  match_badges: ["🔥 שירות מדויק", null],
};

function wrapper({ children }: React.PropsWithChildren) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false } },
        })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

describe("useActiveMatchedRequests", () => {
  afterEach(() => {
    cleanup();
    rpcMock.mockReset();
  });

  it("requests the selected SQL threshold and maps transparent Match metadata", async () => {
    rpcMock.mockResolvedValue({ data: [smartRow], error: null });

    const { result } = renderHook(() => useActiveMatchedRequests(80), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcMock).toHaveBeenCalledWith("get_smart_supplier_requests", {
      _minimum_score: 80,
    });
    expect(result.current.data?.[0]).toMatchObject({
      id: "request-1",
      match_score: 100,
      match_level: "התאמה מעולה",
      match_strength: "strong",
      match_explanations: ["תואם לקטגוריית אינסטלציה"],
      match_badges: ["🔥 שירות מדויק"],
    });
  });

  it("surfaces RPC failures instead of replacing them with unscored requests", async () => {
    const error = { code: "PGRST202", message: "Smart Match RPC unavailable" };
    rpcMock.mockResolvedValue({ data: null, error });

    const { result } = renderHook(() => useActiveMatchedRequests(50), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});
