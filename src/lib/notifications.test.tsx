import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const realtimeMock = vi.hoisted(() => {
  let callback: ((payload: { new: Record<string, unknown> }) => void) | undefined;
  const subscribe = vi.fn();
  const on = vi.fn(
    (
      _event: string,
      _filter: Record<string, unknown>,
      next: (payload: { new: Record<string, unknown> }) => void,
    ) => {
      callback = next;
      return { subscribe };
    },
  );
  const channel = vi.fn(() => ({ on }));
  const removeChannel = vi.fn();
  const getUser = vi.fn();
  return {
    channel,
    get callback() {
      return callback;
    },
    getUser,
    on,
    removeChannel,
    subscribe,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: realtimeMock.getUser },
    channel: realtimeMock.channel,
    removeChannel: realtimeMock.removeChannel,
  },
}));

import { useNotificationsRealtime } from "./notifications";

describe("useNotificationsRealtime", () => {
  afterEach(cleanup);

  it("invalidates the owning customer request and Offer list after an Offer notification", async () => {
    realtimeMock.getUser.mockResolvedValue({ data: { user: { id: "customer-1" } } });
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useNotificationsRealtime(), { wrapper });
    await waitFor(() => expect(realtimeMock.subscribe).toHaveBeenCalledOnce());

    act(() => {
      realtimeMock.callback?.({
        new: { type: "offer_received", request_id: "request-1" },
      });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["notifications"] });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["customer-request-offers", "request-1"],
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["request", "request-1"] });
  });
});
