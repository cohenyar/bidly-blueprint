# Core blocker runtime tests

`core-runtime.mjs` is an intentionally guarded integration suite for a local or
disposable Supabase project. It creates temporary Auth users and deletes them
after the run. Never point it at production.

Required environment variables:

- `CORE_TEST_SUPABASE_URL`
- `CORE_TEST_ANON_KEY`
- `CORE_TEST_SERVICE_ROLE_KEY`
- `CORE_TEST_CATEGORY_ID`
- `CORE_TEST_SUBCATEGORY_ID`
- `CORE_TEST_ONSITE_SERVICE_ID`
- `CORE_TEST_REMOTE_SERVICE_ID`
- `CORE_TEST_AREA_IN_ID`
- `CORE_TEST_AREA_OUT_ID`

The governed fixture must satisfy:

- Both Services are active and belong to the supplied Subcategory.
- The Subcategory belongs to the supplied Category.
- `CORE_TEST_REMOTE_SERVICE_ID` has `supports_remote = true`.
- Both Service Areas are active and distinct.
- The chosen Services have no active required questionnaire questions. This
  keeps this Core lifecycle suite independent of questionnaire-definition test
  fixtures.

For any non-local URL, also set
`CORE_TEST_CONFIRM_DISPOSABLE=YES_I_UNDERSTAND`. The suite still prints the
target and refuses known production-looking hostnames.

Run:

```sh
npm run test:core-runtime
```

The suite covers:

- concurrent Draft acquisition and publication;
- Draft → Publish → Match → Offer → atomic Select → Close;
- cross-Customer, unmatched-Supplier, and inactive-Match denials;
- in-area/out-of-area and remote matching;
- explicit legacy Supplier transition;
- published Request and submitted Offer immutability;
- one-winner concurrent selection;
- metadata and Storage attachment denial after publication.

These tests are scaffolding only until executed against a disposable or staging
Supabase project with the forward migrations applied.
