import type { AppRole } from "@/lib/auth-context";

export type AuthDestination = "/app" | "/supplier" | "/register";

export function getAuthenticatedDestination(role: AppRole | null): AuthDestination {
  if (role === "supplier") return "/supplier";
  if (role === "customer" || role === "admin") return "/app";
  return "/register";
}

export function getRegistrationCompletionDestination(role: AppRole): "/app" | "/supplier/profile" {
  return role === "supplier" ? "/supplier/profile" : "/app";
}

export function getGoogleOAuthRedirectUrl(origin: string): string {
  return new URL("/auth/callback", origin).toString();
}

export function getOAuthCallbackError(search: string, hash: string): string | null {
  const searchParams = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  const error =
    searchParams.get("error_description") ??
    searchParams.get("error") ??
    hashParams.get("error_description") ??
    hashParams.get("error");

  return error?.trim() || null;
}
