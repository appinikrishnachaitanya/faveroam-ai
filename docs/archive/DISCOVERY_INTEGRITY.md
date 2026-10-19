> Historical development record. This snapshot may describe superseded behavior. Use the [current documentation index](../README.md) for the submission release.

# Discovery integrity — 17 October 2026

TastePassport helps newcomers find their first places of belonging. This pass preserves the current onboarding and visual identity, and corrects venue eligibility, sparse chapters and conversational refinement.

## Reproduced causes

- Live `/search` followed by `/entities` resolved the reported Food Monks venue. The previous classifier admitted it to Culture; the corrected classifier rejects it. Returned dining evidence conflicts with its cultural classification. No venue name is used in the rules.
- `validatedSection` previously gave museum/gallery genre matches precedence over dining genres. Planner inputs trusted the assigned chapter instead of revalidating returned evidence.
- Initial place discovery applied cuisine/restaurant filters to one shared place pool. That was inadequate coverage for Coffee and Culture. They now receive distinct category searches through the refinement pipeline.
- The first live top-up check exposed a cuisine tag passed to an entity-only exclusion field. Entity exclusions now contain entity IDs only.
- Live Gemini initially interpreted the exact museums request as onboarding. Its interpretation call lacked the existing Passport context. Context is now supplied without adding credentials or full provider payloads to logs.
- A separate live attempt received a Gemini 504. The deterministic parser treated “not restaurants” as a request for Eat. Negation handling now preserves the unrelated chapter. Model-driven and deterministic execution remain distinguishable.
- An indefinitely stuck original request was **not** reproduced. However, the client had no overall stream deadline, submitted messages were hidden until server history arrived, and server commit had no cancellation gate. Those were concrete lifecycle gaps.

## Changes

Culture requires supported venue genres and rejects dining conflicts and tiffin/delivery/catering descriptions. Descriptions can veto Culture, never establish it. Coffee requires venue-category evidence. Unknown venues remain unassigned. Planner options revalidate the same structured evidence, including restored/saved cards. A venue ID cannot occupy multiple roles.

Coffee and Culture receive separate category queries. Sparse queries can remove soft taste signals while retaining geography, category filters, explicit concepts, entity/tag exclusions and numeric preferences. Broader local results are labelled on cards and in explanations. Automatic removal of explicit refinement constraints was removed. Rejected cards stay excluded even when replacement discovery fails.

Gemini still uses native function calling. Existing-Passport context prevents onboarding confusion; generic museum/gallery venue genres can use exact returned Qloo taxonomy without another personal-taste confirmation. Personal taste concepts still require confirmation. “Not restaurants” does not authorize hiding Eat. Native Insights performs filtered retrieval when MCP ranking cannot express the constraints.

The provider uses a 20-second request deadline, the turn guard 90 seconds, the server transaction 95 seconds and the browser 100 seconds. Browser cancellation and stream cancellation abort linked work. Aborted server transactions release the session lock and cannot commit late results. Revision checks reject stale requests/responses. Existing discoveries remain until validated replacement results arrive. The submitted request appears immediately, survives failure, and has cancellation/retry controls and a visible drawer error.

Planner copy distinguishes complete and partial outings. Default stop choices avoid known straight-line separations over 15 km; valid manual choices remain editable, with a warning for distant combinations. Unknown coordinates remain unknown. This is not routing, travel-time estimation, opening-hours verification or booking. Downloads use the displayed choices.

Tabs have explicit contrasting text/selected backgrounds and keyboard focus styling. Evidence disclosure lists considered interests and distinguishes collective consideration from a supported individual contribution. Scores are never converted into confidence percentages.

## Live results

Original browser profile: Toronto, A.R. Rahman, Interstellar (2014), Indian cuisine, Feels like home.

| Check | Observed result |
|---|---|
| Reported problematic venue | Previously Culture; now ineligible for Culture |
| Initial displayed chapters | Eat 14, Coffee 18, Culture 12, Music 20 |
| Exact museums/galleries request | Gemini function interpretation, Qloo taxonomy/tool lookup and Insights retrieval completed |
| Refinement scope | Culture changed; unrelated cards preserved; no pending taste confirmation |
| Planner/export | Selected eligible stops; downloaded names matched visible selections |
| Responsive browser | No page overflow at 320, 390, 768 and 1440 px; assistant keyboard focus verified |

A second live browser profile (Taylor Swift, Inception, specialty coffee) returned Eat 2, Coffee 16, Culture 13 and Music 20. Its refinement used the labelled deterministic fallback, preserved unrelated chapters, and passed planner/export and responsive checks.

The separate evaluation harness uses directly resolved seeds, so its initial pool need not match the browser's explicit choices. In one complete run it returned Eat 10, Coffee 18, Culture 12 and Music 20; the exact refinement returned 16 Culture cards and preserved other chapters.

Live restaurant-query comparisons (top 20 returned, conservative category eligibility applied):

| Profile vs combined artist + film + cuisine | Eligible results | Shared eligible IDs | Shared IDs at a different rank |
|---|---:|---:|---:|
| Combined profile | 14 | — | — |
| Cuisine only | 15 | 1 | 1 |
| Without film | 16 | 3 | 2 |
| Different artist profile | 10 | 0 | 0 |

Mode comparison against the same initial Eat chapter: Balanced returned 20, shared 10, moved 10; Explore returned 14, shared 10, moved 0. Little or no rank movement is reported as observed. These small, single-city checks demonstrate query sensitivity; they do not prove causality for an individual venue, general recommendation quality, or a calibrated similarity score. No invented LLM baseline was used.

## Reproduce

With securely configured QLOO_API_KEY, GEMINI_API_KEY and GEMINI_MODEL:

```sh
node --use-env-proxy --conditions=react-server --import tsx scripts/evaluate-discovery.ts
```

This opt-in harness prints aggregate counts, overlaps, rank movement and execution status, not API response data. It makes additional calls only when explicitly run, outside production requests.

Run the built app on port 3001 and an isolated Chromium CDP instance on port 9231, then:

```sh
node scripts/verify-discovery-journey.mjs
PASSPORT_PROFILE=different node scripts/verify-discovery-journey.mjs
node scripts/verify-account-ui.mjs
```

The first two use live providers. The complete automated suite passed 128 tests; production build, typecheck and HTTP smoke passed. The repository has no lint script. The account/UI contract explicitly mocks APIs and covers provider errors, malformed output, stalled stream cancellation, client deadline and retry, alongside login, saved plans/calendar and responsive layout. It does not establish live Supabase acceptance. Browser screenshots stay under /tmp.

## Limits and configuration

No new environment variables, schema migration, model change or production configuration is required. No deployment is part of this pass. Qloo endpoint/parameter semantics were checked against the official hackathon guide and the entity-specific parameter reference on 17 October 2026: `/search`, `/entities`, `/v2/tags`, `/v2/insights/`, place categories, interest signals, tag operators and named-locality filtering. The hackathon host and X-Api-Key header are unchanged.

Provider deadlines do not guarantee the remote service stops computing after a local cancellation. They bound local waiting and prevent late commits. Supabase is not configured in this local environment; live account/storage verification remains separate. Venue hours, prices when absent, transport and availability still require user verification. Raw Qloo responses and secrets are not committed.
