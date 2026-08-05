import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: mocks.signInWithOAuth,
    },
  },
}));

import { GoogleOAuthButton } from "@/components/app/GoogleOAuthButton";
import {
  getAuthenticatedDestination,
  getGoogleOAuthRedirectUrl,
  getOAuthCallbackError,
  getRegistrationCompletionDestination,
} from "@/lib/auth-routing";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260805100000_google_oauth_role_completion.sql"),
  "utf8",
);

describe("Google OAuth", () => {
  beforeEach(() => {
    mocks.signInWithOAuth.mockReset();
  });

  afterEach(cleanup);

  it("starts Google OAuth from an accessible full-width control with an origin-local callback", async () => {
    mocks.signInWithOAuth.mockResolvedValue({ data: { provider: "google" }, error: null });
    const onError = vi.fn();

    render(<GoogleOAuthButton onError={onError} />);
    const button = screen.getByRole("button", { name: /המשך עם Google/ });
    expect(button.className).toContain("w-full");

    fireEvent.click(button);

    await waitFor(() =>
      expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      }),
    );
    expect(onError).toHaveBeenCalledWith("");
  });

  it("settles a failed OAuth start and exposes a retry-safe Hebrew error", async () => {
    mocks.signInWithOAuth.mockResolvedValue({
      data: null,
      error: { code: "oauth_failed", message: "provider unavailable", status: 503 },
    });
    const onError = vi.fn();

    render(<GoogleOAuthButton onError={onError} />);
    fireEvent.click(screen.getByRole("button", { name: /המשך עם Google/ }));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith("לא הצלחנו להתחבר באמצעות Google. נסו שוב."),
    );
    expect(
      (screen.getByRole("button", { name: /המשך עם Google/ }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("routes stored roles deterministically and keeps roleless users outside protected areas", () => {
    expect(getAuthenticatedDestination("customer")).toBe("/app");
    expect(getAuthenticatedDestination("admin")).toBe("/app");
    expect(getAuthenticatedDestination("supplier")).toBe("/supplier");
    expect(getAuthenticatedDestination(null)).toBe("/register");
    expect(getRegistrationCompletionDestination("customer")).toBe("/app");
    expect(getRegistrationCompletionDestination("supplier")).toBe("/supplier/profile");
  });

  it("uses only the supplied origin and does not accept an unsafe return destination", () => {
    expect(getGoogleOAuthRedirectUrl("https://preview.example")).toBe(
      "https://preview.example/auth/callback",
    );
    expect(getOAuthCallbackError("?returnTo=https://evil.example", "")).toBeNull();
    expect(getOAuthCallbackError("?error_description=access_denied", "")).toBe("access_denied");
  });

  it("keeps existing roles, allows only explicit customer/supplier completion, and blocks races", () => {
    expect(migration).toContain("_requested_role IN ('customer', 'supplier')");
    expect(migration).toContain("IF _existing_role IS NOT NULL THEN");
    expect(migration).toContain("RETURN _existing_role;");
    expect(migration).toContain("FROM auth.users");
    expect(migration).toContain("FOR UPDATE;");
    expect(migration).toContain(
      "_role NOT IN ('customer'::public.app_role, 'supplier'::public.app_role)",
    );
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.complete_registration_role");
    expect(migration).toContain("TO authenticated, service_role");
  });

  it("preserves email/password authentication in the existing routes", () => {
    const login = readFileSync(resolve(process.cwd(), "src/routes/login.tsx"), "utf8");
    const register = readFileSync(resolve(process.cwd(), "src/routes/register.tsx"), "utf8");

    expect(login).toContain("signInWithPassword");
    expect(register).toContain("signUp");
    expect(register).toContain("data: { display_name: displayName, role }");
    expect(login).toContain("GoogleOAuthButton");
    expect(register).toContain("GoogleOAuthButton");
    expect(register).toContain("איך תרצו להשתמש ב־Bidly?");
    expect(register).toContain("אני מחפש נותן שירות");
    expect(register).toContain("אני נותן שירות");
    expect(register).toContain("getRegistrationCompletionDestination(resolvedRole)");
  });
});
