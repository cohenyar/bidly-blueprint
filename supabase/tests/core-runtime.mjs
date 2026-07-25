import assert from "node:assert/strict";

import { createClient } from "@supabase/supabase-js";

const env = process.env;
const required = [
  "CORE_TEST_SUPABASE_URL",
  "CORE_TEST_ANON_KEY",
  "CORE_TEST_SERVICE_ROLE_KEY",
  "CORE_TEST_CATEGORY_ID",
  "CORE_TEST_SUBCATEGORY_ID",
  "CORE_TEST_ONSITE_SERVICE_ID",
  "CORE_TEST_REMOTE_SERVICE_ID",
  "CORE_TEST_AREA_IN_ID",
  "CORE_TEST_AREA_OUT_ID",
];
const missing = required.filter((name) => !env[name]);
if (missing.length) {
  throw new Error(`Missing runtime-test environment: ${missing.join(", ")}`);
}

const url = new URL(env.CORE_TEST_SUPABASE_URL);
const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
if (!localHosts.has(url.hostname) && env.CORE_TEST_CONFIRM_DISPOSABLE !== "YES_I_UNDERSTAND") {
  throw new Error(
    `Refusing non-local target ${url.origin}. Confirm a disposable project with ` +
      "CORE_TEST_CONFIRM_DISPOSABLE=YES_I_UNDERSTAND.",
  );
}
if (/prod|production/i.test(url.hostname)) {
  throw new Error(`Refusing production-looking target ${url.origin}`);
}

const admin = createClient(url.origin, env.CORE_TEST_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anonKey = env.CORE_TEST_ANON_KEY;
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = `Core-${crypto.randomUUID()}!aA1`;
const createdUsers = [];
const storagePaths = [];

function client() {
  return createClient(url.origin, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function must(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function mustDeny(promise, label) {
  const result = await promise;
  assert(result.error, `${label}: expected denial`);
}

async function createActor(role, label) {
  const email = `core-${runId}-${label}@example.invalid`;
  const data = await must(
    admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: `Core ${label}`, role },
    }),
    `create ${label}`,
  );
  createdUsers.push(data.user.id);
  const actor = client();
  await must(actor.auth.signInWithPassword({ email, password }), `sign in ${label}`);
  return { client: actor, id: data.user.id };
}

async function setupSupplier(
  actor,
  { areaId, mode = "on_site", serviceId = env.CORE_TEST_ONSITE_SERVICE_ID },
) {
  await must(
    actor.client.from("supplier_profiles").upsert({
      user_id: actor.id,
      business_name: `Core supplier ${actor.id.slice(0, 8)}`,
      business_type: "independent",
      description: "Disposable integration-test supplier profile with governed data.",
      base_city: "Test locality",
      service_mode: mode,
      max_travel_km: mode === "remote" ? null : 25,
      remote_available: mode !== "on_site",
      service_area: "Legacy compatibility text",
      years_experience: 5,
      portfolio_links: [],
    }),
    "save supplier profile",
  );
  await must(
    actor.client.from("supplier_categories").insert({
      supplier_id: actor.id,
      category_id: env.CORE_TEST_CATEGORY_ID,
    }),
    "select category",
  );
  await must(
    actor.client.from("supplier_subcategories").insert({
      supplier_id: actor.id,
      subcategory_id: env.CORE_TEST_SUBCATEGORY_ID,
      is_primary: true,
    }),
    "select profession",
  );
  await must(
    actor.client.from("supplier_services").insert({
      supplier_id: actor.id,
      subcategory_id: env.CORE_TEST_SUBCATEGORY_ID,
      service_id: serviceId,
    }),
    "select service",
  );
  if (areaId) {
    await must(
      actor.client.from("supplier_service_areas").insert({
        supplier_id: actor.id,
        service_area_id: areaId,
      }),
      "select service area",
    );
  }
}

async function acquireDraft(customer) {
  return must(customer.client.rpc("get_or_create_request_draft"), "acquire draft");
}

async function saveDraft(customer, id, fields) {
  await must(
    customer.client
      .from("requests")
      .update(fields)
      .eq("id", id)
      .is("published_at", null)
      .select("id")
      .single(),
    "save draft",
  );
}

async function activeRequestIds(supplier) {
  const rows = await must(
    supplier.client.rpc("get_active_supplier_requests"),
    "read active Supplier Requests",
  );
  return rows.map((row) => row.id);
}

async function run() {
  console.log(`Core runtime target: ${url.origin}`);

  const [customerA, customerB, supplierInA, supplierInB, supplierOut, supplierRemote, legacy] =
    await Promise.all([
      createActor("customer", "customer-a"),
      createActor("customer", "customer-b"),
      createActor("supplier", "supplier-in-a"),
      createActor("supplier", "supplier-in-b"),
      createActor("supplier", "supplier-out"),
      createActor("supplier", "supplier-remote"),
      createActor("supplier", "supplier-legacy"),
    ]);

  await Promise.all([
    setupSupplier(supplierInA, { areaId: env.CORE_TEST_AREA_IN_ID }),
    setupSupplier(supplierInB, { areaId: env.CORE_TEST_AREA_IN_ID }),
    setupSupplier(supplierOut, { areaId: env.CORE_TEST_AREA_OUT_ID }),
    setupSupplier(supplierRemote, {
      areaId: null,
      mode: "remote",
      serviceId: env.CORE_TEST_REMOTE_SERVICE_ID,
    }),
    setupSupplier(legacy, { areaId: env.CORE_TEST_AREA_IN_ID }),
  ]);

  await must(
    admin
      .from("supplier_onboarding_state")
      .update({ eligibility_policy: "legacy", submitted_at: null })
      .eq("supplier_id", legacy.id),
    "mark legacy fixture",
  );
  await Promise.all([
    must(supplierInA.client.rpc("submit_supplier_onboarding"), "submit supplier A"),
    must(supplierInB.client.rpc("submit_supplier_onboarding"), "submit supplier B"),
    must(supplierOut.client.rpc("submit_supplier_onboarding"), "submit out-area supplier"),
    must(supplierRemote.client.rpc("submit_supplier_onboarding"), "submit remote supplier"),
  ]);

  const acquired = await Promise.all([acquireDraft(customerA), acquireDraft(customerA)]);
  assert.equal(acquired[0], acquired[1], "concurrent Draft acquisition is idempotent");
  const onsiteRequestId = acquired[0];

  await saveDraft(customerA, onsiteRequestId, {
    category_id: env.CORE_TEST_CATEGORY_ID,
    subcategory_id: env.CORE_TEST_SUBCATEGORY_ID,
    service_id: env.CORE_TEST_ONSITE_SERVICE_ID,
    missing_service_text: null,
    delivery_mode: "on_site",
    service_area_id: env.CORE_TEST_AREA_IN_ID,
    title: "Core on-site request",
    description: "Disposable Core integration Request with enough detail to publish safely.",
    city: "Display city only",
    budget_type: "fixed",
    budget_min: 1000,
    budget_max: 1000,
  });

  const beforePath = `${customerA.id}/${onsiteRequestId}/before-publication.pdf`;
  storagePaths.push(beforePath);
  await must(
    customerA.client.storage
      .from("request-attachments")
      .upload(beforePath, new Blob(["%PDF-test"]), {
        contentType: "application/pdf",
        upsert: false,
      }),
    "upload draft attachment",
  );
  await must(
    customerA.client.from("request_attachments").insert({
      request_id: onsiteRequestId,
      storage_path: beforePath,
      file_name: "before-publication.pdf",
      mime_type: "application/pdf",
      size_bytes: 9,
    }),
    "insert draft attachment metadata",
  );

  const publication = await Promise.all([
    customerA.client.rpc("publish_request", { _request_id: onsiteRequestId }),
    customerA.client.rpc("publish_request", { _request_id: onsiteRequestId }),
  ]);
  publication.forEach((result) => assert.ifError(result.error));
  assert.equal(publication[0].data, onsiteRequestId);
  assert.equal(publication[1].data, onsiteRequestId);

  await mustDeny(
    customerA.client
      .from("requests")
      .update({ title: "forged published edit" })
      .eq("id", onsiteRequestId),
    "published Request mutation",
  );
  await mustDeny(
    customerA.client.from("request_attachments").insert({
      request_id: onsiteRequestId,
      storage_path: `${customerA.id}/${onsiteRequestId}/after.pdf`,
      file_name: "after.pdf",
      mime_type: "application/pdf",
      size_bytes: 4,
    }),
    "published attachment metadata insert",
  );
  await mustDeny(
    customerA.client.storage
      .from("request-attachments")
      .upload(`${customerA.id}/${onsiteRequestId}/after.pdf`, new Blob(["test"]), {
        contentType: "application/pdf",
      }),
    "published Storage upload",
  );

  assert((await activeRequestIds(supplierInA)).includes(onsiteRequestId));
  assert((await activeRequestIds(supplierInB)).includes(onsiteRequestId));
  assert(!(await activeRequestIds(supplierOut)).includes(onsiteRequestId));
  assert(!(await activeRequestIds(supplierRemote)).includes(onsiteRequestId));

  await mustDeny(
    supplierOut.client.rpc("submit_offer", {
      _request_id: onsiteRequestId,
      _price: 900,
      _estimated_days: 2,
      _message: "This unmatched Supplier must not be able to submit this Offer.",
    }),
    "unmatched Supplier Offer",
  );

  await must(
    admin
      .from("matches")
      .update({ status: "inactive" })
      .eq("request_id", onsiteRequestId)
      .eq("supplier_id", supplierInA.id),
    "deactivate Match",
  );
  await mustDeny(
    supplierInA.client.rpc("submit_offer", {
      _request_id: onsiteRequestId,
      _price: 1000,
      _estimated_days: 2,
      _message: "An inactive Match must deny submission even for an eligible Supplier.",
    }),
    "inactive Match Offer",
  );
  await must(
    admin
      .from("matches")
      .update({ status: "active" })
      .eq("request_id", onsiteRequestId)
      .eq("supplier_id", supplierInA.id),
    "reactivate test Match",
  );

  const offerA = await must(
    supplierInA.client.rpc("submit_offer", {
      _request_id: onsiteRequestId,
      _price: 1000,
      _estimated_days: 2,
      _message: "First valid immutable Offer for the Core concurrency test.",
    }),
    "submit Offer A",
  );
  const offerB = await must(
    supplierInB.client.rpc("submit_offer", {
      _request_id: onsiteRequestId,
      _price: 1100,
      _estimated_days: 3,
      _message: "Second valid immutable Offer for the Core concurrency test.",
    }),
    "submit Offer B",
  );
  await mustDeny(
    supplierInA.client.from("offers").update({ price: 1 }).eq("id", offerA),
    "submitted Offer mutation",
  );

  const otherCustomerRequest = await must(
    customerB.client.from("requests").select("id").eq("id", onsiteRequestId),
    "cross-Customer Request read",
  );
  assert.equal(otherCustomerRequest.length, 0);
  const otherCustomerOffers = await must(
    customerB.client.rpc("get_customer_request_offers", {
      _request_id: onsiteRequestId,
    }),
    "cross-Customer Offer projection",
  );
  assert.equal(otherCustomerOffers.length, 0);
  await mustDeny(
    customerB.client.rpc("select_offer", { _offer_id: offerA }),
    "cross-Customer selection",
  );

  const decisions = await Promise.allSettled([
    customerA.client.rpc("select_offer", { _offer_id: offerA }),
    customerA.client.rpc("select_offer", { _offer_id: offerB }),
  ]);
  const successfulDecisions = decisions.filter(
    (decision) => decision.status === "fulfilled" && !decision.value.error,
  );
  assert.equal(successfulDecisions.length, 1, "exactly one concurrent selection succeeds");
  const selectedRows = await must(
    admin.from("offers").select("id").eq("request_id", onsiteRequestId).eq("status", "selected"),
    "inspect selected Offers",
  );
  assert.equal(selectedRows.length, 1);
  await must(
    customerA.client.rpc("close_request", { _request_id: onsiteRequestId }),
    "close awarded Request",
  );

  const remoteRequestId = await acquireDraft(customerA);
  await saveDraft(customerA, remoteRequestId, {
    category_id: env.CORE_TEST_CATEGORY_ID,
    subcategory_id: env.CORE_TEST_SUBCATEGORY_ID,
    service_id: env.CORE_TEST_REMOTE_SERVICE_ID,
    missing_service_text: null,
    delivery_mode: "remote",
    service_area_id: null,
    title: "Core remote request",
    description: "Disposable remote Core integration Request with governed Service eligibility.",
    city: "Display locality only",
    budget_type: "open",
    budget_min: null,
    budget_max: null,
  });
  await must(
    customerA.client.rpc("publish_request", { _request_id: remoteRequestId }),
    "publish remote Request",
  );
  assert((await activeRequestIds(supplierRemote)).includes(remoteRequestId));
  assert(!(await activeRequestIds(supplierInA)).includes(remoteRequestId));

  await must(legacy.client.rpc("submit_supplier_onboarding"), "explicit legacy transition");
  const legacyState = await must(
    legacy.client
      .from("supplier_onboarding_state")
      .select("eligibility_policy, submitted_at")
      .single(),
    "read legacy transition state",
  );
  assert.equal(legacyState.eligibility_policy, "current");
  assert(legacyState.submitted_at);

  console.log("Core runtime integration suite passed.");
}

try {
  await run();
} finally {
  if (storagePaths.length) {
    await admin.storage.from("request-attachments").remove(storagePaths);
  }
  for (const userId of createdUsers.reverse()) {
    await admin.auth.admin.deleteUser(userId);
  }
}
