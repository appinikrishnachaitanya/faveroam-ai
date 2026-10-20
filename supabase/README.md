# Supabase setup

The only app database script is [`setup.sql`](setup.sql). In **Supabase → SQL Editor → New query**, paste the whole file and run it once. It drops and recreates saved Passports, saved plans, named taste profiles and temporary editing sessions. **All data in those four tables is lost.** Supabase Auth accounts remain. The `destinations` table and every existing destination row, including custom entries, enabled states and ordering, remain; the ten starter cities are inserted only when absent.

The script is one transaction. If any statement fails, the data changes roll back. It creates no city allowlist, city foreign key, snapshot-size CHECK constraint or stop-count CHECK constraint. The app validates incoming snapshots, stop IDs, times and size before using the server writer. Database primary keys, owner foreign keys, unique records and row-level security remain in place. Browsers may read or delete only their own saved rows; only the server role writes them. Active editing sessions are server-role-only.

Run the SQL **before** using a build that reads `saved_plans.stop_times`. After success, refresh the app, sign in, create a new Passport and save it. Then save a dated plan and a named taste profile. Old open Passports reference discarded editing sessions, so start a new one. The final query should list five app tables. If saving still fails, inspect the backend's sanitized `passport.storage.failed` stage and code; a `23514` after this reset would indicate a constraint outside this script. Do not paste secrets or private SQL error details into chat.

Manage destinations in **Table Editor → destinations**. Add or disable entries and set `sort_order` there. A listed destination is eligible for discovery but does not guarantee enough returned recommendations. New cities without a known local time zone use the planner's disclosed UTC fallback.

Expired active sessions cannot be loaded. Schedule this separate maintenance query in Supabase when convenient: `delete from public.active_passport_sessions where expires_at < now();` The setup script itself never runs automatically during CI or Railway deployment.
