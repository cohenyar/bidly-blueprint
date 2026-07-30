import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migrationUrl = new URL(
  "../migrations/20260728103000_supplier_portfolio_image_storage.sql",
  import.meta.url,
);
const sql = readFileSync(migrationUrl, "utf8");
const normalizedSql = sql.replace(/--.*$/gm, "").replace(/\s+/g, " ");

assert.match(
  normalizedSql,
  /INSERT INTO storage\.buckets \( id, name, public, file_size_limit, allowed_mime_types \) VALUES \( 'supplier-portfolio-images', 'supplier-portfolio-images', false, 15 \* 1024 \* 1024,/,
);
for (const mimeType of ["image/jpeg", "image/png", "image/webp"]) {
  assert.ok(normalizedSql.includes(`'${mimeType}'`), `Missing MIME type ${mimeType}`);
}

for (const operation of ["INSERT", "SELECT", "DELETE"]) {
  assert.match(
    normalizedSql,
    new RegExp(
      `ON storage\\.objects FOR ${operation} TO authenticated [\\s\\S]*?bucket_id = 'supplier-portfolio-images'`,
    ),
  );
}
assert.match(normalizedSql, /storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
assert.match(normalizedSql, /public\.has_role\(auth\.uid\(\), 'supplier'\)/);

assert.match(
  normalizedSql,
  /CREATE OR REPLACE FUNCTION public\.validate_supplier_profile\(\) RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'/,
);
assert.match(normalizedSql, /\^https:\/\/\[\^\/\[:space:\]\]\+/);
assert.match(normalizedSql, /split_part\(link, '\/', 1\) = NEW\.user_id::text/);
assert.match(normalizedSql, /Invalid portfolio source/);

for (const preservedRule of [
  "business_name",
  "description",
  "service_area",
  "starting_price_ils",
  "years_experience",
  "Max 5 portfolio_links",
]) {
  assert.ok(normalizedSql.includes(preservedRule), `Missing profile rule: ${preservedRule}`);
}

for (const forbiddenChange of [
  "ALTER TABLE public.supplier_profiles",
  "CREATE TABLE public.",
  "DROP TABLE",
]) {
  assert.ok(
    !normalizedSql.includes(forbiddenChange),
    `Unexpected schema change: ${forbiddenChange}`,
  );
}

console.log("Supplier portfolio Storage migration checks passed.");
