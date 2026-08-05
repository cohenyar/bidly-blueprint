import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc },
}));

import { canCancelPublishedRequest, cancelRequestErrorMessage, useCancelRequest } from "./requests";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("customer Request cancellation", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("shows cancellation only for a published open Request", () => {
    expect(
      canCancelPublishedRequest({ status: "open", published_at: "2026-08-01T08:00:00Z" }),
    ).toBe(true);
    expect(canCancelPublishedRequest({ status: "open", published_at: null })).toBe(false);
    expect(
      canCancelPublishedRequest({ status: "awarded", published_at: "2026-08-01T08:00:00Z" }),
    ).toBe(false);
    expect(
      canCancelPublishedRequest({ status: "closed", published_at: "2026-08-01T08:00:00Z" }),
    ).toBe(false);
    expect(
      canCancelPublishedRequest({ status: "cancelled", published_at: "2026-08-01T08:00:00Z" }),
    ).toBe(false);
  });

  it("settles after successful owner cancellation and refreshes Request state", async () => {
    rpc.mockResolvedValue({ data: "request-1", error: null });
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useCancelRequest(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync("request-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(rpc).toHaveBeenCalledWith("cancel_request", { _request_id: "request-1" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["request", "request-1"] });
  });

  it("settles on RPC failure and preserves the full Supabase diagnostic", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    rpc.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find public.cancel_request(uuid)",
        details: "Searched for the function in the schema cache",
        hint: "Reload the schema cache",
      },
    });
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useCancelRequest(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync("request-1")).rejects.toThrow(
        /PGRST202.*schema cache.*Reload the schema cache/,
      );
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(cancelRequestErrorMessage(result.current.error)).toBe(
      "פעולת ביטול הבקשה אינה זמינה כרגע.",
    );
  });
});
