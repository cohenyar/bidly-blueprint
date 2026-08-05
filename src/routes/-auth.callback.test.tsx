import type { ComponentType, ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
  current: {
    user: null as { id: string } | null,
    role: null as "customer" | "supplier" | "admin" | null,
    loading: true,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => ({ options: config }),
  useNavigate: () => navigateMock,
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("@/components/app/AuthCard", () => ({
  AuthShell: ({ title, children }: { title: string; children: ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState.current,
}));

import { Route as CallbackRoute } from "@/routes/auth.callback";

const CallbackPage = (CallbackRoute as unknown as { options: { component: ComponentType } }).options
  .component;

describe("Google OAuth callback", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    authState.current = { user: null, role: null, loading: true };
    window.history.replaceState({}, "", "/auth/callback");
  });

  afterEach(cleanup);

  it.each([
    ["customer", "/app"],
    ["admin", "/app"],
    ["supplier", "/supplier"],
  ] as const)("routes an existing %s account once to %s", async (role, destination) => {
    authState.current = { user: { id: "existing-user" }, role, loading: false };
    const view = render(<CallbackPage />);

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({ to: destination, replace: true }),
    );
    view.rerender(<CallbackPage />);
    expect(navigateMock).toHaveBeenCalledTimes(1);
  });

  it("routes a new roleless Google user to the existing registration role chooser", async () => {
    authState.current = { user: { id: "new-google-user" }, role: null, loading: false };
    render(<CallbackPage />);

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({
        to: "/register",
        search: { oauth: true },
        replace: true,
      }),
    );
  });

  it("settles callback failure without entering a redirect loop", async () => {
    window.history.replaceState({}, "", "/auth/callback?error_description=access_denied");
    authState.current = { user: null, role: null, loading: false };
    render(<CallbackPage />);

    expect(screen.getByRole("heading", { name: "לא הצלחנו להשלים את ההתחברות" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "ניסיון התחברות נוסף" })).toBeTruthy();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
