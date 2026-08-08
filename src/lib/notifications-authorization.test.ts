import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const baseSql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260714174001_8f9302f1-06cc-45d7-a79d-c3c5389cd611.sql",
  ),
  "utf8",
);
const hardeningSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260718120000_supplier_phase_gate6_hardening.sql"),
  "utf8",
);

describe("notification authorization", () => {
  it("allows authenticated users to read only their own notifications", () => {
    expect(baseSql).toContain('CREATE POLICY "Users read own notifications"');
    expect(baseSql).toContain("USING (user_id = auth.uid())");
    expect(baseSql).not.toContain("GRANT INSERT ON public.notifications TO authenticated");
  });

  it("limits user-authored updates to read_at", () => {
    expect(hardeningSql).toContain("REVOKE UPDATE ON public.notifications FROM authenticated");
    expect(hardeningSql).toContain(
      "GRANT UPDATE (read_at) ON public.notifications TO authenticated",
    );
    expect(baseSql).toContain("CREATE OR REPLACE FUNCTION public.guard_notification_update()");
  });
});
