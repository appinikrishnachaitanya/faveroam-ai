# Accounts and durable Passports

Accounts are optional. The application remains usable as a guest and never substitutes a fake account, local password store or simulated database for managed authentication. Current live account validation is blocked until a Supabase project is configured.

## What is implemented

- Email/password registration with a 12-character minimum, managed email confirmation, login, password recovery and password update.
- Server-managed HttpOnly, SameSite=Lax cookies; Secure cookies in production.
- Every private data route verifies the user with Supabase `auth.getUser()`; a client-supplied user ID or unverified cookie is never an authorization decision.
- Explicit saving of the latest Passport per supported city (up to five cities), plus list/open/delete actions.
- Signed-in navigation exposes My Saved Passports, Upcoming plans and Sign out. Registration requiring confirmation opens a dedicated Verify your email screen, with no password field remaining on screen.
- Personal day-out plans save one to three current place suggestions for a chosen date. Next weekend selects the next Saturday; dates use the destination's calendar. The Upcoming plans library lists future/today outings, supports calendar export and deletion, and does not claim bookings or live event availability. Saving the same city/date replaces that day's plan; other dates remain separate.
- My Vibe retains explicitly liked Qloo cards after category replanning. Conversation reset preserves likes; New Passport clears the active session. Saved account copies remain until explicitly overwritten or deleted.
- Restoring creates a fresh expiring guest-session token; the old bearer token, chat history, pending tool state and model-only comparison are not stored. Saved evidence is dated and marked as restored; refine a category for fresh results.
- Sign out clears the active screen. Account deletion requires re-authentication with the password and typed DELETE, then removes the managed user and cascades saved-row deletion.

## Configure your project

1. Create or use a Supabase project. In Authentication, enable email/password and email confirmation. Configure the provider's minimum password length to at least 12; app validation alone cannot control direct provider calls.
2. Apply `supabase/migrations/202610160001_saved_passports.sql` through the project's SQL editor or your controlled migration workflow. This creates a table with RLS, unique city/user records, owner-only SELECT/DELETE, and server-role-only INSERT/UPDATE. Do not add browser write policies: preventing direct fabricated evidence writes is intentional.
   Then apply `supabase/migrations/202610170001_saved_plans.sql` to create the dated plans table with the same ownership and server-write boundaries. Existing projects that already have `saved_passports` only need this second migration. Both migrations are rerunnable. Deploy the new application after applying the plans migration; no credential changes are needed.
3. Set server-side variables securely:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=<project publishable key, or legacy anon key>
SUPABASE_SERVICE_ROLE_KEY=<server-only service-role key>
APP_ORIGIN=https://YOUR_APP_HOST
```

No Supabase key needs a NEXT_PUBLIC prefix. Never send the service-role key to a browser, put it in Git, or paste credentials into chat. In cloud proxy settings, bind credentials only to your exact project hostname. This hostname is needed before the agent can save a scoped network-secret requirement. The publishable key's role is constrained by RLS; the service-role key is used only server-side after a verified user lookup to write trusted snapshots and process reauthenticated account deletion.

4. Set Supabase Site URL to your app's canonical origin. Allow its `/auth/callback` and `/auth/callback?recovery=1` redirects. For local development use `APP_ORIGIN=http://localhost:3000` and matching local callback URLs. Use the same browser for PKCE email confirmation/recovery; a different browser may need a fresh sign-in after email verification.
5. Restart the app. Production requires HTTPS. Before public release, configure reliable email delivery, managed auth rate limits/abuse protection and appropriate retention/contact/legal policy details for your deployment.

## Security boundaries

Unsafe account/storage requests require the browser Origin to match the canonical app origin. Local fallback uses the request Host rather than Next's rewritten internal hostname; arbitrary forwarded-host headers are not trusted. Explicit APP_ORIGIN is recommended behind a proxy. Account responses use private, no-store caching and Vary: Cookie. Payload sizes are bounded. Raw auth errors, credentials, email and passwords are not logged. Next's development request logger ignores the callback route to avoid printing authorization codes.

Read/list/delete requests use the verified user's client plus explicit owner filters; RLS is the final DB boundary. Save accepts only a live server session ID and current revision, never a browser-supplied snapshot or user ID. It copies trusted server-held Qloo state into the DB using the server writer. One unique row per user/city bounds the library. Restore reads only owned rows written through that boundary and rejects unsupported formats or cards lacking matching Qloo evidence. The service-role credential must remain private and rotated according to the operator's policy.

The guest session ID remains a short-lived bearer capability. Do not share it or log it. This pass does not turn the guest session store into a multi-replica durable agent database; account snapshots are durable while active turns still require the existing in-memory session and per-process limits. Use session affinity or shared active-session storage when deploying multiple instances.

Plan writes also require a current live session revision. The server validates selected IDs against current eligible city cards and copies their names, addresses and evidence itself; it never accepts browser-supplied stop snapshots. Plans exclude hidden categories and audience-only music results. Account deletion cascades both Passport and plan rows. The library returns at most 100 upcoming rows (with a date buffer for destination time zones), then filters by each destination's local date.

## Local validation

`npm test` covers trusted plan selection, date and destination boundaries, calendar output and existing account guards. `node scripts/verify-account-ui.mjs` uses a production app on port 3001 and Chromium CDP on port 9231, with explicitly mocked account HTTP responses. It checks registration verification, signed-in navigation, saved Passport opening, dated-plan saving/listing/calendar export, mobile containment, background scroll locking and logout. This browser contract does not validate real email delivery, Supabase credentials, database migrations or RLS.

## Acceptance required before calling accounts live

Run registration/email confirmation, login, recovery, Passport save, dated plan save/list/calendar/delete, sign out, restart, restore, saved deletion, two-user row isolation, forged/direct DB-write rejection, and password-confirmed account deletion against the actual configured project. These checks remain UNRUN in the local environment until the project URL/credentials/schema are available. Unit tests and local HTTP guards do not establish live Supabase behavior or applied RLS policies.
