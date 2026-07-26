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
const createdCatalog = {
  categories: [],
  subcategories: [],
  services: [],
  serviceAreas: [],
};

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
  {
    areaId,
    mode = "on_site",
    categoryId = env.CORE_TEST_CATEGORY_ID,
    subcategoryId = env.CORE_TEST_SUBCATEGORY_ID,
    serviceId = env.CORE_TEST_ONSITE_SERVICE_ID,
  },
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
      category_id: categoryId,
    }),
    "select category",
  );
  await must(
    actor.client.from("supplier_subcategories").insert({
      supplier_id: actor.id,
      subcategory_id: subcategoryId,
      is_primary: true,
    }),
    "select profession",
  );
  await must(
    actor.client.from("supplier_services").insert({
      supplier_id: actor.id,
      subcategory_id: subcategoryId,
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

async function createTaxonomyFixture() {
  const slug = runId.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const categoryA = await must(
    admin
      .from("categories")
      .insert({
        slug: `core-taxonomy-a-${slug}`,
        name_he: `בדיקת שרשרת א ${slug}`,
        sort_order: 9000,
        is_active: true,
      })
      .select("id")
      .single(),
    "create taxonomy category A",
  );
  const categoryB = await must(
    admin
      .from("categories")
      .insert({
        slug: `core-taxonomy-b-${slug}`,
        name_he: `בדיקת שרשרת ב ${slug}`,
        sort_order: 9001,
        is_active: true,
      })
      .select("id")
      .single(),
    "create taxonomy category B",
  );
  createdCatalog.categories.push(categoryA.id, categoryB.id);

  const professionA = await must(
    admin
      .from("subcategories")
      .insert({
        category_id: categoryA.id,
        slug: `core-profession-a-${slug}`,
        name_he: `מקצוע בדיקה א ${slug}`,
        sort_order: 9000,
        is_active: true,
      })
      .select("id")
      .single(),
    "create taxonomy profession A",
  );
  const professionB = await must(
    admin
      .from("subcategories")
      .insert({
        category_id: categoryB.id,
        slug: `core-profession-b-${slug}`,
        name_he: `מקצוע בדיקה ב ${slug}`,
        sort_order: 9001,
        is_active: true,
      })
      .select("id")
      .single(),
    "create taxonomy profession B",
  );
  createdCatalog.subcategories.push(professionA.id, professionB.id);

  const serviceA = await must(
    admin
      .from("services")
      .insert({
        subcategory_id: professionA.id,
        slug: `core-service-a-${slug}`,
        name_he: `שירות בדיקה א ${slug}`,
        sort_order: 9000,
        is_active: true,
        supports_remote: true,
      })
      .select("id")
      .single(),
    "create taxonomy service A",
  );
  const serviceB = await must(
    admin
      .from("services")
      .insert({
        subcategory_id: professionB.id,
        slug: `core-service-b-${slug}`,
        name_he: `שירות בדיקה ב ${slug}`,
        sort_order: 9001,
        is_active: true,
        supports_remote: false,
      })
      .select("id")
      .single(),
    "create taxonomy service B",
  );
  createdCatalog.services.push(serviceA.id, serviceB.id);

  const serviceArea = await must(
    admin
      .from("service_areas")
      .insert({
        slug: `core-area-${slug}`,
        name_he: `אזור בדיקה ${slug}`,
        sort_order: 9000,
        is_active: true,
      })
      .select("id")
      .single(),
    "create taxonomy Service Area",
  );
  createdCatalog.serviceAreas.push(serviceArea.id);

  return {
    categoryA: categoryA.id,
    categoryB: categoryB.id,
    professionA: professionA.id,
    professionB: professionB.id,
    serviceA: serviceA.id,
    serviceB: serviceB.id,
    serviceArea: serviceArea.id,
  };
}

async function assertTaxonomyMatchVisible(supplier, requestId, label) {
  assert(
    (await activeRequestIds(supplier)).includes(requestId),
    `${label}: Supplier projection should contain the Request`,
  );
  const match = await must(
    admin
      .from("matches")
      .select("status")
      .eq("request_id", requestId)
      .eq("supplier_id", supplier.id)
      .single(),
    `${label}: inspect active Match`,
  );
  assert.equal(match.status, "active", `${label}: Match should be active`);
}

async function assertTaxonomyMatchInvalidated(supplier, requestId, storagePath, label) {
  assert(
    !(await activeRequestIds(supplier)).includes(requestId),
    `${label}: Supplier projection must not contain the Request`,
  );
  const match = await must(
    admin
      .from("matches")
      .select("status")
      .eq("request_id", requestId)
      .eq("supplier_id", supplier.id)
      .single(),
    `${label}: inspect inactive Match`,
  );
  assert.equal(match.status, "inactive", `${label}: Match should be inactive`);

  const attachmentRows = await must(
    supplier.client.from("request_attachments").select("id").eq("request_id", requestId),
    `${label}: read attachment metadata`,
  );
  assert.equal(attachmentRows.length, 0, `${label}: attachment metadata must be hidden`);

  const storageRead = await supplier.client.storage
    .from("request-attachments")
    .download(storagePath);
  assert(storageRead.error, `${label}: Storage download should be denied`);

  await mustDeny(
    supplier.client.rpc("submit_offer", {
      _request_id: requestId,
      _price: 1200,
      _estimated_days: 4,
      _message: `Taxonomy invalidation denial check: ${label}.`,
    }),
    `${label}: Offer submission`,
  );
}

async function run() {
  console.log(`Core runtime target: ${url.origin}`);

  const taxonomy = await createTaxonomyFixture();
  const [
    customerA,
    customerB,
    supplierInA,
    supplierInB,
    supplierOut,
    supplierRemote,
    legacy,
    taxonomyCustomer,
    taxonomySupplier,
  ] = await Promise.all([
    createActor("customer", "customer-a"),
    createActor("customer", "customer-b"),
    createActor("supplier", "supplier-in-a"),
    createActor("supplier", "supplier-in-b"),
    createActor("supplier", "supplier-out"),
    createActor("supplier", "supplier-remote"),
    createActor("supplier", "supplier-legacy"),
    createActor("customer", "customer-taxonomy"),
    createActor("supplier", "supplier-taxonomy"),
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
    setupSupplier(taxonomySupplier, {
      areaId: taxonomy.serviceArea,
      mode: "both",
      categoryId: taxonomy.categoryA,
      subcategoryId: taxonomy.professionA,
      serviceId: taxonomy.serviceA,
    }),
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
    must(taxonomySupplier.client.rpc("submit_supplier_onboarding"), "submit taxonomy supplier"),
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

  const taxonomyRequestId = await acquireDraft(taxonomyCustomer);
  await saveDraft(taxonomyCustomer, taxonomyRequestId, {
    category_id: taxonomy.categoryA,
    subcategory_id: taxonomy.professionA,
    service_id: taxonomy.serviceA,
    missing_service_text: null,
    delivery_mode: "on_site",
    service_area_id: taxonomy.serviceArea,
    title: "Taxonomy invalidation request",
    description:
      "Disposable Request proving that live governed taxonomy controls Match authorization.",
    city: "Taxonomy test locality",
    budget_type: "fixed",
    budget_min: 1200,
    budget_max: 1200,
  });
  const taxonomyAttachmentPath = `${taxonomyCustomer.id}/${taxonomyRequestId}/taxonomy-chain.pdf`;
  storagePaths.push(taxonomyAttachmentPath);
  await must(
    taxonomyCustomer.client.storage
      .from("request-attachments")
      .upload(taxonomyAttachmentPath, new Blob(["%PDF-taxonomy"]), {
        contentType: "application/pdf",
        upsert: false,
      }),
    "upload taxonomy Request attachment",
  );
  await must(
    taxonomyCustomer.client.from("request_attachments").insert({
      request_id: taxonomyRequestId,
      storage_path: taxonomyAttachmentPath,
      file_name: "taxonomy-chain.pdf",
      mime_type: "application/pdf",
      size_bytes: 13,
    }),
    "insert taxonomy Request attachment metadata",
  );
  await must(
    taxonomyCustomer.client.rpc("publish_request", {
      _request_id: taxonomyRequestId,
    }),
    "publish taxonomy Request",
  );
  await assertTaxonomyMatchVisible(
    taxonomySupplier,
    taxonomyRequestId,
    "initial valid taxonomy chain",
  );
  const initialAttachmentRows = await must(
    taxonomySupplier.client
      .from("request_attachments")
      .select("id")
      .eq("request_id", taxonomyRequestId),
    "read initially authorized attachment metadata",
  );
  assert.equal(initialAttachmentRows.length, 1);
  await must(
    taxonomySupplier.client.storage.from("request-attachments").download(taxonomyAttachmentPath),
    "download initially authorized attachment",
  );

  const unrelatedTaxonomyRequestId = await acquireDraft(taxonomyCustomer);
  await saveDraft(taxonomyCustomer, unrelatedTaxonomyRequestId, {
    category_id: taxonomy.categoryB,
    subcategory_id: taxonomy.professionB,
    service_id: taxonomy.serviceB,
    missing_service_text: null,
    delivery_mode: "on_site",
    service_area_id: taxonomy.serviceArea,
    title: "Unselected taxonomy request",
    description:
      "Disposable Request proving that restored catalog rows do not create unselected eligibility.",
    city: "Taxonomy test locality",
    budget_type: "open",
    budget_min: null,
    budget_max: null,
  });
  await must(
    taxonomyCustomer.client.rpc("publish_request", {
      _request_id: unrelatedTaxonomyRequestId,
    }),
    "publish unselected taxonomy Request",
  );
  assert(
    !(await activeRequestIds(taxonomySupplier)).includes(unrelatedTaxonomyRequestId),
    "Supplier must not match an unselected taxonomy chain",
  );

  await must(
    admin.from("categories").update({ is_active: false }).eq("id", taxonomy.categoryA),
    "deactivate taxonomy category",
  );
  await assertTaxonomyMatchInvalidated(
    taxonomySupplier,
    taxonomyRequestId,
    taxonomyAttachmentPath,
    "Category deactivation",
  );
  await must(
    admin.from("categories").update({ is_active: true }).eq("id", taxonomy.categoryA),
    "restore taxonomy category",
  );
  await assertTaxonomyMatchVisible(taxonomySupplier, taxonomyRequestId, "restored Category");

  await must(
    admin
      .from("supplier_subcategories")
      .update({ is_primary: false })
      .eq("supplier_id", taxonomySupplier.id)
      .eq("subcategory_id", taxonomy.professionA),
    "clear taxonomy Supplier primary Profession",
  );
  await assertTaxonomyMatchInvalidated(
    taxonomySupplier,
    taxonomyRequestId,
    taxonomyAttachmentPath,
    "Supplier primary Profession removal",
  );
  await must(
    admin
      .from("supplier_subcategories")
      .update({ is_primary: true })
      .eq("supplier_id", taxonomySupplier.id)
      .eq("subcategory_id", taxonomy.professionA),
    "restore taxonomy Supplier primary Profession",
  );
  await assertTaxonomyMatchVisible(
    taxonomySupplier,
    taxonomyRequestId,
    "restored Supplier primary Profession",
  );

  await must(
    admin.from("subcategories").update({ is_active: false }).eq("id", taxonomy.professionA),
    "deactivate taxonomy profession",
  );
  await assertTaxonomyMatchInvalidated(
    taxonomySupplier,
    taxonomyRequestId,
    taxonomyAttachmentPath,
    "Profession deactivation",
  );
  await must(
    admin.from("subcategories").update({ is_active: true }).eq("id", taxonomy.professionA),
    "restore taxonomy profession",
  );
  await assertTaxonomyMatchVisible(taxonomySupplier, taxonomyRequestId, "restored Profession");

  await must(
    admin
      .from("subcategories")
      .update({ category_id: taxonomy.categoryB })
      .eq("id", taxonomy.professionA),
    "move taxonomy profession",
  );
  await assertTaxonomyMatchInvalidated(
    taxonomySupplier,
    taxonomyRequestId,
    taxonomyAttachmentPath,
    "Profession move",
  );
  await must(
    admin
      .from("subcategories")
      .update({ category_id: taxonomy.categoryA })
      .eq("id", taxonomy.professionA),
    "restore taxonomy profession parent",
  );
  await assertTaxonomyMatchVisible(
    taxonomySupplier,
    taxonomyRequestId,
    "restored Profession parent",
  );

  await must(
    admin.from("services").update({ is_active: false }).eq("id", taxonomy.serviceA),
    "deactivate taxonomy Service",
  );
  await assertTaxonomyMatchInvalidated(
    taxonomySupplier,
    taxonomyRequestId,
    taxonomyAttachmentPath,
    "Service deactivation",
  );
  await must(
    admin.from("services").update({ is_active: true }).eq("id", taxonomy.serviceA),
    "restore taxonomy Service",
  );
  await assertTaxonomyMatchVisible(taxonomySupplier, taxonomyRequestId, "restored Service");

  await must(
    admin
      .from("services")
      .update({ subcategory_id: taxonomy.professionB })
      .eq("id", taxonomy.serviceA),
    "move taxonomy Service",
  );
  const staleSelection = await must(
    admin
      .from("supplier_services")
      .select("subcategory_id")
      .eq("supplier_id", taxonomySupplier.id)
      .eq("service_id", taxonomy.serviceA)
      .single(),
    "inspect stale Supplier Service selection",
  );
  assert.equal(
    staleSelection.subcategory_id,
    taxonomy.professionA,
    "the stale Supplier row remains present for the authorization regression",
  );
  await assertTaxonomyMatchInvalidated(
    taxonomySupplier,
    taxonomyRequestId,
    taxonomyAttachmentPath,
    "Service move with stale Supplier taxonomy row",
  );
  await must(
    admin
      .from("services")
      .update({ subcategory_id: taxonomy.professionA })
      .eq("id", taxonomy.serviceA),
    "restore taxonomy Service parent",
  );
  await assertTaxonomyMatchVisible(taxonomySupplier, taxonomyRequestId, "restored Service parent");

  const remoteTaxonomyRequestId = await acquireDraft(taxonomyCustomer);
  await saveDraft(taxonomyCustomer, remoteTaxonomyRequestId, {
    category_id: taxonomy.categoryA,
    subcategory_id: taxonomy.professionA,
    service_id: taxonomy.serviceA,
    missing_service_text: null,
    delivery_mode: "remote",
    service_area_id: null,
    title: "Remote taxonomy request",
    description:
      "Disposable remote Request proving that governed remote support changes reconcile Matches.",
    city: "Remote taxonomy locality",
    budget_type: "open",
    budget_min: null,
    budget_max: null,
  });
  await must(
    taxonomyCustomer.client.rpc("publish_request", {
      _request_id: remoteTaxonomyRequestId,
    }),
    "publish remote taxonomy Request",
  );
  await assertTaxonomyMatchVisible(
    taxonomySupplier,
    remoteTaxonomyRequestId,
    "initial remote-support eligibility",
  );
  await must(
    admin.from("services").update({ supports_remote: false }).eq("id", taxonomy.serviceA),
    "disable taxonomy Service remote support",
  );
  assert(
    !(await activeRequestIds(taxonomySupplier)).includes(remoteTaxonomyRequestId),
    "remote-support removal must remove the remote Request from the projection",
  );
  await assertTaxonomyMatchVisible(
    taxonomySupplier,
    taxonomyRequestId,
    "on-site Match after remote-support removal",
  );
  await must(
    admin.from("services").update({ supports_remote: true }).eq("id", taxonomy.serviceA),
    "restore taxonomy Service remote support",
  );
  await assertTaxonomyMatchVisible(
    taxonomySupplier,
    remoteTaxonomyRequestId,
    "restored remote-support eligibility",
  );

  await must(
    admin.from("service_areas").update({ is_active: false }).eq("id", taxonomy.serviceArea),
    "deactivate taxonomy Service Area",
  );
  await assertTaxonomyMatchInvalidated(
    taxonomySupplier,
    taxonomyRequestId,
    taxonomyAttachmentPath,
    "Service Area deactivation",
  );
  await must(
    admin.from("service_areas").update({ is_active: true }).eq("id", taxonomy.serviceArea),
    "restore taxonomy Service Area",
  );
  await assertTaxonomyMatchVisible(taxonomySupplier, taxonomyRequestId, "restored Service Area");
  assert(
    !(await activeRequestIds(taxonomySupplier)).includes(unrelatedTaxonomyRequestId),
    "restoring a valid chain must not broaden explicit Supplier selections",
  );

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
  if (createdCatalog.services.length) {
    await admin.from("services").delete().in("id", createdCatalog.services);
  }
  if (createdCatalog.serviceAreas.length) {
    await admin.from("service_areas").delete().in("id", createdCatalog.serviceAreas);
  }
  if (createdCatalog.subcategories.length) {
    await admin.from("subcategories").delete().in("id", createdCatalog.subcategories);
  }
  if (createdCatalog.categories.length) {
    await admin.from("categories").delete().in("id", createdCatalog.categories);
  }
}
