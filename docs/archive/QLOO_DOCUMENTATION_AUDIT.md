> Historical development record. This snapshot may describe superseded behavior. Use the [current documentation index](../README.md) for the submission release.

# Qloo documentation and implementation audit

Reviewed 2026-10-18 against the live official documentation and bounded live hackathon API requests. This report contains implementation observations and aggregate verification counts only, not Qloo response payloads or credentials. Application code was not changed during the audit.

## Sources

- [Hackathon developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide)
- [Insights reference](https://docs.qloo.com/reference/insights-api-deep-dive)
- [Parameter reference](https://docs.qloo.com/reference/parameters)
- [Entity type parameter guide](https://docs.qloo.com/reference/available-parameters-by-entity-type)
- [Search](https://docs.qloo.com/reference/get-search), [tags](https://docs.qloo.com/reference/search-tags), [tag types](https://docs.qloo.com/reference/get-tag-types), [entity details](https://docs.qloo.com/reference/get-entities)
- [Taste analysis](https://docs.qloo.com/reference/taste-analysis), [heatmaps](https://docs.qloo.com/reference/heatmaps-use-case), [demographics](https://docs.qloo.com/reference/demographics-use-case)
- [Compare](https://docs.qloo.com/reference/analysis-compare), [trending](https://docs.qloo.com/reference/get-trending)

The sandbox could not connect to the provided proxy. Approved commands outside the sandbox successfully used the existing proxy. No proxy configuration or secret was changed.

## Verified live behavior

The existing `scripts/verify-qloo-intelligence.ts` completed with exit code 2 (partial acceptance):

- Search resolved three named inputs; tag lookup, tag taxonomy and entity details succeeded.
- Price/rating-filtered place Insights returned five results, all five with normalized contribution evidence and business ratings.
- Compare returned five shared tags; the subsequent combined-profile Insights returned five results.
- Trend-biased Insights and hidden-gem Insights each returned three results. This alone does not establish causality or complete filter enforcement.
- Historical trending for the tested place returned HTTP 400. Artist history returned HTTP 200 with zero observations. Historical trends are not fully accepted.

The focused mocked Qloo contract suite passed all 14 tests outside the sandbox. Its initial sandbox execution was blocked by subprocess `EPERM`, not an application assertion. Passing these tests does not establish documentation completeness: several tests intentionally expect the current unsupported-preference dropping behavior described below.

A separate temporary diagnostic called documented special Insights types directly through the existing authenticated transport:

- `urn:tag`: HTTP 200, three tag results.
- `urn:demographics`: HTTP 200, one demographic record.
- `urn:heatmap`: HTTP 200, 346 points for the tested NYC/artist request, despite `take=3`. Do not assume entity pagination or limits apply identically to heatmap grids.
- A separate three-place sample had three normalized images, three coordinate pairs and three contribution records. This is sample coverage, not a guarantee for all entities or cities.

## Findings and corrections

### High priority: discovery is activity-limited rather than request-driven

`src/passport/service.ts:82` gates Culture using a narrow seed-type/concept heuristic, initially requests places and artists, and fills Eat/Coffee unconditionally. `src/agent/runtime.ts:97` maps Music to artist and every other section to place. This is a product restriction, not an API requirement. It explains persistent categories and prevents a movie/book/podcast request from producing the corresponding content result type.

Introduce an explicit request plan separating confirmed taste inputs, requested activities, output types, and hard requirements. Preserve the distinction between a movie (`urn:entity:movie`) and a cinema venue (`urn:entity:place`). Treat cross-domain inference as a taste signal, not as an instruction to add an activity. Keep manual clarification for ambiguous requests.

### High priority: special Insights result types are blocked

`src/qloo/query-plan.ts:236` accepts only keys in the entity capability table. `src/qloo/client.ts:133` parses every Insights result as `results.entities`. Consequently the app cannot use the live-verified tag, heatmap or demographic response collections through its normal Insights function.

Add a discriminated query/response contract with separate parsers and parameter rules for entities, tags, heatmaps and demographics. Do not just extend the allowlist while retaining the entity parser.

### High priority: exposed preferences do not always reach Qloo

Reproduced locally with `buildQuery`:

| Preference | Current behavior | Official reference / correction |
| --- | --- | --- |
| `requiredProperties` | Maps to `filter.properties.exists`, then drops | Detailed Insights reference documents `filter.exists`, including `properties.image` and `properties.description` |
| `metro` | Maps to `filter.geocode.metro`, then drops | Detailed Insights reference documents `filter.location.metro` |
| `contentBasedBias` | Maps to documented `bias.content_based`, then drops | Detailed Insights reference documents a 0–1 weight; reconcile capability validation |
| Resy rating/count/party size | Intentionally drops every parameter containing `resy` | Detailed reference documents `filter.external.resy.*`; type table uses different spellings. Validate actual behavior before enabling; do not present these as applied |

Do not remove all validation to accommodate incomplete tables. Resolve documentation differences explicitly, retain diagnostics through every validation stage, and make unsupported important requirements understandable to the user.

### Medium priority: Surprise me caps results per city

`src/qloo/query-plan.ts:184` implements surprise with `diversify.by=properties.geocode.city` and `diversify.take=3`. The reference defines this as a per-city cap. With a city-restricted request, it can reduce the result set to three without establishing novelty or neighborhood/brand variety. Exploration also broadens soft tags elsewhere, but the city cap itself is not a novelty strategy. Remove or justify this preset independently of taste exploration.

### Medium priority: better tag resolution is available

`src/qloo/lookups.ts:11` requests only a partial keyword lookup and five candidates. The tags reference documents typo tolerance, semantic search (beta), and tag-type restrictions. `src/agent/intent.ts:52` recognizes a short fixed concept list; unrecognized dishes may be searched as named entities during seed resolution. `src/agent/runtime.ts:63` collapses search/network failures into empty matches.

Use intent-aware entity versus concept routing, taxonomy scoping, and a bounded lookup fallback. Distinguish no match from upstream failure. Semantic results must still be reviewed or confidence-checked; they are not exact matches by definition. `/search` also supports a separate `types` filter that can narrow known artist/movie/book intent.

### Medium priority: useful image/explanation data is underused

`src/qloo/normalizer.ts:53` already normalizes returned photos, but `app/components/passport.tsx:371` does not render them. Show Qloo-returned entity images with graceful loading/error/missing-image fallback; no unrelated venue photography is needed.

Per-result contributions are already normalized and used in expanded explanations. The main card still leads with generic combined-interest copy. The API also documents aggregate contribution summaries and an explainability warning; the app does not make these available as structured summary state. Lead with supported specific evidence, retain the limits, and never translate affinity into a personal probability.

### Medium priority: verification and locality need clearer boundaries

`src/qloo/verify-result.ts` rejects observable numeric violations but accepts unknown values while recording `unverified`. Consumer explanation UI surfaces dropped preferences, but does not explain these unverified checks. Distinguish an applied request from a verified result without implying that every absent field means the upstream filter failed.

The app additionally requires exact local city/metro/name matches in `src/workspace/location.ts`; this can reject legitimate borough/locality representations even when Qloo resolved the requested area. Validate returned locality metadata and geography explicitly before expanding beyond the current city list. A positive radius around a named city pads its boundary; it does not mean distance from the user's current position. A true near-me request needs an explicit origin and the documented geometry semantics.

### Medium priority: historical trending remains partially unavailable

The current request matches documented query names, but the tested place returned HTTP 400. Do not diagnose all place history as unsupported from one response or claim a successful trend-biased recommendation query proves historical data works. Preserve recommendation results and omit trend claims when history is absent; investigate a bounded set of documented cases separately.

### Performance follow-up

`src/qloo/transport.ts:50` serializes requests across the entire process with an 800 ms gap. Initial discovery can issue several sequential/queued calls. This protects quotas but can delay unrelated users and compound loading time. Measure end-to-end latency under concurrent sessions, add cancellation/deadline behavior while queued, and choose bounded concurrency consistent with the actual quota. This audit does not establish the cause of the previously reported permanent spinner.

## What is already correct

- Hackathon host is the default; GET requests encode parameters in the query string and send `X-Api-Key` in headers.
- Entity IDs/tag IDs are resolved and validated; errors are not replaced with fabricated venue results.
- Place filtering and artist audience-location context are distinguished.
- Price/business-rating parameters are correctly separated from movie/TV Qloo-rating filters.
- Native explainability is enabled; actual contribution evidence was observed live.
- Compare is followed by combined-profile discovery, rather than treating shared tags as venues.
- Private process caching is consistent with the hackathon guide; raw response data was not added to this report or repository during the audit.

## Delivery order

1. Correct request planning, parameter mapping, unsupported-preference handling, and refinement completion.
2. Add tag-analysis contracts and a useful taste summary, then bounded neighborhood heatmap exploration with real grid data.
3. Add optional aggregate demographic context only where it serves a user goal; do not infer the individual user's age/gender.
4. Apply approved Forest & Butter across flows, render returned photos, and expose grounded evidence clearly.
5. Complete live Supabase verification for existing local account changes; validate guest discovery, multi-activity refinement, Together, planner and saved-profile reuse before pushing.

No application fixes, deployment or push were performed as part of this audit. Existing local account changes were preserved.
