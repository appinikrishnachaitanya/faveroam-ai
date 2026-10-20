# Supabase database setup

In your project's Supabase dashboard, open **SQL Editor → New query**. Run each migration separately, in this order. For an existing installation, run only migrations you have not already applied.

1. `migrations/202610160001_saved_passports.sql` — saved Passports and ownership policies.
2. `migrations/202610170001_saved_plans.sql` — dated personal plans.
3. `migrations/202610180001_flexible_destinations_and_plans.sql` — removes the old ten-city database constraint and supports flexible plans.
4. `migrations/202610180002_reusable_taste_profiles.sql` — reusable interests across cities.
5. `migrations/202610180003_destination_catalog.sql` — database-managed destination dropdown.
6. `migrations/202610180004_named_taste_profiles.sql` — named, reusable profiles.
7. `migrations/202610200001_expand_saved_passport_snapshot.sql` — allow evidence-rich Passport snapshots up to 2 MB without deleting existing rows.
8. `migrations/202610200002_active_passport_sessions.sql` — **required for restart-safe Passport/plan saving**, adds service-role-only temporary active sessions; does not change existing saved Passports or plans.

Use **Table Editor → destinations** to add a city (name, enabled, sort_order), disable one, or reorder the list. Only enabled cities appear. The server validates both new Passports and saved-taste reuse against this same table. Changes appear on the next onboarding load; no code deployment is needed. Use clear locality names (for example `Portland, Oregon`) where names are ambiguous. A listed city does not guarantee Qloo has enough recommendations there.

The catalogue is publicly readable through RLS; browser clients cannot insert, edit or delete rows. Manage rows through the Supabase dashboard or trusted administrative tooling. No service key is sent to the browser. If Supabase is configured but its catalogue is unavailable, discovery shows a retry state rather than silently reverting to the original ten cities. The original list remains available for guest-only environments without Supabase configuration.

Existing ten cities have local calendar time zones. Newly added cities currently use the planner's disclosed UTC fallback; verify dates before saving/exporting a plan.

Registration names are stored in Supabase Auth user metadata, not a separate table. Enable email confirmation under Auth settings and configure the deployed app's redirect URL. Keep credentials in secure environment settings.

## Start fresh (deletes app data)

If you want to discard the existing saved data, run **`reset_app_data.sql`** in SQL Editor instead of running the migrations individually. It drops and recreates only TastePassport's four public app tables, with no city CHECK constraints or city foreign keys, while restoring snapshot integrity checks and RLS policies, and seeds the ten initial destinations. Existing Supabase Auth accounts remain. It is atomic and does not use CASCADE. Do not add this file to automatic deployment steps.

After success, refresh the app, sign in again if needed, and generate a new Passport. Old refinement sessions in an already running app may remain until expiry; restarting the app clears them. Manage cities in Table Editor → destinations.

The fresh script creates the current schema directly. It does not temporarily create the old fixed-city constraints or replay historical migrations. The ten inserted cities are editable starter data, not an allowed-values constraint.

## Named profiles

For an existing database, run `migrations/202610180004_named_taste_profiles.sql` after the earlier migrations, then run the 202610200001 Passport snapshot upgrade. It preserves existing tastes under “My tastes” and allows multiple profiles per account. If starting fresh, the updated `reset_app_data.sql` already contains this schema; do not reset merely to add profile names.
