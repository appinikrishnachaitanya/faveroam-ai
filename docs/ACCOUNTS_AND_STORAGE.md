# Accounts and durable Passports

Accounts are optional. The application remains usable as a guest and never substitutes a fake account, local password store or simulated database for managed authentication. Current live account validation is blocked until a Supabase project is configured.

## What is implemented

- Email/password registration with a 12-character minimum, managed email confirmation, login, password recovery and password update.
- Server-managed HttpOnly, SameSite=Lax cookies; Secure cookies in production.
- Every private data route verifies the user with Supabase `auth.getUser()`; a client-supplied user ID or unverified cookie is never an authorization decision.
- Explicit saving of the latest Passport per supported city (up to five cities), plus list/open/delete actions.
- My Vibe retains explicitly liked Qloo cards after category replanning. Conversation reset preserves likes; New Passport clears the active session. Saved account copies remain until explicitly overwritten or deleted.
- Restoring creates a fresh expiring guest-session token; the old bearer token, chat history, pending tool state and model-only comparison are not stored. Saved evidence is dated and marked as restored; refine a category for fresh results.
- Sign out clears the active screen. Account deletion requires re-authentication with the password and typed DELETE, then removes the managed user and cascades saved-row deletion.

## Configure your project

1. Create or use a Supabase project. In Authentication, enable email/password and email confirmation. Configure the provider's minimum password length to at least 12; app validation alone cannot control direct provider calls.
2. Apply `supabase/migrations/202610160001_saved_passports.sql` through the project's SQL editor or your controlled migration workflow. This creates a table with RLS, unique city/user records, owner-only SELECT/DELETE, and server-role-only INSERT/UPDATE. Do not add browser write policies: preventing direct fabricated evidence writes is intentional.
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

## Acceptance required before calling accounts live

Run registration/email confirmation, login, recovery, save, sign out, restart, restore, saved deletion, two-user row isolation, forged/direct DB-write rejection, and password-confirmed account deletion against the actual configured project. These checks are UNRUN while the project URL/credentials/schema are absent. Unit tests and local HTTP guards do not establish live Supabase behavior or applied RLS policies.
