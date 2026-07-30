import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migrationUrl = new URL(
  "../migrations/20260728102000_supplier_onboarding_empty_catalog_compatibility.sql",
  import.meta.url,
);
const sql = readFileSync(migrationUrl, "utf8");
const normalizedSql = sql.replace(/--.*$/gm, "").replace(/\s+/g, " ");

assert.match(
  normalizedSql,
  /CREATE OR REPLACE FUNCTION public\._is_current_supplier_onboarding_data_complete\( _supplier_id uuid \) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public/,
);
assert.match(normalizedSql, /profession_row\.is_active/);
assert.match(normalizedSql, /category_row\.is_active/);
assert.match(normalizedSql, /service_row\.is_active/);
assert.match(normalizedSql, /profession_selection\.is_primary/);
assert.match(
  normalizedSql,
  /NOT catalog_state\.has_available_services OR public\._supplier_has_valid_service_selection\( _supplier_id, NULL \)/,
);
assert.match(
  normalizedSql,
  /profile_row\.service_mode = 'remote' AND \( NOT catalog_state\.has_available_services OR EXISTS/,
);
assert.match(
  normalizedSql,
  /profile_row\.service_mode IN \('on_site', 'both'\) AND \( NOT catalog_state\.has_available_service_areas OR EXISTS/,
);
assert.match(normalizedSql, /service_row\.supports_remote/);
assert.match(normalizedSql, /area_row\.is_active/);

for (const preservedProfileRule of [
  "profile_row.business_name",
  "profile_row.description",
  "profile_row.business_type",
  "profile_row.base_city",
  "profile_row.service_mode",
  "profile_row.remote_available",
  "profile_row.max_travel_km",
]) {
  assert.ok(
    normalizedSql.includes(preservedProfileRule),
    `Missing preserved profile rule: ${preservedProfileRule}`,
  );
}

for (const forbiddenChange of [
  "ALTER TABLE",
  "CREATE POLICY",
  "DROP POLICY",
  "CREATE TRIGGER",
  "DROP TRIGGER",
  "GRANT ",
  "REVOKE ",
  "submit_supplier_onboarding",
]) {
  assert.ok(!sql.includes(forbiddenChange), `Unexpected migration scope: ${forbiddenChange}`);
}

function isComplete({
  profileValid = true,
  taxonomyValid = true,
  hasAvailableServices,
  hasValidServiceSelection = false,
  serviceMode = "on_site",
  hasRemoteCompatibleSelection = false,
  hasAvailableAreas,
  hasActiveAreaSelection = false,
}) {
  const serviceComplete = !hasAvailableServices || hasValidServiceSelection;
  const coverageComplete =
    serviceMode === "remote"
      ? !hasAvailableServices || hasRemoteCompatibleSelection
      : !hasAvailableAreas || hasActiveAreaSelection;

  return profileValid && taxonomyValid && serviceComplete && coverageComplete;
}

assert.equal(
  isComplete({
    hasAvailableServices: false,
    hasAvailableAreas: false,
  }),
  true,
  "An empty managed Service catalog should allow completion",
);
assert.equal(
  isComplete({
    hasAvailableServices: true,
    hasAvailableAreas: false,
  }),
  false,
  "Available Services should require a valid explicit selection",
);
assert.equal(
  isComplete({
    hasAvailableServices: true,
    hasValidServiceSelection: true,
    hasAvailableAreas: false,
  }),
  true,
  "An empty managed Service Area catalog should allow on-site completion",
);
assert.equal(
  isComplete({
    hasAvailableServices: true,
    hasValidServiceSelection: true,
    hasAvailableAreas: true,
  }),
  false,
  "Available Service Areas should require an active explicit selection",
);
assert.equal(
  isComplete({
    hasAvailableServices: true,
    hasValidServiceSelection: true,
    serviceMode: "remote",
    hasRemoteCompatibleSelection: true,
    hasAvailableAreas: true,
  }),
  true,
  "Remote Suppliers should remain exempt from Service Area selection",
);
assert.equal(
  isComplete({
    taxonomyValid: false,
    hasAvailableServices: false,
    hasAvailableAreas: false,
  }),
  false,
  "Invalid taxonomy selections should remain incomplete",
);
assert.equal(
  isComplete({
    profileValid: false,
    hasAvailableServices: false,
    hasAvailableAreas: false,
  }),
  false,
  "Existing profile requirements should remain mandatory",
);

console.log("Supplier onboarding empty-catalog compatibility checks passed.");
