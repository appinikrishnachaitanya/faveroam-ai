> Historical development record. This snapshot may describe superseded behavior. Use the [current documentation index](../README.md) for the submission release.

# TastePassport: cultural onboarding and Qloo evidence

**Move anywhere. Keep your vibe.** TastePassport translates the culture someone already loves into discoveries in an unfamiliar city. It helps newcomers rebuild familiar routines and gradually explore beyond them. It is not an itinerary, ranking of top restaurants, or tourist planner.

The primary sample is a software engineer relocating from Bengaluru to Toronto, with Rahman, Interstellar, Indian cuisine, specialty coffee and independent culture. This is clearly labelled sample copy and editable taste queries, not identity in session/business logic. Toronto is now supported alongside the existing destinations. The sample's coffee/independent queries require actual Qloo resolution and explicit confirmation; unavailable concepts never appear as resolved Taste DNA.

## One state, three discovery styles

The existing structured session, guided/agent controller, feedback, reset flow, Qloo client, transport, harness and validation remain in use. `categoryModes` and `discoveryMode` extend the same session. The familiarity control applies to its selected category so unrelated sections remain stable. Each current card records the strategy that actually produced it, which can differ from another category's strategy.

| Mode | Actual query behavior |
| --- | --- |
| Familiar | Keep confirmed profile/category tags as direct place filters. For music, prioritize confirmed artist seeds and saved artist anchors when available. Preserve native Qloo order. |
| Balanced | Issue the Familiar and Explore query compositions, interleave the two returned pools, deduplicate IDs and cap the combined result at 20. Shared entities keep the first retained query receipt. |
| Explore | Move soft profile/category tag filters into `signal.interests.tags`, retain entity signals and category/locality validation. For music, use the full cross-domain entity profile rather than artist-only input. |

No new Qloo endpoint, weight, novelty score, distance or familiarity parameter was invented. Composition uses the existing `/v2/insights/` entity/tag signals and physical filters. At least one confirmed cultural signal is required. An empty signal profile cannot become a generic city query.

Explicit primary concepts in conversational refinement remain direct filters. Changing discovery style is an explicit request to broaden profile-level matches; optional constraint relaxation does not silently change the mode. Destination, requested category and rejected IDs never relax. Quiet ambience requirements stay separate from profile-level tag broadening.

If both compositions are identical, Balanced/Explore use one grounded profile query and add a truthful strategy note. They do not manufacture an adjacent pool. Modes describe query strategy, not a guaranteed novelty or satisfaction score. Qloo coverage may still produce overlapping results.

Initial passports use direct cuisine filters for confirmed cuisine tags and artist-focused music signals. Category updates reuse the existing native discovery pipeline. Balanced makes at most two native insights calls for one discovery operation; existing pacing, caching, bounded retries, four logical turn operations and 90-second turn deadline remain. Physical HTTP attempt counts can exceed logical operation counts because of retries and two-pool discovery. No broad live sweep was run.

## Taste DNA and the cultural Bridge Map

Taste DNA renders actual confirmed candidates, types and IDs. Inspectors identify Qloo entity-search or tag-workflow resolution. Removing a signal retains the existing confirmation/rebuild behavior. There are no confidence percentages, personality scores or inferred tastes.

Each current result carries an application query receipt containing:

- Qloo operation, receipt ID and capture timestamp;
- actual input entity/tag IDs, resolved names/types and their query roles;
- allowlisted query parameters, destination and physical versus audience locality semantics;
- actual returned entity ID/type, category/tag metadata and returned city/metro/name/country;
- raw `query.affinity` only when present and finite;
- actual subsequent MCP shortlist inputs/returned affinity when ranking occurs.

Receipts omit authorization headers and credentials. A cached native response is still Qloo evidence for the recorded parameter set; its capture timestamp is not a claim of current venue availability or a Qloo request timestamp. Only address/short description returned by Qloo become card metadata.

The Bridge Map groups current cards by receipt and category. A route exists only when the card's returned ID matches its receipt and at least one current confirmed Taste DNA input appears in that query. Artist/music routes explicitly show audience context, not Toronto concert availability. Hidden categories disappear through the existing rendering projection. There are no connections for placeholder cards or missing evidence.

A line represents **collective query inputs → returned category**, not proof that one song or film caused one restaurant recommendation. Exact input roles and IDs remain inspectable on cards. Source groups and their SVG connectors are generated only from receipts, with subtle CSS motion and reduced-motion support. The mobile view stacks each evidence-backed route vertically.

## Auditable recommendation cards

Cards use restrained category surfaces, serif names, returned descriptions/addresses, actual cultural query inputs, My Vibe / Not My Vibe, and nested **Why this surfaced → Qloo evidence**. Judges can inspect original identifiers, parameter receipts, raw relevance and returned tags. Old cards without receipts show an evidence-unavailable message instead of assigning all current tastes to them. Missing affinity remains absent.

Sparse categories show only available valid matches and suggest Balanced/Explore. Empty category updates retain the previous Passport and the existing real recovery controls. No filler entities, neighborhoods, ratings, popularity claims or invented addresses are introduced.

## Optional model-only comparison

When a provider is available, **See what Qloo adds** requests a live model-only baseline. The server sends destination and cultural taste names with **no tools, Qloo IDs, insight entities, or recommendation evidence**. The response is plain model text, labelled unverified and kept outside the Passport card pipeline. The comparison table explains source, specificity, grounded IDs, location semantics, cross-domain inputs and auditable evidence; it does not invent numerical quality scores.

The endpoint uses the existing server-only OpenAI-compatible provider, including Gemini's compatible endpoint when configured. Baselines are bounded to 8,000 characters, a 20-second timeout, one concurrent request per session, a two-minute cache and at most 100 entries. Credentials never go into the client or prompt. Without provider configuration, the comparison control/panel is hidden and the endpoint returns unavailable. No prewritten “generic AI” answer is substituted.

Live Gemini credentials are not configured in this environment. The comparison UI's source boundaries and unavailable behavior were tested, but a live Gemini baseline remains unrun.

## Verification and actual coverage

Full typecheck, **67 tests**, and production build passed. Fifteen new cultural tests cover resolved DNA, grounded bridge connections, mismatched/missing receipts, real affinity and absent fields, three query strategies, hard invariants, bounded/deduplicated blending, no generic fallback query, scoped state updates, sparse output, unavailable model comparison, baseline separation, Toronto extraction and identical-query degradation. Existing client, agent, reset and workspace tests remain passing.

Controlled live Toronto profile: explicitly confirmed A.R. Rahman (artist), Interstellar (2014 movie) and returned Indian cuisine tag `urn:tag:cuisine:qloo:indian`.

| Actual result | Outcome |
| --- | --- |
| Familiar dining | 14 validated matches |
| Explore dining | 11 validated matches; 6 entity IDs not in the initial Familiar set |
| Balanced dining | 20 deduplicated matches from direct and adjacent pools |
| Music | Preserved byte-for-byte during dining mode changes |
| Lifestyle coverage | 2 valid matches; sparse-data handling surfaced |
| Evidence audit | Every card matched its returned ID, actual inputs, destination/type/locality and raw affinity when present |
| Model-only comparison | Unavailable and hidden; no synthetic baseline |

The live comparison is meaningful for dining; it does not prove mode differentiation across every destination/category. Coffee and independent-culture resolution were not included in this controlled three-signal validation, so their Toronto coverage is not claimed. Private live summaries are ignored under `.spike-output/`; credentials were not printed, logged or written.

Production Chromium verified sample onboarding, explicit match selection, three real Taste DNA signals, Familiar → Explore → Balanced changes, auditable Bridge Map routes, unchanged Music, expanded card evidence, unavailable comparison hiding, mobile overflow checks and complete New Passport reset. Final visual review also uses captured live Qloo data to avoid additional API calls during styling checks.

No deployment, maps, bookings, authentication, payments or social feature was added. Before deployment: securely configure and live-test Gemini/tool calling and the optional baseline; evaluate broader cuisine/category coverage; choose a durable session/runtime strategy and shared quotas suitable for the chosen host. The official harness still requires a full Node process environment.
