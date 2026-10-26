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
