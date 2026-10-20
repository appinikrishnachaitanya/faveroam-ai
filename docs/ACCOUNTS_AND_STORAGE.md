# Accounts and storage

Accounts are optional for discovery. Supabase Auth handles email/password registration, email verification, login, recovery and password updates. The server uses HttpOnly cookies and calls `auth.getUser()` before private operations. The nav has **My plans & Passports**, **Account settings** and **Sign out**. The library has saved-Passport and upcoming-plan tabs.

## Set up the database

Run the single [Supabase setup script](../supabase/setup.sql) in your own project's SQL Editor **before deploying this version**. It permanently removes saved Passports, saved plans, named taste profiles and active editing sessions, as authorized for this reset. It preserves Supabase Auth accounts and all destination catalogue rows, including custom cities, enabled states and ordering. The script creates all four app-data tables in one transaction; no historical migration sequence remains. It has no fixed-city or snapshot CHECK constraints. See [exact steps and security boundaries](../supabase/README.md).

Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `APP_ORIGIN` in secure server environment settings. Never put a service-role key in a browser variable, repository, log or chat. Configure the deployed callback origin in Supabase Auth and require email verification. Existing login accounts remain, but users must create new Passports and profiles after the data reset.

If Save Passport reports PostgreSQL `23514`, the backend logs only a sanitized stage and code. The current schema script contains no snapshot/city CHECK constraint; a fresh `23514` after running it points to an additional database constraint outside this script or to an incomplete reset. Do not assume the exact constraint from the customer message. Real hosted Supabase execution and account acceptance have **not** been verified locally.

## What is saved

- A saved Passport is one trusted server snapshot per user and city, with confirmed interests, current discoveries, evidence and My Vibe choices. The server caps serialized snapshots at 1.8 MB and validates their shape. Chat history, secrets, temporary tool state and model-only comparisons are excluded.
- A named taste profile contains confirmed interests and portable preferences. Selecting it on the start screen fills those interests for a new destination. The name is required when saved from New Passport.
- A dated plan contains one to five current, eligible venue cards copied from the trusted active session, their order and suggested local start times. It is a personal plan, not a booking or verified opening-hours schedule. Calendar export uses timed entries; historical all-day plans remain readable if present.
- An active editing session is temporary, server-only and expires after 24 hours without activity. It can survive a Railway restart when the `active_passport_sessions` table is available. Expired rows cannot be loaded; schedule `delete from public.active_passport_sessions where expires_at < now();` for physical cleanup.

Browsers can select or delete only their own saved rows through RLS and explicit owner checks. The service-role writer inserts or updates records only after verified authentication and server-held session validation. No browser-supplied snapshot, venue card, user ID or model output becomes trusted saved data. The destinations catalogue is readable publicly; updates remain an administrator task.

## Verify after setup

Create a new Passport after the reset, then sign in and test Save Passport, reopen, plan save/calendar, named profile save/reuse, password update and sign out. Check a second account cannot read or delete the first account's rows. The local unit tests and mocked browser contract cover application behavior, but they do not prove that the hosted SQL, RLS, email delivery or credentials are configured correctly.
