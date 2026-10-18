# Reusable tastes and account updates

## Account behavior

- Registration collects first and last name. The server validates each value and stores only `first_name` and `last_name` in Supabase Auth user metadata. Existing accounts without those fields continue to work. Names are display data, never authorization data or cultural model inputs.
- Account libraries expose Update password. A normal signed-in change requires current-password verification and matching new-password fields. Existing email recovery remains supported. Passwords are cleared when the dialog closes or a change succeeds and are never logged.
- A signed-in user can save the current confirmed tastes and portable preferences from Preferences & Together. Starting a new Passport and choosing a destination exposes Use my tastes in [city]. This retrieves fresh discoveries without re-entering or re-resolving confirmed interests.
- Portable data includes confirmed cultural IDs/names, category requirements, budget/quality settings, tag exclusions and discovery modes. It excludes old city/area/radius filters, rejected venue IDs, returned places, candidate address descriptions, chat, identity and session tokens. Geography is supplied by the newly selected destination.
- Reusable tastes can be removed independently of saved city Passports. Account deletion cascades to the reusable profile.

## Deployment requirements

Apply pending Supabase migrations in order, including `202610180001_flexible_destinations_and_plans.sql` and `202610180002_reusable_taste_profiles.sql`. The second migration creates `taste_profiles` with owner-only reads/deletes and server-only writes; no new migration is needed for Auth name metadata. Configure the existing Supabase URL, publishable key and secure server role credential. Review existing email confirmation and recovery redirect URLs for the deployed origin.

The current workspace does not have configured Supabase storage credentials. Live registration, Auth metadata persistence, password updates and taste-profile storage therefore remain unverified here. Automated browser account/profile checks use explicitly mocked APIs and do not establish live Supabase success.

## Approved visual direction

The user selected Modern Passport in Forest & Butter. Shared typography, warm butter surfaces, forest actions and responsive activity cards are implemented. Recommendation photographs come from Qloo-returned entity image URLs; missing or failed images use original category icons. No preview photography, stock venue photos or generated mock venues were added to production. Navigation remains nonsticky.

See [the accuracy and visual implementation report](ACCURACY_AND_FOREST_PASS.md) for current behavior and verification.
