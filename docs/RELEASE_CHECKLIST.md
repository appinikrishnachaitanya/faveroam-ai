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

## Required local checks

| Check | Outcome |
|---|---|
| `npm test` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run smoke:production` | PASS |
| Real production browser | PASS: native dining refinement, contextual budget follow-up, read-only answers, cinema recovery, preserved dinner, desktop/mobile containment |
| Import reachability / documentation links | PASS: 136 code files reached; 26 Markdown files checked |

The runner completed **214 tests: 214 passed, 0 failed, 0 skipped**. The prior suite had 212 tests; this pass removed two tests for retired UI and added four requirement-preservation regressions. The import audit covers Next.js, test and CLI entry points; it is not a claim that every CSS selector or export has been formally proven necessary.

## Live evidence and remaining limits

The current real-Qloo style regression passed: Familiar returned 16 dining results, Balanced 20 and Explore 13. Every accepted result retained Indian cuisine and vegetarian-option intersection filters, a maximum price category of 2, minimum business rating 4.0 and unchanged Music/Movies. These counts describe the recorded run, not a guaranteed result inventory.


A fresh native Gemini/MCP probe also passed in this pass: Gemini selected `qloo_find_tags`, actual MCP execution returned five catalogue matches, and the same-request model-only baseline was generated. That probe stopped at an appropriate confirmation step; it does not certify completed cultural replacement or the Railway browser. Its logs now omit the request text.

Prior live native Gemini/Qloo context acceptance completed rating-minimum follow-ups at 4.6 and 4.7, retaining price, cuisine, diet and Music/Movies. The later decision-receipt probe encountered Gemini HTTP 504. A separately labelled guided/Qloo run returned 18 price-cap-1 dining results with a verified listing example. Those observations describe their runs, not current availability.

Historical trending remains partially accepted. Real Supabase/email/ownership acceptance has not been established by mocked UI tests. Public Railway access was blocked by the execution environment's HTTP 403 proxy response during media preparation. Real venue photos from `images.qloo.com` were also unavailable from that capture environment. Do not label local screenshots as captures of the Railway site.

## Final deployment and submission gates

- [ ] Railway deploys the intended `work` release; compare its commit with the submitted code. The repository's `master` branch previously differed from `work`.
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
