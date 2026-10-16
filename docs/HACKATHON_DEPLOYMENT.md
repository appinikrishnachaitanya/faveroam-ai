# Hackathon deployment: Render Free

Chosen for temporary guest-mode hosting with minimal architecture changes. Confirm free-plan eligibility and limits in your Render account. No service has been provisioned here. Supabase is optional for guest discovery. Vercel would need shared active-session storage and verification of the Qloo harness runtime; those changes are outside this deployment pass.

## Free hosting tradeoffs

Render Free can sleep after inactivity and take time to wake. Active guest Passports live in process memory and are lost on sleep, restart or deployment. Start a fresh Passport after waking the app. They also expire after inactivity and are bounded to 100 entries; that is not a concurrency capacity guarantee. Supabase saved snapshots are separate and require configuration.

Open and rehearse the app before presenting. Do not use synthetic keep-alive services to evade free-plan sleeping. If judging requires guaranteed instant access at arbitrary times, choose an appropriate hosting plan before submission. Do not deploy during the presentation.

## Create the service

1. In Render, create a Blueprint from `appinikrishnachaitanya/tastepassport-ai`, branch **work**. Inspect `render.yaml` and confirm it shows one **Free** Node web service before creating it. Do not create a Postgres service. The latest work is on `work`; this pass does not update `master`.
2. Supply `QLOO_API_KEY` and `GEMINI_API_KEY` securely in Render. Never commit values, use build arguments or prefix keys with `NEXT_PUBLIC_`. The template uses `gemini-3.1-flash-lite`; verify model availability for your key. Guided controls work if Gemini is unavailable.
3. Confirm Node **24.19.0**, build command `npm ci && npm run build`, start command `npm start`, health path `/api/health`. Next binds `0.0.0.0` and respects Render's supplied `PORT`; do not hardcode it. Keep the official Qloo harness installed: it launches child processes from node_modules and writes to `/tmp`.
4. Deploy and obtain Render's public HTTPS URL. Set `APP_ORIGIN` to exactly that origin, without a trailing slash, then redeploy if necessary. Supabase variables can remain unset for guest mode; account saving/login will explicitly be unavailable. For accounts follow [account setup](ACCOUNTS_AND_STORAGE.md).
5. Inspect build/runtime logs and run the public acceptance checks below before sharing the URL.

The Blueprint sets production mode, disabled Next telemetry, the hackathon Qloo host and `AGENT_DEBUG=1`. Debug logs contain allowlisted metadata, not raw messages, headers or credentials. Set `AGENT_DEBUG=0` when no longer needed.

## CI and release workflow

GitHub Actions runs on pushes to `work`/`master`, PRs to `master` and manual dispatch. It installs the lockfile, runs tests, builds, checks types and starts the production app on port 4100 for a quota-free smoke check. No provider secrets are required in GitHub Actions.

Initial auto-deploy is **disabled** in `render.yaml`. After GitHub CI is green, use Render's manual deployment control for the checked commit. If the dashboard supports **After CI Checks Pass**, you may enable that after setup; otherwise keep deployment manual. A workflow file does not itself enable hosting, CI gating or GitHub branch protection. Actual GitHub execution remains external until the workflow runs.

## Public acceptance

From Node 24, use your actual origin:

```sh
PASSPORT_SMOKE_URL=https://<your-service>.onrender.com npm run smoke:production
```

PowerShell:

```powershell
$env:PASSPORT_SMOKE_URL = 'https://<your-service>.onrender.com'
npm run smoke:production
```

Without a URL, the script starts the locally built server itself. It checks health JSON/no-store, rendered home and a 404, then shuts down its process. It does not spend provider quota. `/api/health` returns no configuration or provider data. Provider outages do not make it unhealthy and cause restart loops.

Use the public app to resolve and confirm tastes, build a Passport, inspect Qloo evidence, refine one category, like/reject a discovery, edit/download the weekend and test mobile. Exercise the concierge and check real native function selection, Qloo/MCP invocation and returned-result events in safe logs. Confirm the harness child process actually runs on Render. Recent Gemini requests returned HTTP 503; full model/MCP/baseline acceptance is not established for the hosted app until it succeeds. Guided fallback remains available.

Test a deliberate restart before judging: old guest sessions should show the existing expiry/rebuild recovery, while new Passports should work. Cloud memory/CPU suitability must be measured on the actual service; a local smoke test does not prove free-instance capacity. If memory is insufficient, report it and reassess the host/plan rather than promising free hosting will work.

## Rollback and teardown

Use Render deployment history/manual deploy to return to a known-good commit, and verify that procedure before relying on it. Rollback also resets guest sessions. Keep the app available throughout the full judging period, not only submission day. Confirm current quotas and policies in the hosting dashboard instead of relying on third-party pricing tables.

After judging, disable deployments and remove the demo service as appropriate. Revoke unused demo credentials and check for separately billable services. Qloo's guide says hackathon keys deactivate after judging closes.

This preparation does not create an account, select a paid plan, enter secrets, publish a public URL or configure GitHub branch protection.
