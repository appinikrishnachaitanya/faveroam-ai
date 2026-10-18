# Final product pass

## Customer behavior

1. Refinement recognizes short requests such as "cheaper" and "no chains". Cheaper lowers the current price ceiling by one level, with a minimum of one, while preserving other filters. Explicit exclusions are deduplicated and must resolve before discovery; failed exclusion lookup preserves existing cards.
2. Category previews select up to three distinct returned results. A strong-taste label requires returned affinity; a lower-price choice requires returned price categories; an exploration choice requires a broader-pool receipt. Missing evidence produces neutral option labels rather than invented claims.
3. The planner supports coffee, culture, dinner, cinema and nightlife, up to five distinct stops, selectable and reorderable. Cinema/nightlife require their own returned venue tags. Moving or swapping a stop preserves other selections. Missing categories remain explicit gaps, and users can refine them through Ask TastePassport. It is not a showtime lookup, timed route, reservation or event booking service.
4. Card and planner explanations use matched returned tags, returned venue classifications, address, price/rating and actual contribution evidence where present. Input-only signals are described collectively, never as proven individual causes.
5. Unique exact entity names are suggested automatically in an editable review step. Ambiguous duplicate titles, partial names and personal taxonomy matches still require review. This is conservative name matching, not a calibrated confidence score.
6. New passports use a controlled ten-city selector: Toronto, New York City, London, Paris, Tokyo, Bengaluru, Mumbai, Singapore, Berlin and Sydney. Each has an IANA planner time zone. Earlier custom-city saved passports remain restorable. This replaces the previous unrestricted destination experiment; the list is application scope, not a claim of uniform Qloo coverage.
7. Together reuses category discovery with joint entity signals and returned shared tags while preserving current category preferences/exclusions. Results remain separate from the main Passport and expose location/availability links. It does not claim that both people will like every result.

## Required database upgrade

The original `saved_passports` and `saved_plans` migrations restrict city to five names. Updating frontend/API validation alone cannot remove an already applied database CHECK constraint.

Run `supabase/migrations/202610180001_flexible_destinations_and_plans.sql` in the existing project's Supabase SQL editor. It updates city validation and allows one to five saved stops. It preserves rows, unique ownership keys, RLS, read/delete policies and server-only writes. On a new project, apply all migrations in order.

This workspace has no configured Supabase storage connection; the migration has not been applied here and live authenticated saves remain unverified. The application returns a recoverable storage-upgrade error on passport CHECK violations. Existing snapshot/evidence integrity checks remain active.

## Verification

- Regression suite: 149 passing tests, including exact/ambiguous matching, shortlist evidence limits, short refinements, exclusions, five-activity plan validation, saved snapshots and destination handling.
- Production Chromium contract: passed with explicitly mocked APIs, including activity reordering and adding/removing cinema without changing existing venue selections, account/library flows, Together UI, calendar export, error/cancellation/retry and responsive containment.
- Live Qloo Together diagnostic: A.R. Rahman + Hans Zimmer in London returned 11 shared tags and three validated dining candidates. Both artist IDs reached Insights as signals; all returned candidates retained the price-level ceiling of two. This verifies joint query execution, not satisfaction or preference accuracy for two real customers.
- Live Supabase saving and actual database migration application require verification in the user's configured project.
