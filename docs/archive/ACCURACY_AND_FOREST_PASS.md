> Historical development record. This snapshot may describe superseded behavior. Use the [current documentation index](../README.md) for the submission release.

# Accuracy and Forest & Butter delivery

Implemented locally on 2026-10-18 after the [live documentation audit](QLOO_DOCUMENTATION_AUDIT.md). No deployment or push was performed. Earlier local account/profile changes were preserved and integrated.

## Behavior

- Onboarding offers up to five explicit activities. Without a selection, confirmed cultural interests suggest editable starting categories; Coffee, Music and Culture are no longer forcibly filled for every profile.
- A shared section/type mapping covers Qloo's ten documented entity types. Movie recommendations use movie entities; cinema/nightlife outings use places. Reading recommendations and bookstores are distinct. Input taste references such as “connected to my film tastes” do not automatically become output activities.
- Requests for multiple physical activities query each activity genre separately and interleave eligible results so nightlife cannot consume the entire cinema pool. Outing order follows the explicit request; planner edits remain independent.
- Exact chicken-biryani specialty-dish matches can apply directly. Pending concept confirmation retains activity context and applies only to relevant sections. Tool-selected rewordings cannot create another concept-confirmation loop. Cuisine tag IDs cannot enter entity-exclusion lists.
- Gemini uses the existing native SDK/function calling. Ranking is offered only for an actual ranking request with existing candidates. MCP/CLI workflows, bounded native tag fallback and guided discovery are preserved. Tag fallback supports documented typo tolerance and optional semantic search; semantic candidates still require appropriate confirmation.
- Corrected `filter.exists`, `filter.location.metro`, and documented content-based weighting. Surprise no longer imposes a three-per-city result cap. Integer/range/property checks run before network calls.
- Explicit numeric requirements reject listings with missing or violating returned values. “Any budget” does not require a known price. Unsupported settings remain diagnosed; disputed Resy numeric controls are still disabled pending stronger live verification.
- Three-choice previews favor distinct returned brands/branches where alternatives exist. A second choice is called lower-price only when its known tier is below the first choice's tier.
- Queued requests observe cancellation/deadlines before executing. Initial requests have bounded browser/server deadlines, preserving drafts and existing results after failure.

## Real analysis, not generated data

Open **Your connections**:

- **Explore my taste connections** calls Insights with `filter.type=urn:tag` and displays returned cultural themes. These are associations, not personality diagnoses.
- **Find areas to explore** calls `urn:heatmap`, parses actual geographic points and renders an affinity plot without third-party map tiles. North is up; points are geographic affinity, not crowds or venue availability. Up to three spatially separated returned areas have map links and a dining-nearby action using the actual point with a 1.5 km radius. Existing dining preferences remain.
- **Optional audience context** calls `urn:demographics` and displays per-interest aggregate age/gender affinity. Scores are not labeled as percentages or used to infer the individual user's demographics.

Each collection has its own runtime parser. Analyses require a valid server session/revision and do not overwrite the Passport. They load on demand and do not block initial discovery. Heatmaps may return more grid points than an entity-style `take` suggests; rendering is bounded to 2,000 valid points.

## Visual implementation

Modern Passport uses the approved Forest & Butter direction: warm butter background, forest actions, Manrope type, readable controls and responsive cards. Header and workspace navigation remain nonsticky. The assistant remains a bottom-corner action with a close control and one content scroller.

Cards use Qloo-returned image URLs only. Missing/broken images use original category icons, never unrelated venue photographs. Card copy prioritizes returned contribution or tag evidence. Prices remain relative tiers; no booking, opening-hour or travel-time guarantee was introduced.

## Verification

- Complete regression suite: 166 tests passed in the latest completed run; includes activity/type routing, cuisine-tag/entity separation, exact dishes, confirmation continuation, empty-shortlist tool policy, strict filters, distinct previews and cancellation while queued.
- Production webpack build and its TypeScript validation passed; production HTTP smoke also passed health/no-store, home rendering and 404 behavior.
- Mocked browser acceptance passed account registration names, password changes, reusable tastes across cities, no login-library flash, budget updates, Together, planner reorder/calendar/saved plans, chat failures/cancellation/retry and responsive containment. New taste/heatmap/demographic views were exercised at 320/390/1440 px. This does not establish live Supabase behavior.
- The final real-browser/live-backend production pass also passed: explicit activities, three-step confirmation/discovery, curated previews, actual day-out choices/download, My Vibe, header/account containment at 320–1440 px, one-scroll assistant at desktop/mobile/short heights, feedback/replanning, guided refinement, reset behavior and mobile layout. The production-hidden model-only comparison was not exercised by this browser test; the native Gemini/MCP and baseline probe was separate.
- Live London activity acceptance returned 18 dining results and 20 film results, with photos for all 38 in that sample and no unwanted Coffee/Music section. Chicken-biryani refinement completed without pending confirmation and preserved the film results. Budget refinement retained only known eligible price tiers. Multi-activity refinement returned 10 cinema and 3 nightlife options and preserved Cinema → Nightlife → Dinner order. These samples do not establish a population-wide accuracy percentage.
- Live analysis acceptance returned 12 taste tags, 402 heatmap points, and one demographic record for the tested artist/NYC request.
- Native Gemini → function selection → Qloo MCP → returned candidate acceptance passed after correcting tool availability. The separate model-only baseline also completed without logging generated content.
- Live independent-coffee refinement completed after one exact concept confirmation, returned 14 eligible coffee options and retained no Starbucks entries in the tested London sample. This is not a guarantee that every unlisted business is independently owned; exclusions rely on returned taxonomy and evidence.
- Historical place trends still returned HTTP 400; artist history was empty. Trend-biased recommendations worked, but nonempty historical trend displays are not accepted. The optional history failure never replaces successful discovery results.

## Repeatable checks

```sh
npm test
npm run build
npm run smoke:production
npm run verify:accuracy
npm run verify:qloo
npm run verify:gemini
```

Live checks require securely configured provider credentials, use quota, and output metadata/counts only. `verify:qloo` currently exits 2 for the known partial historical-trends acceptance. Unit/browser fixtures are synthetic. No raw Qloo payloads or credentials were added to the repository.

## Remaining external requirements

Apply pending Supabase migrations, including `202610180001_flexible_destinations_and_plans.sql` and `202610180002_reusable_taste_profiles.sql`, and configure the existing Supabase credentials securely. They are absent in this workspace, so real registration/email, password persistence, saved-passport writes and reusable-profile writes remain unverified. See [account setup requirements](../PRODUCT.md).

The existing ten-city selector remains for validated product/time-zone behavior. Other documented entity types are routed in code but have not all been live-tested across every city. Optional provider/review-count/metro filters need broader paired-query acceptance before claiming universal enforcement. No unsupported local-concert, reservation, route-optimization or individual demographic claims were added.
