# Bidly Product Expansion Brief

## Product Expansion Vision

Bidly will remain a private reverse marketplace: Customers describe a need once, qualified Service Providers receive private Matches, and each Service Provider may respond with one private logical Offer. The expansion improves how Bidly understands intent, distance, trust, and the response process without becoming an open marketplace.

This expansion begins only after Supplier Phase Gate 6 is closed. It does not alter the approval status or delivery scope of Gates 1–6.

The expanded product should feel less like a list of bids and more like a guided procurement inbox. Customers receive relevant, time-bound Offers with enough context to decide confidently. נותני שירות receive only Requests for which they are eligible, can present credible work, and can negotiate within a structured private thread.

## Problems Being Solved

1. Customers often describe needs in everyday language that does not exactly match the taxonomy.
2. Exact Subcategory alone can miss a relevant adjacent specialty, while unrestricted keywords create noisy Matches.
3. Service Provider profiles do not yet capture enough structured information for precise matching.
4. City alone does not express whether a Service Provider can realistically serve a Request.
5. Customers need visual proof of past work before accepting an Offer.
6. Offers need a clear response deadline and preserved history.
7. Customers need a respectful way to accept, reject, or negotiate each Offer.
8. In-app notifications alone may not bring users back in time for a decision.
9. The current Request detail experience needs a clearer topic-based inbox structure as Offer activity grows.

## Target Users

### Customers

People or businesses seeking a service who want to describe the need naturally, receive a small set of relevant private Offers, compare providers, and decide without browsing a public marketplace.

### Service Providers

Independent professionals, businesses, and teams who want qualified opportunities aligned with their specialty and service coverage, without competing in a public feed.

The preferred workspace term is `נותן שירות`. `בעל מקצוע` may be used when referring naturally to a specific trade or profession. Technical identifiers that use `supplier` remain unchanged.

## Updated Jobs To Be Done

### Customer jobs

- When I describe a need in my own words, help me confirm the right service classification.
- When location matters, match me only with providers who can realistically serve the area.
- When Offers arrive, organize them under the Request so I can understand status and next action quickly.
- When evaluating a provider, show me relevant business and portfolio context without exposing unnecessary personal information.
- When an Offer is close but not acceptable, let me negotiate privately without opening a general chat.
- When I reject an Offer, help me communicate respectfully.
- When a response is time-sensitive, remind me without overwhelming me.

### Service Provider jobs

- When I register, guide me through the minimum information required to receive accurate Matches.
- When a Match arrives, show why it is relevant and whether the location is workable.
- When I submit an Offer, give the Customer enough context and proof to assess it.
- When the Customer responds, give me a clear deadline and one structured next action.
- When an Offer is accepted, rejected, or expired, preserve a clear private history.

## New User Flows

### Service Provider onboarding

1. Register as a נותן שירות.
2. Enter a resumable guided questionnaire.
3. Choose business type and one controlled main profession.
4. Confirm a primary Category and exact primary Subcategory.
5. Add structured specialties, services, and optional additional Subcategories.
6. Define base city, service coverage, travel willingness, and remote availability.
7. Add a business description and optional experience details.
8. Receive a portfolio prompt; portfolio remains optional for eligibility.
9. Review the profile and activate matching only when all required fields are complete.

### Customer Request creation

1. Enter a natural-language title and description.
2. Bidly suggests a primary Category, Subcategory, and controlled Tags using deterministic keyword mappings.
3. The Customer confirms or corrects the primary Subcategory before publishing.
4. The Customer identifies the service mode: on-site, remote, or either.
5. For on-site work, the Customer provides a city; area or neighborhood is optional.
6. An exact address is requested only when needed and remains private before acceptance.
7. The Customer reviews the general area and classification, then publishes.

### Offer and negotiation

1. An eligible Service Provider receives a private Match.
2. The Service Provider submits one logical Offer; its first 48-hour Customer response window begins at that Offer's exact submission time.
3. The Customer may accept, reject, or send one negotiation response.
4. A negotiation response ends the current Customer timer and begins a new 48-hour Service Provider response window.
5. The Service Provider may respond with a message and may formally revise price or estimated days by creating a new immutable Offer version.
6. That response begins a new 48-hour Customer response window.
7. Acceptance, rejection, or expiry closes the negotiation.

## Matching Model

### Final eligibility model

A Match requires all of the following:

1. The Request has a Customer-confirmed primary Subcategory.
2. The Service Provider has a complete, matching-eligible profile.
3. The Service Provider selected either that exact Subcategory or a curated compatible Subcategory explicitly connected to an approved Request Tag.
4. Service mode is compatible: on-site, remote, or either.
5. For on-site work, the Request falls within the Service Provider's declared service coverage.
6. Neither the Request nor the provider/request relationship is terminal.

Exact Subcategory remains the primary and default eligibility rule. Tags may expand eligibility only through a manually approved, narrow compatibility mapping. A raw text match, shared city, or generic Category is never sufficient by itself.

### Ranking within the eligible pool

Eligible providers are ranked using:

- Exact primary Subcategory before curated Tag expansion.
- Number and strength of approved Tag overlaps.
- Primary specialty before additional specialty.
- Service coverage fit and distance relevance.
- Remote compatibility where applicable.
- Portfolio relevance and profile completeness as confidence signals, not authorization rules.

The Customer does not see a public ranked provider directory, and Service Providers do not see unmatched Requests.

## Tag and Keyword Model

### Controlled concepts

- **Keyword:** an approved phrase or spelling variation found in Request text, such as `קיר גבס`.
- **Synonym:** an approved alternate phrase linked to the same controlled Tag.
- **Tag:** a normalized service concept, such as drywall construction or drywall repair.
- **Tag-to-Subcategory relationship:** states whether a Tag is descriptive only, ranking-relevant, or eligible for narrow expansion to a compatible Subcategory.
- **Service Provider specialty/service:** a controlled Tag selected during onboarding, associated with a Category and Subcategory.

### Product rules

1. Customers may write freely, but free text never directly authorizes a Match.
2. Every published Request must have a Customer-confirmed primary Subcategory.
3. Approved synonyms may suggest Tags and a Subcategory.
4. Tags rank exact-Subcategory providers.
5. A Tag expands eligibility only when a product-approved compatibility mapping explicitly permits it.
6. Expansion mappings must be directional where the reverse relationship would be too broad.
7. Generic terms such as “repair”, “professional”, or a city name cannot expand eligibility.
8. A Request with ambiguous classification must be clarified or confirmed by the Customer rather than broadly matched.
9. Each Match should retain a user-understandable reason such as “תחום מדויק” or “שירות נוסף: קיר גבס”.

### Example

If the Customer writes `קיר גבס`, the phrase maps to an approved drywall Tag. A drywall Subcategory is the primary suggestion. A Handyman Subcategory is eligible only if the product catalog explicitly permits that Tag-to-Subcategory expansion for the relevant scope; otherwise Handyman providers may not receive the Match.

### AI decision

AI classification is not part of the expansion MVP. MVP classification uses curated keywords, synonyms, controlled Tags, and Customer confirmation. AI-assisted suggestions may be evaluated in future scope, but must not become an independent authorization source without separate approval and measurable precision controls.

## Service Provider Onboarding

### Required fields for matching eligibility

- Business type: independent, company, or team.
- Main profession from a controlled list.
- Primary Category.
- Primary exact Subcategory.
- At least one controlled service or specialty Tag.
- Base city or general locality; never a private home address.
- Service mode: on-site, remote, or both.
- At least one structured service coverage area for on-site work.
- Maximum travel preference for on-site work, expressed through approved coverage choices; precise radius is optional until dependable distance support is approved.
- Remote availability for services that may be delivered remotely.
- Business description.
- Contact/profile fundamentals already required by the approved product.

### Optional fields

- Additional specialties and Subcategories.
- Additional services.
- Years of experience.
- Starting price indication.
- Portfolio items.
- Portfolio links retained from the existing profile.
- Optional travel radius when accurate location support is available.

### Completion and editing rules

- Onboarding is progressive and resumable; incomplete answers are saved as a draft.
- A provider may explore and edit their own profile before completion but receives no new Matches until all required fields are complete.
- Removing a required field or all eligible specialties immediately pauses new matching and deactivates affected Matches according to the Match lifecycle.
- Removing a Category also removes its dependent Subcategories and specialty Tags.
- Editing coverage recalculates future and active eligibility; it does not rewrite historical Offer records.
- Portfolio completion is encouraged but is not a prerequisite for matching.
- The workspace shows a clear completion checklist, missing requirements, and whether matching is active.

## Location Model

### Customer location requirements

- On-site Requests require a city.
- Area or neighborhood is optional but recommended in large cities.
- Exact street address is optional at Request creation and requested only when the service requires it.
- Remote Requests require the Customer to confirm that no on-site visit is needed; city may remain part of the private account context but does not affect eligibility.
- Hybrid Requests identify both remote suitability and the possible on-site area.

### Service Provider coverage

- Base city/general locality is required.
- On-site providers select structured service areas and a maximum travel preference.
- Remote-only providers declare remote availability and applicable service regions, if any.
- Free-form service-area descriptions may supplement but cannot replace structured coverage.

### Matching effect

Location both filters and ranks:

- It filters out providers who explicitly do not cover the Request area or service mode.
- It ranks providers with a closer or stronger declared coverage fit.
- It may warn a provider when a Request is near the edge of their coverage.
- It never creates authorization by itself. Category/Subcategory/Tag eligibility and an authorized Match are still required.

### Privacy

- Before acceptance, Service Providers see only city and optional general area.
- Exact address, access instructions, phone number, and other identifying location details are hidden.
- After acceptance, the Customer explicitly chooses when to share the precise address if fulfillment requires it.
- Portfolio locations use city or broad region only and must not identify a Customer or private residence.

## Portfolio Model

### Limits and content

- Maximum 12 active portfolio items per Service Provider.
- Maximum 6 images per item.
- Each item includes title, description, Category, and Subcategory.
- Completion month/year and privacy-safe general location are optional.
- Images are strongly encouraged but an item may be saved as a draft before images are added.
- Published portfolio items require at least one image.

### File rules

- Supported image types: JPEG, PNG, and WebP.
- Maximum 10 MB per image.
- Animated images, executable files, archives, and general documents are not portfolio media in MVP.
- Images should be presented at safe display sizes while preserving sufficient detail to assess work quality.

### Moderation and privacy

- Providers must confirm they own the work or have permission to display it.
- Images must not expose faces without permission, children, vehicle plates, documents, exact addresses, contact details, or unrelated Customer possessions.
- Users may report an item. Reported or suspicious items may be hidden pending human review.
- Product operations require a documented moderation and takedown process before launch.
- AI moderation is not assumed or approved.

### Visibility and management

- Portfolio is not publicly browseable.
- A Customer may see a relevant portfolio preview only after that Service Provider submits an Offer to the Customer's Request.
- The provider may always preview their own portfolio.
- Providers may edit, reorder, unpublish, or delete items. Deletion removes future visibility but does not rewrite Offer audit history that recorded the item references visible at decision time.
- Empty state: explain that examples increase trust and prompt the provider to add a first completed project.

## Customer Inbox Experience

The Customer workspace remains Request-first. Each Request is a topic, not a general conversation or public listing.

### Inbox list

Each Request topic shows:

- Request title and general location.
- Request status.
- Count of active Offers requiring Customer action.
- Count of unread negotiation responses.
- Nearest response deadline.
- Last meaningful activity.

Default ordering prioritizes topics requiring action, then most recent activity. Closed topics remain accessible through history.

### Selected Request workspace

1. **Request header:** summary, status, general location, and Customer-owned controls.
2. **Action-required Offers:** active Offer cards ordered by response deadline and relevance, never by hidden manipulation.
3. **Offer detail panel:** price, estimated days, message, status, deadline, provider summary, relevant specialties, coverage indication, and portfolio preview.
4. **Negotiation activity:** the private structured thread for the selected Offer only.
5. **Decision actions:** accept, reject, or negotiate when permitted.
6. **History:** expired, rejected, withdrawn, and non-winning Offers with their immutable timelines.

The Customer can compare their received Offers, but Service Providers never see competing Offers, rankings, messages, or outcomes beyond their own Offer.

## Offer Accept and Reject Flow

### Accept

- Acceptance applies to the latest active version of one Offer.
- The Customer reviews a confirmation summary before accepting.
- Acceptance selects the winning Service Provider, awards the Request, closes all negotiations, and makes other active Offers non-winning.
- Other providers receive a respectful generic outcome notification; they never receive competitor details.
- Precise fulfillment information is shared separately and only when necessary.

### Reject

- Rejection applies to one Offer/provider relationship, not to the provider globally.
- The Customer may reject from the Offer detail view after confirmation.
- A structured reason is optional.
- A custom message is optional, must be respectful, and is limited to 500 characters.
- Suggested Hebrew messages include:
  - `תודה על ההצעה. בחרתי באפשרות אחרת שמתאימה יותר לצורך הנוכחי.`
  - `תודה על הזמן והפירוט. התקציב אינו מתאים לי כרגע.`
  - `תודה על ההצעה. לוח הזמנים אינו מתאים לפרויקט הזה.`
  - `הצורך השתנה ולכן לא אמשיך עם ההצעה בשלב זה.`
- The provider sees the exact custom message if the Customer chooses to send one.
- A structured reason is shared only when the Customer explicitly chooses to share it; otherwise the provider receives a generic respectful rejection.
- Rejection is final for MVP. It closes the thread, deactivates that provider/request Match, and prevents automatic rematching for the same Request.
- Reopening a rejected Offer is future scope and requires explicit rules; it is not implied by editing the Request.

## Email Notification Requirements

Email supplements the in-app notification center; it is never the source of truth and email failure never changes Offer status or timers.

### Mandatory transactional emails

- Service Provider: Offer accepted, Offer rejected, Offer expired, direct Customer negotiation response.
- Customer: accepted Offer confirmation, direct Service Provider negotiation response, Offer expiration when it closes an unresolved Customer turn.

These communicate a direct action or terminal outcome. They are not marketing messages.

### Configurable emails, default on

- Customer: new Offer received and expiration reminder.
- Service Provider: new Match received and expiration reminder.
- Optional immediate versus daily-digest preference for new Matches; direct Offer activity is never delayed into a digest.

### Frequency and reminders

- Direct responses and terminal outcomes are sent individually.
- At most one approaching-expiry reminder is sent per active response turn, at 12 hours remaining.
- Multiple new Matches may be grouped according to the provider's preference.
- Duplicate emails for the same event must be prevented at product level.

### Preferences and privacy

- Non-essential emails include an unsubscribe or notification-preference path.
- Mandatory transactional emails explain why they were sent and link to notification settings, subject to legal review.
- Email content contains only the minimum context: Request title or safe reference, action required, deadline, and secure deep link.
- No exact address, private attachment, full negotiation text, phone number, competing Offer details, or sensitive portfolio content appears in email.
- Deep links require authentication and resolve to the authorized Request/Offer context.
- Generated preference or unsubscribe language is not approved legal advice; counsel must review it.

### Delivery expectations

- Temporary delivery failures are retried.
- Persistent failures are recorded for operational visibility.
- In-app notification and status remain available even if email fails.
- A failed email does not pause or extend a deadline.
- No email provider is selected by this brief.

## 48-Hour Offer Lifecycle

### Initial window

- Every Offer has an independent Customer response deadline exactly 48 hours after that specific Offer is submitted.
- The timer never starts from Request creation, another Offer, or a global Request deadline.
- Other Offers do not affect its deadline.

### Negotiation turns

- A Customer negotiation response ends the current Customer window; it does not reset the same timer.
- It immediately begins a new 48-hour Service Provider response window.
- A Service Provider response ends their window and begins a new 48-hour Customer response window.
- No timer is paused. Each accepted turn transition creates a fresh deadline for the other participant.
- Acceptance or rejection closes the timer immediately.

### Expiry

- If the Customer does not act on the initial or later Customer turn, the Offer expires.
- If the Service Provider does not respond during a negotiation turn, the negotiation and Offer expire.
- Expired Offers leave the active inbox and remain in history.
- Expiry is terminal in MVP and cannot be reopened.
- Expiry affects only that Offer/provider relationship; other Offers and the Request continue independently.
- The associated Match becomes inactive and is not automatically regenerated for the same Request.
- Expiry never hard-deletes the Offer, versions, messages, timestamps, or decision history.

### Display and time

- Active Offer cards show remaining time and the exact deadline.
- Urgency becomes prominent below 12 hours without using manipulative animation.
- Expired cards show who had the unanswered turn and the expiration timestamp.
- Canonical deadlines are based on absolute time. Users see dates in their configured timezone, with Asia/Jerusalem as the current product default.
- Daylight-saving changes do not alter the 48-hour duration.

### Audit history

The timeline records submission, each participant response, every Offer version, deadline creation, reminder, acceptance, rejection, withdrawal, and expiry. Sent activity is not silently edited or deleted.

## Negotiation Model

Negotiation is a private, structured, turn-based thread attached to one Offer. It is not general chat and cannot exist without an Offer.

### Participants and privacy

- Only the Customer who owns the Request and the Service Provider who owns the Offer participate.
- Each participant sees only this Offer thread.
- Competing providers cannot see the thread, revised terms, or outcome details.
- Platform moderation and support access, if required, must be governed separately and audited.

### Turn rules

- The Customer may send one counter-message while it is their active turn.
- The Service Provider may respond once while it is their active turn.
- A sent message is final and cannot be edited; a correction requires the next permitted response.
- Messages contain 10–2,000 characters.
- Contact-information harvesting, abuse, unrelated promotion, and attempts to expose another Customer are prohibited.
- No negotiation attachments in MVP. Existing Request attachments remain read-only within their approved privacy boundary.

### Formal Offer revisions

- Only the Service Provider may formally revise price or estimated days.
- A revision is allowed only as part of the Service Provider's negotiation response.
- Every formal revision creates a new immutable version under the same logical Offer.
- The previous version remains visible in history and cannot be overwritten.
- The Customer may propose a target price or timing in a message but cannot modify provider terms directly.
- Acceptance always identifies the exact version accepted.
- One Offer per Service Provider per Request remains intact because versions are not separate competing Offers.

### Closure

- Acceptance, rejection, withdrawal, Request cancellation, Request award to another provider, or expiry closes the thread.
- Closed threads are read-only and remain in history.
- General post-award fulfillment chat is outside this expansion.

## Business Rules

1. Bidly remains a private reverse marketplace.
2. Customers confirm one primary Subcategory before publishing.
3. Free text and location never independently authorize access.
4. Tags expand eligibility only through approved narrow mappings.
5. A Service Provider must have a complete profile and compatible coverage.
6. One logical Offer exists per Service Provider per Request.
7. Formal revisions are immutable versions of that Offer.
8. Each active response turn lasts exactly 48 hours.
9. Acceptance applies to one active Offer version and awards the Request.
10. Rejected and expired provider/request relationships are terminal in MVP and are not automatically rematched.
11. Offer expiry never deletes history or expire unrelated Offers.
12. An Offer-level action never exposes competing Offer information.
13. Portfolio is private and contextual, not publicly browseable.
14. Email delivery never changes authorization, status, or deadline calculations.

## Permissions

### Customer

- Create and manage their own Requests within lifecycle rules.
- See all Offers submitted to their Requests.
- See provider summaries and contextual portfolio previews after an Offer is submitted.
- Accept, reject, or negotiate an active Offer during their turn.
- See complete history for their own Requests.

### Service Provider

- Manage their own onboarding profile, specialties, coverage, and portfolio.
- See only authorized Matches.
- Submit one logical Offer per matched Request.
- See and respond only to their own Offer negotiation.
- See their own Offer versions and terminal history.
- Never see competing Offers or unmatched Requests.

### Product operations

- Manage controlled taxonomy, Tags, synonyms, and compatibility mappings under governed review.
- Moderate reported portfolio content and abusive negotiation content under an auditable policy.
- Operational access does not create a public browsing surface and requires separate authorization governance.

## Privacy Considerations

- Preserve Match-aware authorization as the access boundary.
- Location narrows eligibility but never substitutes for an authorized Match.
- Withhold precise Customer address and contact details before acceptance.
- Hide Request details and attachments after a provider/request Match becomes terminal, while preserving that provider's own Offer history.
- Do not include private message bodies, addresses, attachments, or competing terms in email.
- Portfolio media must avoid Customer identifiers and exact residential locations.
- Preserve rejected, expired, and revised Offer history without making it publicly discoverable.
- Define retention periods, support access, moderation records, and user deletion behavior with privacy and legal review before implementation.

## MVP Scope

- Guided, resumable Service Provider onboarding with controlled profession, specialty, service, and coverage fields.
- Customer-confirmed primary Subcategory.
- Manually curated keywords, synonyms, and Tags.
- Narrow approved Tag-based eligibility expansion plus Tag ranking.
- City/general-area Request location and structured provider coverage.
- Location eligibility filtering and simple coverage-fit ranking.
- Private contextual portfolio with the stated limits.
- Request-topic Customer inbox with active and historical Offers.
- Accept, respectful reject, and private turn-based text negotiation.
- Immutable Offer versions for revised price or estimated days.
- Independent 48-hour response turns, one reminder, expiry, and history.
- Mandatory direct/terminal emails and configurable new-activity emails.
- In-app notifications remain the authoritative notification record.

## Should Have

- Daily Match digest preference.
- Richer but still explainable coverage ranking.
- Curated rejection-reason analytics without exposing private text.
- Portfolio ordering and relevance controls.
- Operational moderation queue and user reporting workflow.
- Clear Match-reason explanations for providers and support teams.
- Customer filters within one Request for active, negotiating, and historical Offers.

## Future Scope

- AI-assisted classification or moderation, subject to separate approval and accuracy/privacy evaluation.
- Precise geospatial radius and travel-time ranking.
- Negotiation attachments with a new privacy review.
- Explicit reopening of rejected or expired Offers.
- Post-award fulfillment messaging.
- Advanced portfolio verification.
- Provider quality signals, ratings, reviews, payments, and analytics are not implied by this expansion.

## Risks

- Tag expansion can create irrelevant Matches if compatibility mappings are too broad.
- Coverage data may imply false precision without reliable location normalization.
- A 48-hour timer may disadvantage weekends, holidays, or users with limited availability; launch metrics must test this assumption.
- Email volume may become noisy for high-volume providers.
- Portfolio images may reveal personal information or unlicensed work.
- Negotiation may be misused as chat or to move transactions off-platform.
- Immutable history increases retention and privacy obligations.
- Rejection reasons can feel personal or invite abuse without careful defaults and moderation.
- Ranking signals may create hidden bias if their order and effect are not governed.

## Open Questions

The eight scope questions in the source brief are resolved by this document. Remaining launch questions are operational rather than product-rule ambiguities:

1. Which initial Categories receive approved Tag-based expansion mappings?
2. Which structured service coverage units are reliable enough for the first launch geography?
3. What moderation staffing and response-time commitment is available for portfolio reports?
4. What legally reviewed retention period applies to negotiation and expired Offer history?
5. Are weekends and national holidays included in the initial 48-hour measurement experiment, or should a later business-hours variant be tested?
6. Which transactional email wording and preference rules receive legal approval?

## Conflict Resolution Table

| Current approved decision | New requested behavior | Recommended resolution | Product impact | Scope |
| --- | --- | --- | --- | --- |
| Exact Subcategory matching only | Natural phrases and Tags should find relevant providers | Keep Customer-confirmed exact Subcategory as the primary rule; permit only curated, directional Tag-to-compatible-Subcategory expansion | Better recall without open-ended matching | Expansion MVP |
| No location authorization | Location should improve matching | Use structured coverage as one eligibility condition and ranking signal; never authorize from location alone | Fewer impractical Matches while preserving Match-aware privacy | Expansion MVP |
| Email deferred | Transactional email notifications | Keep email outside Gate 6; add minimal transactional and preference-aware email in expansion | Better response rates with privacy and frequency controls | Expansion MVP |
| Chat deferred | Offer negotiation | Preserve the ban on general chat; approve one private, turn-based negotiation thread per Offer | Supports deal clarification without creating a messaging product | Expansion MVP |
| AI deferred | Natural-language classification may suggest AI | Keep AI deferred; use curated synonyms, Tags, and Customer confirmation | Explainable launch with lower authorization risk | Future |
| One Offer per Service Provider per Request | Revised price and days | Preserve one logical Offer; record immutable versions under it | Enables negotiation without duplicate competing Offers | Expansion MVP |
| Match active/inactive follows eligibility and Request lifecycle | Rejection and expiry add Offer-level terminal states | Keep Match and Offer lifecycles separate, but deactivate and suppress rematching for a provider/request pair after rejection or expiry | Revokes unnecessary Request access and preserves independent Offers | Expansion MVP |
| Private attachments available through active Match | Negotiation may include attachments | Do not add negotiation attachments in MVP | Avoids broadening sensitive file access | Future |

## Success Metrics

### Matching quality

- Percentage of published Requests with a Customer-confirmed suggested Subcategory.
- Exact versus Tag-expanded Match acceptance and Offer-submission rates.
- Provider dismissal rate for irrelevant Matches, segmented by Match reason.
- Customer rate of receiving at least one qualified Offer without increasing irrelevant Match volume.

### Onboarding and portfolio

- Onboarding completion rate and median completion time.
- Percentage of eligible providers with at least one published portfolio item.
- Offer acceptance rate with versus without a relevant portfolio preview.

### Location

- Percentage of on-site Requests with valid city and coverage information.
- Provider decline/inaction attributed to distance.
- Difference in Offer rate between strong and edge-of-coverage Matches.

### Offer lifecycle

- Customer action rate within 48 hours.
- Service Provider negotiation response rate within 48 hours.
- Offer expiry rate by participant turn.
- Acceptance, rejection, negotiation, and expiry distribution.
- Time from Offer submission to terminal decision.

### Communication

- Email delivery and deep-link return rate by event type.
- Optional email unsubscribe/preference-change rate.
- Negotiation completion rate and average number of turns.
- Abuse/report rate for rejection messages, negotiation, and portfolio content.

Guardrail metrics must ensure Tag expansion does not materially increase irrelevant Matches, email does not create excessive opt-outs, and location does not become a proxy authorization rule.

## Handoff to Hephaestus

Hephaestus should prepare technical planning only after Gate 6 closes and this product scope is validated. Planning must preserve the following non-negotiable decisions:

- Private reverse marketplace; no provider browsing.
- Customer-confirmed primary Subcategory.
- Curated Tags may expand eligibility only through approved bounded mappings.
- No AI dependency in MVP.
- Location filters and ranks but never independently authorizes.
- One logical Offer per provider/request with immutable versions.
- Turn-based private negotiation, not general chat.
- Independent 48-hour deadlines per active Offer turn.
- Rejected and expired Offers remain in history and are terminal in MVP.
- Provider/request Match access ends after rejection or expiry and must not be automatically regenerated.
- Portfolio is contextual and visible to a Customer only after an Offer.
- Competing Offers and private threads remain invisible to providers.
- Email is supplementary, privacy-safe, and never controls business state.
- Existing Hebrew RTL and user-facing `נותן שירות` terminology remain.

No schema, migration, API, provider, or implementation design is approved by this document.
