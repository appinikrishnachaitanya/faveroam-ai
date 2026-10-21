# Submission release checklist

Recorded for the stabilization pass on **October 19, 2026**. The submitted deployment and public-access checks are separate from local verification.

## Scope freeze

Preserve the existing guest, conversation, Qloo, Together, profile/account and outing flows. No new major features or agent swarm is required for this release. The demo should prove one reliable cultural-discovery journey.

## Stabilization changes

- Removed an unreachable technical-evidence component, retired activity-feed renderer/helper and their two obsolete UI tests.
- Removed unused draft/loading helpers, buffered event state and unused card props/imports.
- Applied the existing display-tag sanitizer to connection badges.
- Preserved explicit cuisine/diet refinement context across Familiar/Balanced/Explore, including protection for legacy states with missing context.
- Enabled strict unused-local/parameter checking; renamed the package from the original spike label.
- Removed unused Render configuration and superseded one-off phase reports. Retained selected historical acceptance records under `docs/archive`.
- Consolidated current product, design, architecture, implementation and operations documentation. Preserved the demo script and Devpost submission draft.
- Current commit-eligible files passed a value-based check for configured provider/service secrets; this is not a claim about all Git history.

## Recommendation relevance pass

- Familiar content now prioritizes matching-domain seeds. Unrequested cuisine/ambience tags do not steer content requests with entity signals.
- Balanced uses weighted reciprocal-rank fusion and a limited adjacent-only reservation. The three-choice preview preserves the resulting ranking; repeated place businesses are limited.
- Filter controls refresh from active server preferences. An explicit budget supersedes the legacy cheaper flag, including clearing the actual query cap with Any budget.
- Together explains its named-entity inputs before searching; tag-only profiles receive actionable guidance.
- Discovery and saved profiles accept one to five confirmed tastes. New Passport offers required-name saving, skipping or cancelling; signed-in start screens list reusable profiles.
- Cards show available ratings instead of numeric price-category badges. Discover and Insights use stronger Forest & Butter contrast and clearer purpose/action copy. The home city is explicitly cover context.
- Model-supplied dining budget/rating defaults cannot be introduced into a newly requested cinema category without a corresponding request.
- Fixed-profile live Qloo checks completed across contrasting films, artists and cuisines. The old mixed query reproduced Qismat 2/Freddy/Kabir Singh; familiar Interstellar retrieval began Dune: Part Two/Clara/Zack Snyder's Justice League. Changing the movie changed the top ten; changing the artist alone preserved familiar movie results.
- A real Together route returned six dining suggestions, each with positive contribution evidence from both profiles, while retaining Indian cuisine, price cap 2, minimum business rating 4 and the original Passport.
- [Policy, research and evaluation](RECOMMENDATION_POLICY.md) records the design and its limits. These checks do not establish a relevance percentage.

## Required local checks

| Check | Outcome |
|---|---|
| `npm test` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run smoke:production` | PASS |
| Real production browser | PASS: native dining refinement, contextual budget follow-up, synchronized controls, actual Any-budget clearing, read-only answers, cinema recovery, preserved dinner; one-interest discovery and origin-cover behavior |
| Account UI contract (mocked HTTP) | PASS: New Passport naming/cancel/save/reuse, login/library behavior, Together, Insights and responsive containment |
| Visual contrast | PASS: checked Insights text ratios 7.30–7.85:1; no overflow at 320/390px |
| Import reachability / documentation links | PASS: Previous audit reached 136 code files; current local links checked in 27 Markdown files |

The latest runner completed **239 tests: 239 passed, 0 failed, 0 skipped**. The earlier stabilization pass completed 214 tests; recommendation work adds routing, fusion, preservation, diversity and budget-clearing regressions. The import audit covers Next.js, test and CLI entry points; it is not a claim that every CSS selector or export has been formally proven necessary.

## Live evidence and remaining limits

Single-interest live Qloo checks returned 20 movie, 20 artist and 18 dining results in the recorded run. A real production browser completed one-interest New York discovery, displayed Bengaluru as cover context, and confirmed that the origin was not forwarded as a recommendation input.

The account browser contract verified that Save tastes appears on New Passport, requires an entered name, preserves the Passport on cancel and offers saved-profile reuse on the start screen. Account HTTP responses were explicitly mocked; this is not live Supabase persistence evidence.


The current real-Qloo style regression passed: Familiar returned 16 dining results, Balanced 20 and Explore 13. Every accepted result retained Indian cuisine and vegetarian-option intersection filters, a maximum price category of 2, minimum business rating 4.0 and unchanged Music/Movies. These counts describe the recorded run, not a guaranteed result inventory.


A fresh native Gemini/MCP probe also passed in this pass: Gemini selected `qloo_find_tags`, actual MCP execution returned five catalogue matches, and the same-request model-only baseline was generated. That probe stopped at an appropriate confirmation step; it does not certify completed cultural replacement or the Railway browser. Its logs now omit the request text.

Prior live native Gemini/Qloo context acceptance completed rating-minimum follow-ups at 4.6 and 4.7, retaining price, cuisine, diet and Music/Movies. The later decision-receipt probe encountered Gemini HTTP 504. A separately labelled guided/Qloo run returned 18 price-cap-1 dining results with a verified listing example. Those observations describe their runs, not current availability.

Historical-data UI and automatic history enrichment have been removed; the retained backend diagnostic remains only partially accepted. Real Supabase/email/ownership acceptance has not been established by mocked UI tests. Public Railway access was blocked by the execution environment's HTTP 403 proxy response during media preparation. Real venue photos from `images.qloo.com` were also unavailable from that capture environment. Do not label local screenshots as captures of the Railway site.

## Concierge and Insights regression pass — 20 October 2026

The updated customer flows passed the production build, type checking and the fixture-backed browser contract, including chat choice cards, 44 px action targets and containment at 320/390/1440 px. The live native Gemini/MCP probe selected and executed `qloo_find_tags`, observed five returned tags and correctly stopped for confirmation; the same-request model-only baseline completed. This does not certify a completed venue refinement or hosted Supabase account flows. No additional database migration or payload-limit increase is introduced. See [product decisions and source review](CONCIERGE_AND_INSIGHTS.md).

## Final deployment and submission gates

- [ ] Railway deploys the intended `feat/discover-first-workspace-polish` release; compare its commit with the submitted code. Do not assume `master` matches the deployed branch.
- [ ] GitHub CI passes for the submitted commit; deployed `/api/health` returns HTTP 200.
- [ ] A fresh signed-out browser completes entity confirmation and real discovery.
- [ ] Native Gemini is healthy and completes constrained dining plus a contextual follow-up. Check safe request/tool/Qloo/result logs.
- [ ] Explicit diet, budget and preserved categories remain intact through refinement and style changes.
- [ ] Together returns actual shared tags and a useful joint result for the rehearsed profiles, or the demo states the limitation.
- [ ] The outing contains usable real venues; cinema retrieval retains dinner. Check hours, travel and availability separately.
- [ ] If saving/accounts appear in the demo, verify real registration, confirmation, login, password recovery, save/restore and user isolation on Supabase.
- [ ] The repository, intended branch, MIT license, live URL and uploaded video are accessible while signed out.
- [ ] Verify current Devpost rules, eligibility, deadline and required submission fields. Use the actual project start date.
- [ ] Capture real app screenshots with demonstration data. No invented results, misleading successful-agent screens or fabricated baseline.

Current readiness is conditional until these deployed/access checks are complete. Passing local tests does not justify an “all production flows verified” claim.

## First-level customer regression fixes — 21 October 2026

- Candidate labels include returned entity type/year and remove missing-value placeholders. Duplicate display identities collapse; different types/years remain separate choices requiring confirmation.
- Taste themes are restricted to the selected interests’ taxonomy domains; generic labels and unrelated food/place themes are omitted for film-only inputs. Empty filtered results offer another selection rather than invented themes. This is a conservative relevance guard, not proof of individual causal affinity.
- Cinema eligibility requires a cinema tag, an address and a venue-specific name or description. Tagged squares do not automatically qualify. Explicit cinema retrieval and planner selection share this guard. Sparse metadata may exclude a real cinema; opening times and screenings remain unverified.
- Regression fixtures reproduce the reported Toy Story placeholders, Interstellar theme noise and Leicester Square selection. Full suite: 354 passed. These are local checks; fresh hosted Together/Insights/planner acceptance remains pending. No theme or database changes.

## Restrictive-filter state consistency

Failed or empty category retrieval now retains the previous active settings with the previous cards. The attempted settings are stored separately in `failedSearches` and are labelled unapplied; an explicit retry restores that draft only for retrieval. Successful replacement commits the new settings and clears the draft. Other categories remain independent. The preferences form resynchronizes on the committed session revision. No database migration is required. Availability and booking limitation answers are read-only safeguards, not a general conversational engine.

Local suite: 359 passed, including the restrictive Soho/Mayfair/Michelin/budget/rating/review-count case, provider failure and exact retry preservation. Hosted regression remains pending. The model currently interprets intent and selects tools; many final responses are still templates. The grounded response-generation stage below supersedes the earlier template-only final-response path for native Gemini.

## Native grounded response stage

Native Gemini now composes a tool-free reply after validation, using current preferences, compact conversation context, the actual outcome and returned choice facts. A separate single-call response budget caps this stage at eight seconds without retry; failure preserves the original outcome. Dynamic prose is checked for supplied references, unsupported metrics and several forbidden availability/mutation claims, with deterministic category receipts retained. Compatible-provider and guided paths remain available.

The local suite passed 367 tests and type checking. A real configured Vertex request for “Are these open now?” completed the native composition and response checks in approximately 1.4 seconds, with no tool calls or Passport changes. This verifies one read-only response, not the entire deployed refinement journey. Public Railway acceptance remains pending. No theme or database changes.

## Follow-up blockers reproduced and corrected

- Reproduced the noodles → misspelled chicken biryani → peaceful sequence with a deliberately stale model question. Removed restoration of a superseded pending choice, kept unconfirmed category settings in a draft, and prevented the next request from inheriting abandoned dish concepts. Genuine read-only questions can pause a choice; they do not confirm it. Repeated identical requests retain the existing choices without duplicate lookups. “None of these” clears legacy unconfirmed concepts.
- Expanded bounded dish typo normalization to food contexts such as chicken, without requiring the literal word “eat”. An explicit edit takes precedence over a contradictory read-only model guess.
- Explicit resolved specialty-dish requirements require matching returned listing tags. Generic restaurants do not become verified chicken-biryani choices merely because a query returned them. This deliberately favors precision and may return no verified matches where metadata is sparse; it does not verify today's menu.
- Download and save share destination-local calendar-date validation; both reject past/invalid dates and invalid stop-time order. The browser handlers check these rules in addition to disabling buttons.
- Full local suite: 376 passed; production build and hosted/browser acceptance are recorded separately. Remaining broad relevance concerns (for example campus stores or generic podcasts) need profile-specific live evaluation rather than claims of a universal accuracy score.

Final verification for this batch: 376 regression tests passed; final production build and documentation checks passed. The fixture-backed Chromium contract passed, including past-date download/save rejection, planner ordering, theme category scoping, accounts and responsive containment. The final targeted memory/clarification/dish/date rerun passed 17 tests. These do not certify all hosted providers or real Supabase accounts. Retest with a fresh Passport after deployment because earlier inconsistent sessions cannot reliably reconstruct their original filter history.
