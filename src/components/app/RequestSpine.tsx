import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * RequestSpine — the core visual motif that threads a single request
 * across every surface (request card, offer card, comparison column).
 * Navy by default, emerald + thicker when this surface represents the
 * selected/winning offer.
 */
export function RequestSpine({
  tone = "navy",
  children,
  className,
}: {
  tone?: "navy" | "emerald";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        tone === "emerald" ? "request-spine-emerald" : "request-spine-navy",
        "ps-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
