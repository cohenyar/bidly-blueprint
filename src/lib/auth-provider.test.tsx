import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { StrictMode } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type AuthEvent = "INITIAL_SESSION" | "SIGNED_IN" | "TOKEN_REFRESHED";
type AuthListener = (event: AuthEvent, session: Session | null) => void;
type RoleResult = { data: Array<{ role: string }> | null; error: Error | null };

const mocks = vi.hoisted(() => ({
  listeners: new Set<AuthListener>(),
  getSessionPromise: Promise.resolve({
    data: { session: null as Session | null },
    error: null as Error | null,
  }),
  rolePromise: Promise.resolve({
    data: [] as Array<{ role: string }>,
    error: null as Error | null,
  }) as Promise<RoleResult>,
  getSession: vi.fn(),
  from: vi.fn(),
  childQuery: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((listener: AuthListener) => {
        mocks.listeners.add(listener);
        return {
          data: {
            subscription: {
              unsubscribe: () => mocks.listeners.delete(listener),
            },
          },
        };
      }),
      getSession: mocks.getSession,
      signOut: vi.fn(),
    },
    from: mocks.from,
  },
}));

import { useAuth } from "@/lib/auth-context";
import { AuthProvider } from "@/lib/auth-provider";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function supplierSession(userId = "supplier-user") {
  return { user: { id: userId } } as Session;
}

function AuthProbe() {
  const { role, loading } = useAuth();
  const childQuery = useQuery({
    queryKey: ["supplier-child-regression"],
    enabled: role === "supplier" && !loading,
    queryFn: mocks.childQuery,
  });

  return (
    <output>
      {loading ? "loading" : (role ?? "anonymous")}:{childQuery.data ?? "child-idle"}
    </output>
  );
}

function emit(event: AuthEvent, session: Session | null) {
  for (const listener of mocks.listeners) listener(event, session);
}

describe("AuthProvider initialization", () => {
  beforeEach(() => {
    mocks.listeners.clear();
    mocks.getSession.mockReset();
    mocks.from.mockReset();
    mocks.childQuery.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("coalesces same-user StrictMode auth events and unlocks supplier queries", async () => {
    const sessionResult = deferred<{
      data: { session: Session | null };
      error: Error | null;
    }>();
    const roleResult = deferred<RoleResult>();
    const session = supplierSession();

    mocks.getSessionPromise = sessionResult.promise;
    mocks.rolePromise = roleResult.promise;
    mocks.getSession.mockImplementation(() => mocks.getSessionPromise);
    mocks.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          order: () => mocks.rolePromise,
        }),
      }),
    }));
    mocks.childQuery.mockResolvedValue("child-ready");

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const clearSpy = vi.spyOn(queryClient, "clear");

    render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthProbe />
          </AuthProvider>
        </QueryClientProvider>
      </StrictMode>,
    );

    act(() => {
      emit("INITIAL_SESSION", session);
      emit("SIGNED_IN", session);
      emit("TOKEN_REFRESHED", session);
    });

    await waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(1));
    expect(screen.getByText("loading:child-idle")).toBeTruthy();

    await act(async () => {
      sessionResult.resolve({ data: { session }, error: null });
      roleResult.resolve({ data: [{ role: "supplier" }], error: null });
      await Promise.all([sessionResult.promise, roleResult.promise]);
    });

    await waitFor(() => {
      expect(screen.getByText("supplier:child-ready")).toBeTruthy();
    });

    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(mocks.childQuery).toHaveBeenCalledTimes(1);
  });

  it("settles anonymous loading when getSession rejects without an auth event", async () => {
    const sessionResult = deferred<{
      data: { session: Session | null };
      error: Error | null;
    }>();
    mocks.getSession.mockImplementation(() => sessionResult.promise);
    mocks.from.mockImplementation(() => {
      throw new Error("role lookup must not run");
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const clearSpy = vi.spyOn(queryClient, "clear");

    render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AuthProbe />
          </AuthProvider>
        </QueryClientProvider>
      </StrictMode>,
    );

    await act(async () => {
      sessionResult.reject(new Error("session unavailable"));
      await sessionResult.promise.catch(() => undefined);
    });

    await waitFor(() => expect(screen.getByText("anonymous:child-idle")).toBeTruthy());
    expect(mocks.from).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
  });
});
