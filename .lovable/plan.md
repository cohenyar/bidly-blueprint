# Bidly — Premium Visual Refinement Plan (v2, with Creative Direction)

Design-only refinement. No changes to UX, navigation, flows, auth, APIs, DB, or MVP scope. Hebrew + RTL preserved.

Locked taste: Trust Navy `#1E3A5F` + Emerald `#059669` on warm-cool white `#F8FAFC` / white surfaces, Heebo + Manrope, soft elevation (1–3 levels), 12–16px radii.

---

## PART I — CREATIVE DIRECTION (added)

### 1. Art Direction — "Procurement Command Center"

Bidly is designed as a **calm command center for buyer-led procurement**. Not a marketplace. Not a dashboard template. A quiet, precise workspace where **suppliers compete intelligently for a single buyer's attention** and the buyer stays fully in control.

Visual feeling: *studio-quiet, editorial, exact*. The kind of interface a procurement lead at a design-forward company would keep open all day. Every surface earns its place. Nothing decorative — every element is either information, action, or spatial breathing.

Emotional targets, in order: **Control → Clarity → Confidence → Speed**.

Refusals (things we explicitly will NOT do):

- No hero illustration of "handshake / people / marketplace".
- No purple/indigo gradient washes. No glassmorphism blobs.
- No centered floating headline on empty white. No stock 3-column feature grid as the hero.
- No emoji icons. No decorative underline swooshes. No confetti/celebration motion.
- No "AI sparkle everywhere" — AI has one dedicated surface language, used sparingly.

### 2. Signature Visual Motifs (recurring across the product)

These are the reusable "fingerprints" that make a screenshot instantly recognizable as Bidly:

1. **The Request Spine** — a thin vertical navy rule (2px) on the inline-start edge of every request-related surface (request card, offer card, comparison column). It visually threads a single request through every screen. On the selected/winning offer it turns emerald and thickens to 3px.
2. **Offer Card** — white 12px card, hairline border, a compact **supplier identity block** at the top (monogram avatar 32px, business name, location dot, rating with tabular numerals), a **price block** in Display size with tabular numerals and ₪ prefix, a **delivery-time chip**, and a footer row with primary CTA + ghost "פרטים". Hover: e1→e2 lift, border darkens to `--border-strong`.
3. **Supplier Identity Card** — monogram (auto-generated from business name in navy on `#EEF2FF`), verified check (emerald outline circle), specialty tag, response-time metric. Same block reused inside offer cards, comparison, and supplier profile.
4. **AI Surface** — tinted `#EEF2FF` panel, 1px `#C7D2FE` border, small square "AI" mark (not a sparkle — a solid 12px navy square with a 2px inner emerald dot), a **confidence bar** (0–100, tabular), and three fixed actions: `קבל` / `ערוך` / `התעלם`. Advisory tone; never uses primary button color.
5. **Comparison Widget** — horizontal side-by-side columns with a **shared metric baseline** running as a hairline grid across all columns (price row aligns, delivery row aligns, rating row aligns). One column is marked `מומלץ` via emerald spine + subtle `#ECFDF5` tint on that column only.
6. **Timeline Indicator** — 4-node horizontal stepper: `בקשה נשלחה → הצעות מתקבלות → השוואה → נבחר ספק`. Nodes are 8px navy dots on a hairline rail; completed nodes fill emerald, current node is a navy ring, pending are `--border-strong`. Used at the top of the customer request page and inside emails.
7. **Numerals as identity** — every number (₪, days, count of offers, rating) uses Manrope tabular. Prices are always right-sized one step larger than surrounding text and paired with a small `₪` glyph in muted color. This alone becomes a Bidly signature.
8. **Metric chips** — small pill with icon + tabular number + unit (e.g. `⌚ 3 ימים`, `● 4.9`, `↩ 12 דק׳ תגובה`). Used consistently on offer cards, supplier cards, comparison.

### 3. Layout Principles (apply to every major screen)

1. **Product-first** — the actual product UI (offer card, comparison table, request form) is the primary visual element on every marketing and app screen. No screen leads with a floating headline over emptiness.
2. **Asymmetric split** — most screens use a 7/5 or 8/4 split (content-heavy side inline-start in RTL, supporting side inline-end). Centered layouts are reserved only for auth and empty states.
3. **Editorial spacing** — section rhythm on marketing pages is 120px top / 96px bottom on ≥lg, 64/56 on md, 40/32 on sm. In-app rhythm is 32/24/16.
4. **Anchored hierarchy** — one H1, one primary CTA, one focal object per view. Everything else steps down by at least two type sizes.
5. **Left-rail alignment (RTL: right-rail)** — content aligns to a strong vertical axis on the reading-start edge; the Request Spine reinforces it.
6. **Density gradient** — marketing pages are airy; app pages are denser but never cramped (min 16px between semantic groups, 8px within).
7. **No islands** — every card belongs to a labeled section with a `<Section>` header (eyebrow + title + optional action inline-end). No cards floating without context.

### 4. Hero Composition (exact spec)

**Grid:** 12-col, gutter 24, max-width 1440, side padding 32 (lg) / 20 (md) / 16 (sm). Hero occupies the full first viewport on ≥lg.

**Split:** 7/5 asymmetric.

- **Inline-start (7 cols) — Narrative column.**
  - Eyebrow (12/16, muted, tracked +0.08em, uppercase Latin / normal Hebrew): `זירת השירותים ההפוכה של ישראל`
  - H1 (Display 48/56 lg, 36/44 md, 30/38 sm, navy, weight 700, -0.02em): two lines max — `פרסמו בקשה אחת. קבלו הצעות מהמובילים בתחום.`
  - Sub (18/28, `--muted-foreground`, max 52ch): one sentence explaining the reverse model.
  - CTA row: primary navy `התחילו עכשיו — בחינם` + ghost `אני ספק` inline. 44px height, 16px gap.
  - **Trust strip** directly under CTAs (not at page bottom): 4 metric chips in a row — `✓ ללא עמלה לצרכן` · `● 1,200+ בעלי מקצוע` · `⌚ הצעה ראשונה תוך שעה` · `🔒 הצעות פרטיות`. Uses tabular numerals.
  - Whitespace: 80px between eyebrow-block and CTA row on lg.
- **Inline-end (5 cols) — Product column (the storytelling object).**
  - A single **composed product mock**, NOT a screenshot, NOT a hero illustration. It is a real render of Bidly primitives arranged to tell the reverse-marketplace story in one glance.
  - See §5 below.

**Background treatment:**

- Base: `#F8FAFC`.
- A very subtle **grid pattern** (1px dots `#E2E8F0` on 32px cadence) confined to the hero band only, masked to a soft radial fade toward the edges. No gradients, no blobs.
- A single hairline horizontal rule at the bottom of the hero band separates it from the next section — no big color shift.

**Whitespace strategy:** the product column "breathes" — 40px of padding around the composed mock inside its own subtle white surface (radius 16, e2). Hero band bottom padding is 96px so the section boundary feels intentional, not cramped.

**Product-to-text ratio:** roughly **55% visual / 45% text** on lg (the product column visually dominates because of the layered card composition). On md the split becomes 60/40 stacked with product on top. On sm, product renders as a compact single offer card above the text.

### 5. Product Storytelling in the Hero (the Reverse-Marketplace flow, visible)

The inline-end product column is a **layered composition** of four Bidly primitives, staggered top-to-bottom in RTL reading order, telling the four-step story without a single explanatory word:

```text
┌─────────────────────────────────────┐
│ 1. Request card (top, front)         │  ← "בקשה: עיצוב לוגו לחברת סטארטאפ"
│    Request Spine navy, timeline node │     with the timeline stepper at
│    #1 lit                            │     step 1
└─────────────────────────────────────┘
        │
        ▼  (a thin navy rail visually drops down)
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │ 2a. Offer   │ │ 2b. Offer   │ │ 2c. Offer   │  ← three offer cards
   │  ₪ 1,800    │ │  ₪ 2,400    │ │  ₪ 1,500    │     fanned slightly,
   │  3 ימים     │ │  5 ימים     │ │  7 ימים     │     each with supplier
   └─────────────┘ └─────────────┘ └─────────────┘     identity + spine
        │
        ▼
┌─────────────────────────────────────┐
│ 3. AI Surface (tinted #EEF2FF)       │  ← "מומלץ: הצעה #3 — יחס
│    "AI" mark + confidence 92%        │     מחיר/דירוג הטוב ביותר"
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 4. Selected offer (emerald spine,    │  ← same offer #3, now with
│    ✓ נבחר, emerald tint background)  │     emerald spine + check
└─────────────────────────────────────┘
```

Motion (respects reduced-motion — all disabled behind the media query):

- On first paint, the four layers fade+rise (8px) in sequence with 120ms stagger.
- Every 6s, a very subtle "handoff" pulse travels down the connecting rail from step 1 → 4 (opacity 0.3 max, 800ms).
- No parallax. No autoplay video.

This composition IS the product story. A visitor understands the reverse-marketplace model in under 3 seconds without reading the H1.

### 6. Storytelling Beyond the Hero (marketing page continuation)

- **How It Works section** — reuses the same four primitives but exploded into full-width horizontal cards (one per step) with the Timeline Indicator running across the top of the section as the section's own hierarchy anchor. No generic "1 / 2 / 3" numbered circles.
- **For Customers vs For Suppliers** — asymmetric split section (8/4), a real request-form mock on one side, a real matching-inbox mock on the other. Product-first, always.
- **Trust section** — a horizontal band of metric tiles using the same metric-chip language as the app (consistency = signature).
- **Closing CTA** — asymmetric, not centered: navy panel inline-start with H2 + CTA, a single offer card inline-end at a slight tilt reinforcing the motif one last time.

### 7. In-App Signature Application

- **Customer dashboard**: hero card = the active request with its Timeline Indicator + Request Spine, offers listed below as a vertical stream of Offer Cards, AI Surface pinned as a right-rail context panel (inline-end in RTL).
- **Offer comparison screen**: the flagship. Full-width Comparison Widget with shared metric baseline; emerald-tinted recommended column; sticky "בחר ספק" action bar at the bottom.
- **Supplier matching inbox**: list of incoming requests with Request Spine; each row shows the buyer's request excerpt + a single primary CTA `הגש הצעה`. Suppliers never see competing offers — the UI reinforces this by showing only "המקום שלך: פרטי" chip, no competitor data.

---

## PART II — TECHNICAL PLAN (unchanged from v1)

Design tokens, typography, elevation, spacing, components, phases A–E, files list, and non-goals from the previously approved plan remain exactly as approved. Summary retained for reference:

- **Phase A — Foundation**: rewrite `src/styles.css` with navy+emerald tokens, radii, elevation, spacing, `ai-surface` + `request-spine` utilities, `tabular-nums`; add Manrope `<link>` in `__root.tsx`; update `theme-color` meta.
- **Phase B — Primitives**: refined `BidlyLogo`; new visual-only primitives `Section`, `StatPill`, `MetricChip`, `AiSurface`, `RequestSpine`, `TimelineIndicator`, `OfferCard`, `SupplierIdentity`, `ComparisonColumn`, `HeroProductMock`; shadcn variant refresh for `button`, `input`, `card`, `badge`, `dialog`.
- **Phase C — Landing polish**: rebuild hero to the exact 7/5 composition above with the layered product mock; restyle How It Works, For Customers/Suppliers, Trust, Closing CTA per §6.
- **Phase D — Auth polish**: `AuthShell` upgrade (16px radius, e2, brand rail on lg with muted request-spine motif).
- **Phase E — `/app` shell polish**: apply new tokens + Section/Spine primitives to the placeholder (no feature additions).

**Non-goals** (unchanged): no new routes, features, tables, migrations, RLS, server functions, or edge functions. No changes to `auth-context`, Supabase clients, `i18n.ts`, route gates, Hebrew copy, or business rules. No new deps beyond web-font `<link>`.

**Files expected to change** (unchanged list from v1), plus these new visual-only components under `src/components/app/`: `Section.tsx`, `MetricChip.tsx`, `StatPill.tsx`, `AiSurface.tsx`, `RequestSpine.tsx`, `TimelineIndicator.tsx`, `OfferCard.tsx`, `SupplierIdentity.tsx`, `HeroProductMock.tsx`.

---

Approve to proceed with **Phase A (Foundation tokens + fonts)** only.  
  
  
Visual Quality Gate

Before implementing any screen, evaluate it against the following questions:

- Does this look like a premium SaaS product rather than a template?

- Would a first-time visitor understand Bidly's business model within three seconds?

- Is the product interface the primary visual focus?

- Does the layout feel original rather than generated?

- Would a design agency confidently present this screen to a funded startup?

If the answer to any question is "No",

refine the composition before implementing it.