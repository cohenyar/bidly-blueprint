import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260808100000_customer_offer_supplier_portfolio_projection.sql",
  ),
  "utf8",
);

describe("contextual Supplier portfolio projection migration", () => {
  it("keeps the customer Offer projection request-owner scoped", () => {
    expect(sql).toContain("public.has_role(auth.uid(), 'customer')");
    expect(sql).toContain("request_row.customer_id = auth.uid()");
    expect(sql).toContain("portfolio_links text[]");
    expect(sql).toContain("COALESCE(profile_row.portfolio_links, '{}'::text[])");
  });

  it("limits private image reads to the exact offering Supplier and stored path", () => {
    expect(sql).toContain("bucket_id = 'supplier-portfolio-images'");
    expect(sql).toContain("offer_row.supplier_id::text = (storage.foldername(name))[1]");
    expect(sql).toContain("name = ANY(profile_row.portfolio_links)");
    expect(sql).not.toContain("FOR ALL");
  });

  it("retains hardened function execution settings", () => {
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = public");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.get_customer_request_offers(uuid)");
    expect(sql).toContain("TO authenticated, service_role");
  });
});
