# FaveRoam implementation tracker

Branch: `feat/faveroam-experience`. Existing routes, database names, credentials,
sessions, saved content and deployment URL remain compatibility boundaries.
No deployment is implied by a successful push.

## Milestones

| Milestone | Status | Acceptance still needed |
| --- | --- | --- |
| Existing feature audit and original brand assets | Completed | Public submission media review is separate |
| Responsive landing and workspace palette | Implemented | Landing checked at 375/768/1440; full workspace needs real-device review |
| Taste Insights theme quality | Implemented in code | Per-interest attribution/caps and honest partial-result wording; live Qloo diversity remains |
| First Week account persistence | Implemented in code | Save/reopen/update/delete; run updated `setup.sql` and verify with a signed-in account |
| Navigation render cost | Improved in code | Stable callbacks, memoized account/navigation, map released off Discover; loaded-browser profiling remains |
| New local illustrations | Implemented | Insights, My Vibe, Vibe Dial and First Week; review responsive balance |
| Map and shared geography | Implemented in code | Attributed tiles and explicit place anchor/radius; live tiles remain unverified, median clustering deferred |
| Two Roots, One City | Implemented in code | Live-provider journey remains; candidate pools can be sparse |
| My Rituals | Deferred | Not part of the current requested changes |
| Stop repair, undo, and comparison UI | Implemented in code | Full browser acceptance remains |
| Sharing, account, and calendar acceptance | Partial | Validate live link lifecycle, real account ownership, and ICS import |
| Final release gates | Pending | Full tests/build/smoke/browser checks, remote CI, and deployed revision verification |

## Existing capabilities to extend

Next.js App Router, native Gemini tool selection, server-owned state validation,
Qloo entity/tag resolution and Insights, Compare, Supabase account persistence,
MapLibre with schematic fallback, seven-day planning, opaque expiring share links,
and actual decision receipts already exist. Avoid parallel implementations.

## Original implementation notes

Public-facing application name and tagline updated without renaming internal
identifiers, lowercase event names, database tables, routes or environment keys.
Original SVG mark, light/dark wordmarks and 3:2 cover added under `public/brand`.
Presentation tokens introduce the requested navy, amber and off-white palette.
This was the initial brand foundation; later milestones below record the expanded work.

## Foundation validation

- TypeScript check passed.
- Full automated suite: 461 passed, 0 failed.
- Optimized production build passed.
- Existing CDP browser runner could not connect to localhost:9231 (no browser listening).
- No live authentication, Qloo, map-tile, or deployed visual acceptance is claimed.
- No database schema, credentials, or deployment settings changed.

## Stability milestone 2

- Explicit independent/no-chain wording activates the existing mainstream exclusion.
  Known chains are excluded; remaining ownership is still unverified.
- Explicit cinema/movie-theater taxonomy outranks a café amenity in both venue classifiers.
- First Week calendar export validates calendar dates and uses the FaveRoam product label.
- Automated regression suite: 464 passed, 0 failed; TypeScript check passed.
- Live venue relevance, map tiles, ordinal reference synchronization and practical
  shared-venue geography still need acceptance/further work. This does not close
  the entire stability gate.

## First Week editing milestone

- Existing WeekStop representation now supports optional locks without breaking older plans.
- One-stop venue/time edits preserve other stops; locked activities reject changes.
- Removal leaves an explicit open slot; duplicate venues are rejected.
- One-step undo restores the pre-edit state. Rebuilding/date changes require unlocking.
- Venue/time fields now have separate accessible labels and responsive action rows.
- Full suite: 466 passed; TypeScript and production build passed.
- Weekly editing state is still local to the mounted planner; durable weekly saving,
  Two Roots assignment, evidence UI and browser acceptance remain unfinished.

## Two Roots planner integration milestone

Common Ground now exposes a joint week through the existing FirstWeek component
and WeekDay/WeekStop model. Stops retain optional `you`, `partner`, or `both`
attribution. Each pool uses only its own returned profile/joint-search candidates;
missing individual results cannot be filled with a shared venue under a false label.
Replacement lists stay within the stop's attributed pool. Locks/removal/undo use
existing controls. No extra API calls or database schema changes are introduced.

Verification: 468 automated tests passed; TypeScript and optimized build passed.
Live two-profile Qloo acceptance, durable weekly saving, approved-sharing granularity,
and practical geographic ranking remain open. Candidate coverage can be sparse,
because the existing exchange supplies only one individual place per profile.

## Overlay responsiveness milestone

Discovery sections and MapLibre now have memoized render boundaries. Filtered
Passport data and feedback dictionaries retain identity until their source state
changes. A stable feedback bridge delegates to the latest committed handler, so
memoization does not retain stale session or preference callbacks. FirstWeek also
skips unrelated parent renders. Drawer and navigation backdrop blur were removed
to avoid compositing the map and large card grids behind overlays.

468 tests passed and production build/type checking passed. These changes address
observed code paths that do unnecessary work; no browser latency measurement or
universal device-performance claim is made. Live interaction profiling is pending.

## Vibe Dial milestone

Discover now offers up to three existing returned themes, scoped to active relevant
categories. It sends the selected exact tag through the established inspiration
preference path, keeping original interests and explicit requirements. The receipt
counts new and retained entity IDs; unsuccessful changes are not called successful.
No usable returned themes means the quiz is omitted. Choices are memoized and do
not add provider calls until the user explicitly applies a direction.

470 tests and the production build/type check passed at that earlier milestone.
Later sections record the responsive redesign, map, sharing, and First Week work.

## Combined design, interaction and sharing milestone

- Landing now uses the approved editorial layout direction, an original city SVG,
  functional sample/city CTAs, and locally hosted Inter/Fraunces WOFF2 fonts with OFL licenses.
- Navigation labels use My places, First Week and Common Ground. Desktop sidebar
  and mobile menu reuse the existing navigation component.
- Hidden Intelligence, Insights, Vibe Dial and day-planning panels have memoized
  render boundaries and stable handlers. Tab changes no longer animate a page scroll.
- Visible-card comparisons send bounded entity IDs and validate them against the
  current session before comparing. Explicit second/third and named pairs are covered.
- Map tiles use direct attributed CARTO raster sources, avoiding the style/glyph
  dependency chain; schematic fallback remains. Live external tile loading is unverified.
- Common Ground offers an explicit real-place anchor and radius, omitting unknown
  coordinates while active. It never silently expands the radius. Shared-week locks
  block area changes. Median-cluster ranking is deliberately deferred.
- Shared snapshots reject malformed records; account/storage fetches bypass caches.
  Synthetic protocol tests cover expiry queries, wrong revoke credentials, successful
  revocation and a fresh read after deletion without external records.
- Production smoke now expects the actual FaveRoam brand. GitHub API log access
  returned Forbidden, so remote CI status has not been independently inspected.
- Chromium landing checks passed at 375, 768 and 1440 pixels: no horizontal overflow,
  local fonts, branding and the city CTA. These are not full authenticated/live discovery tests.

Still awaiting live acceptance: map tiles and provider-driven results, signed-in
save/reload including First Weeks, full Two Roots flow and deployed revision.
My Rituals is deferred, and median neighbourhood clustering remains deliberately
parked.

Final local gates for this combined milestone: 473 tests passed, documentation
links passed, production build passed, typecheck passed, production smoke passed.

## Insights, saved weeks, illustrations and responsiveness

- Taste Insights now treats themes as individual-interest results, names the source
  interest on each theme, limits a seed to a short list from a taxonomy family,
  and distinguishes an unavailable lookup from a successful lookup with no theme.
- New local SVG illustrations appear in Taste Insights, My Vibe, Vibe Dial and
  First Week. Passport and Common Ground continue to use their existing original
  artwork. No external image calls were added.
- Added `saved_first_weeks` to `db-scripts/setup.sql`. Signed-in users can save and
  upsert seven days by destination/start date, reopen or update the saved week,
  download its `.ics`, and delete it from Upcoming plans. Requests carry IDs only;
  the server reconstructs venue data from the active session and stores a compact
  snapshot. An owner may edit an existing saved week after its source session has
  been refreshed; prior venues are accepted only from that owner’s stored week.
- Stabilized account and navigation callbacks to avoid rerendering large hidden
  account/panel subtrees on each workspace update. MapLibre is released when the
  user leaves Discover. This is a code-level reduction; no real-device latency
  benchmark has been measured.
- Updated workspace palette and text contrast on primary action, insight, account,
  map, planner and Common Ground surfaces. Responsive full-workspace visual review
  is still required; the automated screenshot check covers the landing screen.

The user approved loss of existing app data. The updated `setup.sql` is still a
manual destructive reset; run it in Supabase before deploying to create the new
table. It must never run in CI or during deployment.

## Interaction latency and alignment pass

- Workspace content is mounted on first visit to each section instead of doing
  all planner and insights initialization during discovery startup. Visited
  panels stay mounted so their current form/results state is retained.
- The chat dialog and rich transcript are not rendered while closed. The draft
  survives closing/reopening, and the latest 24 messages are shown by default;
  older turns remain available on request. The composer is memoized with a
  stable submit callback so unrelated workspace updates do not rerender it.
- A routine refinement with validated result cards and no newly applied filters
  skips the optional second Gemini composition call. Explicit explanation and
  comparison requests, as well as filtered refinements, retain composition.
  Returned evidence cards and the deterministic completion message remain the
  source of truth.
- Discovery card metadata and category headings now share a predictable text
  edge and heading layout at narrow widths.
- Regression coverage verifies the composition-call policy. Backend request,
  provider, Qloo, and session read/write logs include elapsed time, but no live
  browser/device or production latency benchmark is claimed. Typing itself is
  local state and does not send Gemini a request until submit.

Changed-file inventory:

```text
README.md
app/components/day-out.tsx
app/components/first-week.tsx
app/components/intelligence.tsx
app/components/onboarding.tsx
app/components/passport-map.tsx
app/components/passport-navigation.tsx
app/components/taste-analysis.tsx
app/components/vibe-dial.tsx
app/page.tsx
app/share/[token]/page.tsx
app/styles/faveroam.css
docs/FAVEROAM_IMPLEMENTATION.md
docs/PROJECT_GUIDE.md
package.json
public/fonts/OFL-Fraunces.txt
public/fonts/OFL-Inter.txt
public/fonts/fraunces-variable.woff2
public/fonts/inter-variable.woff2
public/illustrations/faveroam-journey.svg
scripts/smoke-production.mjs
scripts/verify-faveroam-layout.mjs
src/account/server.ts
src/agent/existing-choice.ts
src/agent/orchestrator.ts
src/agent/types.ts
src/passport/common-ground.ts
src/share/links.ts
tests/faveroam-release.test.ts
tests/progressive.test.ts
```

## Repeated opening and closing

- The chat dialog mounts on first opening and retains its transcript on close.
- Discover retains its map across tab/map toggles, stops camera motion while
  hidden, and resizes the same instance when shown. Coordinates and day labels
  participate in map invalidation; changing those inputs refreshes markers.
- Removed repeated message/card/dialog entrance animations and full-page dialog
  backdrop blur. Closing chat restores focus without scrolling the workspace.
- Saved-plan edit navigation now activates the lazy planner before displaying it.
- These address identifiable render/reinitialization costs. Production interaction
  latency and provider timings still require measured acceptance.

Validation for this pass: 483 tests passed; production build, production smoke,
documentation links, and diff checks passed. Map retention in this milestone
supersedes the earlier implementation that released it when leaving Discover.

## Navigation render boundaries and measured local acceptance

Sharing, chat text/recommendation cards, Passport cover, and saved discoveries
now skip unrelated navigation renders. Theme derivation is memoized against
Passport cards/interests. Chat callbacks delegate through refs to current handlers;
card comparison retains updates when card references, saved IDs, busy state, or
callbacks change.

Local production Chromium acceptance used a synthetic 100-card Passport, three
cycles through Preferences/Common Ground/Insights/First Week/Discover, and 4x CPU
throttling. Click-to-two-animation-frame completion ranged from 34–178 ms on
desktop and 65–205 ms at 375px mobile width (including opening the mobile menu).
Chat open/close ranged from 24–128 ms; composer DOM identity was preserved.
These are fixture checks without provider calls or map coordinates, not field
performance measurements or map-tile/authentication acceptance. Full automated
suite: 483 passed; production build and TypeScript check passed.
