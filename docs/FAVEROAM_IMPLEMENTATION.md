# FaveRoam implementation tracker

Branch: `feat/faveroam-experience`. Existing routes, database names, credentials,
sessions, saved content and deployment URL remain compatibility boundaries.
No deployment is implied by a successful push.

## Milestones

| Milestone | Status | Acceptance still needed |
| --- | --- | --- |
| Repository and existing feature audit | Completed | Live provider/auth acceptance is separate |
| Public name, tagline, metadata, original logo assets | In progress | Complete remaining public exports and visual review |
| Premium typography and responsive landing/workspace | Pending | 375/768/1440 browser checks and contrast review |
| Previous regression findings | In progress | Map tiles, visible-order comparisons, independent/quiet constraints, classification, nearby shared results |
| Two Roots, One City | Pending | Extend existing Common Ground and WeekDay representation; approved, rejected and locked activities |
| Vibe Dial | Pending | Up to three explicit evidence-backed choices, scoped changes and receipt |
| My Rituals | Pending | Durable account persistence and safe guest behavior |
| Single-stop repair, undo, comparison UI | Pending | Preserve all other activities and show evidence |
| Sharing/auth/calendar acceptance | Pending | Expiry/revoke, guest transition, reload, ICS import |
| Final regression and release gates | Pending | Automated and actual browser/live acceptance |

## Existing capabilities to extend

Next.js App Router, native Gemini tool selection, server-owned state validation,
Qloo entity/tag resolution and Insights, Compare, Supabase account persistence,
MapLibre with schematic fallback, seven-day planning, opaque expiring share links,
and actual decision receipts already exist. Avoid parallel implementations.

## Current changes

Public-facing application name and tagline updated without renaming internal
identifiers, lowercase event names, database tables, routes or environment keys.
Original SVG mark, light/dark wordmarks and 3:2 cover added under `public/brand`.
Presentation tokens introduce the requested navy, amber and off-white palette.
This is a brand foundation milestone, not completion of the redesign or features.

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

470 tests and the production build/type check passed. Live provider acceptance is
still pending. Landing/workspace redesign requires the requested design preview
before application. Map tiles, visible-card references, shared-place geography,
sharing acceptance, rituals and durable weekly persistence remain open.

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

Deferred/unfinished: real-provider map/category acceptance, signed-in save/reload,
rituals, durable weekly persistence, full Two Roots live journey and deployment.

Final local gates for this combined milestone: 473 tests passed, documentation
links passed, production build passed, typecheck passed, production smoke passed.

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
