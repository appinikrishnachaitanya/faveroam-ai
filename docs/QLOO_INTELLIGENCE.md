# Qloo intelligence upgrade

TastePassport keeps its existing product and uses Qloo for discovery, ranking, constraints, returned contribution evidence and multi-person taste analysis. Gemini extracts partial query preferences through native function calling and selects grounded explanation facts. It does not generate replacement venues or metrics.

## Architecture and changed files

- `src/qloo/query-plan.ts`, `capabilities.ts`, `verify-result.ts`: one parameter mapper and entity-aware validator, based on the official entity-type guide inspected 2026-10-17. Legacy callers also pass through validation before Insights network requests. Known returned violations of price, rating or popularity constraints are rejected; missing metadata is disclosed as unverified.
- `src/qloo/client.ts`, `transport.ts`: server requests on the existing secure gateway, bounded pacing, private TTL caches (lookup: one hour; Insights/Compare: five minutes; trends: one minute), safe endpoint/count logging and optional private diagnostics.
- `src/qloo/lookups.ts`, `compare.ts`, `trending.ts`, `normalizer.ts`, `enrichment.ts`, `explanation.ts`, `diagnostics.ts`: lookup, normalization, comparison, historical trend enrichment and grounded evidence helpers. Raw Insights responses are retained only in a bounded, private development inspector; they are never placed in account snapshots or this repository.
- `src/agent/{provider,intent,orchestrator,runtime,session,types,debug,harness}.ts`: native function-call query preferences, per-chapter patches, confirmed negative concepts, sequential concept confirmation, optional enrichment, preserved MCP ranking/tag workflows and guided fallback.
- `src/passport/{model,evidence,service}.ts`, `src/account/snapshot.ts`: normalized evidence, actual applied request parameters and diagnostics; saved Passports retain chapter query preferences.
- `app/api/agent/intelligence/route.ts`, `app/api/agent/turn/route.ts`: trusted session/revision checks; Together consumes sealed, explicitly confirmed partner matches; details fetches only current/saved discoveries. Read-only intelligence calls do not overwrite the current Passport.
- `app/components/{intelligence,intelligence-evidence,passport,disambiguation,account,day-out}.tsx`, `app/styles/intelligence.css`, page/layout: progressively disclosed discovery styles, budget/rating/location/provider controls, Together, contribution meters, optional metadata/explanation requests, independent match radio groups and responsive styling. Navbar and planner share verified account status rather than issuing independent authentication reads.
- `tests/qloo-intelligence.test.ts`, `scripts/verify-qloo-intelligence.ts`, `scripts/verify-account-ui.mjs`: protocol, state, partial-failure and browser contracts plus opt-in live endpoint acceptance. Package scripts and `.env.example` document execution and private debugging.

## Preserved behavior

Existing named-entity confirmation, cuisine/semantic confirmation, strict destination checks, artist audience context, liked discoveries, rejected-ID exclusions, category isolation, familiarity modes, MCP/CLI tools, bounded active sessions, accounts, saved Passports, dated plans, calendar exports, reset behavior and model-only comparison remain available. The model-only comparison remains distinct from the new Qloo Together comparison. No account migration is needed for this upgrade.

## Product flows

Open **Preferences & Together** in the workspace navigation. Choose a chapter and a discovery style, optionally set budget/business rating, then Update this chapter. Location exclusions, provider listings and Tripadvisor review-count filters are under Location and more preferences. Hidden gems requests quality ranking and popularity below the 75th percentile; it does not promise uncrowded or non-touristy places. Safe bets requests quality ranking and business ratings of at least 4/5. Surprise me uses the existing soft-signal exploration strategy and documented city diversification, preserving hard filters and cultural anchors.

Trending for you first requests Qloo Insights with trend bias. It preserves Qloo ordering, then requests historical observations for up to three returned entities. Optional enrichment has a separate eight-second total deadline; missing, failed or empty history cannot discard successful recommendations. No invented momentum score or local reranking is used.

Together resolves three of another person's named cultural interests, requires explicit matches, calls Compare using both entity profiles, then uses returned common tags and both profiles in downstream Insights. Shared/different tags are displayed without inventing a relationship-compatibility percentage. Current exclusions and chapter preferences are retained. Comparison results are temporary, separate from the active Passport, and not saved to the account or day-out plan.

Card **Why this suggestion?** shows useful interest connections, budget and rating details. Raw affinity, contribution metrics and API parameters remain in internal evidence/private development tooling, rather than the consumer card. More place details calls `/entities`. Explain my match asks Gemini to select indices into a bounded list of server-generated evidence sentences; out-of-range or malformed selection fails to deterministic evidence. The model cannot author new facts through this contract.

Follow-ups patch per-chapter query state: “Make it cheaper” retains the previous area, “What's trending for me?” retains price/location, and confirmed negative concepts become exclusion tags. Union and intersection remain distinct. Multiple positive concepts can require sequential confirmation. Mixed inclusion/exclusion concepts and ambiguous localities may require follow-ups rather than guessing IDs.

## Endpoint coverage

| Endpoint | Coverage | Consumer use / boundary |
| --- | --- | --- |
| `/search` | Implemented | Existing and partner named-interest resolution |
| `/v2/tags` | Implemented | Native semantic lookup fallback; existing MCP concept confirmation retained |
| `/v2/tags/types` | Partially implemented | Cached taxonomy in private development inspection; no dedicated consumer catalog |
| `/entities` | Implemented | More place details on a current or saved discovery; lookup by confirmed Qloo IDs |
| `/v2/insights/` | Implemented | All existing discovery plus validated styles, constraints, explainability and common-ground recommendations |
| `/v2/analysis/compare` | Implemented | Together with real shared-tag output feeding Insights |
| `/v2/trending` | Partially implemented | Consumer enrichment implemented; live place request returned HTTP 400, artist/movie requests returned empty histories |

No legacy `/recs` or `/recommendations` calls were added. Audience/heatmap output modes, external-ID input entry and other unrelated product experiences are not implemented just to increase endpoint count.

## Insights capability coverage

| Capability | Coverage and limits |
| --- | --- |
| Entity signals | Implemented; resolved UUIDs only |
| Tag signals | Implemented; returned/confirmed tag IDs |
| Price | Implemented; 1–4 min/max; natural-language and UI budget mapping |
| Qloo rating | Implemented in query layer for film/TV types; rejected for place/artist output. Product chapters still output places/artists. |
| Business rating | Implemented separately for places; UI minimum and query min/max |
| Tripadvisor | Implemented place rating/review-count min/max mapping; review-count UI. Missing result metrics are omitted and marked unverifiable. |
| Resy | Provider-presence filter implemented. Rating/count/party filters deliberately dropped: official general reference and entity-type guide disagree on their names. No reservation functionality. |
| Quality bias | Implemented for places; not a fabricated quality score. Qloo may exclude places lacking quality data. |
| Popularity | Implemented min/max, including hidden-gem cap. Never treated as crowd measurements. |
| Trend bias | Implemented through Qloo ranking; historical availability is separate |
| Content-based bias | Not implemented: `bias.content_based` is absent from the inspected official parameter reference. Requested value produces a dropped-parameter diagnostic; exploration uses the supported existing strategy. |
| Explainability | Implemented; observed `query.explainability["signal.interests.entities"]` contribution entries. Aggregate effects are retained only in private raw inspection, never substituted for per-result contributions. |
| Geography | Named locality/radius, country and region mapping, strict city checks, named location exclusions and query-layer city/metro diversification. Locality radius pads boundaries; it is not a guarantee of walking distance from a landmark. Unverified metro-filter names are dropped. |
| Exclusions | Dismissed entity IDs, confirmed negative tags and named location exclusions |
| Tag operators | Union/intersection mapped distinctly; confirmed multiple concepts supported. A union restaurant query omits the generic restaurant tag from the OR list and retains server-side restaurant classification. |
| Existence filtering | Required image/description filtering is not documented under `filter.properties.exists`; requested controls are reported as dropped. Missing card fields remain optional. |
| External-provider filtering | Implemented documented Resy/Michelin/Tablet presence; no claim of reservations, opening hours or present availability |
| Diversification | Implemented documented city/metro fields; unsupported category fields are dropped. Single-city diversification does not create geographic coverage outside the chosen destination. |

The general reference explicitly documents explainability, named locality and signal-locality parameters omitted by parts of the entity table. Those documented exceptions are centralized. Resy conflicts are not resolved by assuming HTTP 200 means a filter worked.

## Diagnostics and privacy

Use existing `QLOO_API_KEY` and `QLOO_API_BASE_URL`; `QLOO_BASE_URL` is accepted as an alias when the existing base variable is absent. Default remains `https://hackathon.api.qloo.com`. No key is sent to the browser.

Safe info/error logs are enabled by default; `AGENT_DEBUG=1` adds allowlisted count, dropped-parameter-name and strategy metadata. See `CONSUMER_EXPERIENCE.md` for current logging and UI behavior. It does not log prompts, bearer sessions, credentials, response bodies or arbitrary URLs. For private local inspection only, run the development server with `QLOO_DEBUG_UI=1`, then open Development query inspector. The API additionally rejects inspection outside development. Raw retention is at most 40 responses for 15 minutes, capped at 100 KB per response, with known secret values redacted. Production never records these raw responses. The panel shows resolved inputs in applied params, normalized output and response evidence, not raw chat history.

## Validation and remaining acceptance

`npm test` covers 122 tests in the expanded suite, including 14 new Qloo/state/protocol cases. It tests entity-specific rejection, numeric ranges, parameter mapping, union/intersection, partial preference preservation, negative-tag confirmation, contribution normalization, observable filter violations, unverified metadata, historical classification, comparison output, enrichment failure, session revisions, forged partner matches and production inspector rejection. The mocked browser contract additionally checks Together's independent confirmation groups, common-ground cards and responsive controls. Production build/typecheck and smoke checks must pass before push.

`npm run verify:qloo` is opt-in live acceptance. It logs only counts/statuses. Exit 0 means all exercised calls succeeded (empty histories remain explicitly empty); exit 2 means a historical enrichment dependency was unavailable; exit 1 means another required endpoint/response failed. It is not run in CI, which has no provider credentials. There is no configured lint script; type checking is not represented as linting.

Final local validation passed: all 122 tests, production build, typecheck, production HTTP smoke and the mocked browser contract at 320/390/768/1440 px. Native Gemini function-call protocol tests also cover grounded fact selection. Browser checks caught and fixed duplicate sibling keys between the planner and intelligence panel, and now verify that the restored planner remains interactive and shares the navbar's verified account status. Live acceptance completed with exit 2 solely for the place-history limitation below. These results do not establish Railway deployment or live Supabase/email acceptance.

Observed live on 2026-10-17: named search, tag search/types, entity details, budget/business-rating Insights and per-result contributions succeeded. The constrained query returned five results with business ratings and contributions. Compare returned five shared tags; those tags and both profiles produced five downstream Insights results. Trend-biased Insights returned three results. Place history returned HTTP 400; artist and movie histories returned HTTP 200 with zero observations, including an additional historical artist date-range check. Nonempty historical metric rendering, direction labels and any breakout/acceleration claim are therefore **not live-validated**. Rank velocity's sign is not assumed; “rising/cooling” uses returned population delta, and “established” requires zero delta and returned percentile ≥80. No acceleration or breakout label is invented from an undocumented field.

Live numerical effectiveness of every optional filter (especially provider listings, Tripadvisor, exclusions, diversification and all entity types) still requires broader paired-query acceptance. The validator guarantees documented requests and rejects observable violations; it cannot certify fields Qloo does not return. Live Supabase/email acceptance is unchanged and separate. Real Gemini fact-selection acceptance is separate from the native-SDK protocol tests and deterministic explanation fallback.

### Manual checks on Railway

1. Build a Passport with confirmed artists, films and a cuisine. Open a card's Why section and inspect actual contribution/rating/price fields.
2. Set a dining budget and business rating. Confirm returned known values satisfy the limits; missing evidence must be described as unverified.
3. Ask for a cheaper follow-up, then trending. Confirm price/area persist and missing history has no momentum claim.
4. Open Together, confirm three distinct partner matches and find common ground. Check shared tags and recommendations; original Passport and saved plans must remain intact.
5. Ask to exclude seafood and confirm the returned concept. Try a named area exclusion. Verify request receipts and retained constraints; if no result fits, old discoveries remain.
6. Interrupt an optional lookup or use a category with no history. The page must keep the recommendation and allow further guided refinement.

Sources: [hackathon guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide), [parameter reference](https://docs.qloo.com/reference/parameters), [entity guide](https://docs.qloo.com/reference/available-parameters-by-entity-type), [Compare](https://docs.qloo.com/reference/analysis-compare), [Trending](https://docs.qloo.com/reference/get-trending). Documentation and protocol fixtures are committed; live response data is not.
