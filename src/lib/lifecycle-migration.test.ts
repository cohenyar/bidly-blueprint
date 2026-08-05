import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260801101000_request_cancellation_offer_update.sql",
  ),
  "utf8",
);

describe("Request cancellation and submitted Offer update migration", () => {
  it("keeps cancellation owner-, role-, publication-, and status-scoped", () => {
    expect(migration).toContain("public.has_role(auth.uid(), 'customer')");
    expect(migration).toContain("_request.customer_id <> auth.uid()");
    expect(migration).toContain("_request.published_at IS NULL OR _request.status <> 'open'");
    expect(migration).toContain("SET status = 'cancelled'");
  });

  it("removes direct browser Offer updates and exposes only the controlled RPC", () => {
    expect(migration).toContain("REVOKE UPDATE ON public.offers FROM authenticated");
    expect(migration).toContain("REVOKE UPDATE (price, estimated_days, message, status)");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.update_submitted_offer(");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = public");
    expect(migration).toContain("FROM PUBLIC, anon");
    expect(migration).toContain("TO authenticated, service_role");
  });

  it("requires owner, submitted status, open published Request, and active authorization", () => {
    expect(migration).toContain("offer_row.supplier_id = auth.uid()");
    expect(migration).toContain("_offer.status <> 'submitted'");
    expect(migration).toContain("_request.published_at IS NULL OR _request.status <> 'open'");
    expect(migration).toContain("public._match_authorizes_supplier(auth.uid(), _request.id)");
  });

  it("updates only mutable Offer content without inserting a duplicate", () => {
    expect(migration).toContain("UPDATE public.offers");
    expect(migration).not.toContain("INSERT INTO public.offers");
    expect(migration).toContain("SET price = _price");
    expect(migration).toContain("estimated_days = _estimated_days");
    expect(migration).toContain("message = _normalized_message");
    expect(migration).toContain("updated_at = now()");
  });

  it("preserves positive price, valid days, optional message, and terminal immutability", () => {
    expect(migration).toContain("_price IS NULL OR _price <= 0");
    expect(migration).toContain("_estimated_days < 1");
    expect(migration).toContain("_estimated_days > 365");
    expect(migration).toContain("btrim(COALESCE(_message, ''))");
    expect(migration).toContain("char_length(_normalized_message) > 2000");
    expect(migration).toContain("OLD.status <> 'submitted'");
  });
});
