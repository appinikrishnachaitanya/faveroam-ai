# Railway hackathon deployment

Railway is the user's selected host. Deploy the full Next.js app as one Node service; no separate database is required for guest mode.

## Service setup

1. Connect `appinikrishnachaitanya/tastepassport-ai`, branch **feat/discover-first-workspace-polish**, repository root `/`. This is the branch currently selected for the live app; verify the branch setting in Railway before redeploying.
2. Confirm Railway detects `railway.toml`: Railpack builder, build `npm run build`, start `npm start`, health check `/api/health`, one replica and bounded failure restarts. `.node-version` selects Node 24. Confirm the actual build log reports Node 24; if necessary explicitly set `RAILPACK_NODE_VERSION=24.19.0`. Keep the lockfile install and build-time dev dependencies needed by Next/TypeScript/Tailwind.
3. Securely add `QLOO_API_KEY`, `QLOO_API_BASE_URL=https://hackathon.api.qloo.com`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.1-flash-lite`, `NODE_ENV=production`, `NEXT_TELEMETRY_DISABLED=1`, and optionally `AGENT_DEBUG=1`. Verify the configured model is available to your key. Never use `NEXT_PUBLIC_` for API keys or paste keys into chat.
4. Let Railway supply `PORT`. The existing start command binds `0.0.0.0` and respects that port. No custom port or startup wrapper is needed.
5. If using accounts, run the [one-time Supabase setup](../supabase/setup.sql) **before the new build serves account requests**. It deletes saved app data while preserving Auth accounts and destinations. Deploy, then generate an HTTPS public domain under service networking using the detected app port. Set `APP_ORIGIN` to that exact public origin, without a trailing slash, then redeploy if needed. Supabase can remain unset for guest mode.

The official Qloo harness must stay installed at `node_modules/@qloo/qloo-harness/dist/bin.js`; it launches Node child processes and uses writable `/tmp`. Local acceptance does not establish that child processes or provider access succeeded on Railway: check the actual hosted flow.

## CI and deployment controls

GitHub CI runs quota-free checks on its configured branches. Confirm the workflow covers the deployed branch and wait for its actual run before calling a deployment verified. If Railway offers **Wait for CI**, enable it; otherwise deploy checked commits manually. `railway.toml` does not configure GitHub CI gating, branch protection, public domains or credentials.

## Hosted acceptance

Check `/api/health` returns HTTP 200 with `{"status":"ok"}`. From Node 24:

```sh
PASSPORT_SMOKE_URL=https://<your-railway-domain> npm run smoke:production
```

PowerShell:

```powershell
$env:PASSPORT_SMOKE_URL = 'https://<your-railway-domain>'
npm run smoke:production
```

Smoke checks verify the app, health no-store response and custom 404 without calling paid providers. Then use the public app: resolve/confirm tastes, build actual Qloo discoveries, inspect evidence, refine, like/reject, edit/download the weekend and check mobile. Test the concierge and verify real function selection, Qloo/MCP invocation and returned-result log events. Provider health is time-dependent; verify a fresh native call rather than relying on historical acceptance. Guided fallback works independently.

## Demo operations and cost

Keep **one replica** unless you have verified the shared active-session table and request behavior across replicas. With Supabase configured, trusted active sessions persist in `active_passport_sessions`; transient caches remain process-local. Without Supabase, active guest sessions are process-local and lost on restart. Do not deploy during judging.

Confirm current plan/trial eligibility and usage charges in Railway before subscribing. Included usage credits offset usage; they do not make a paid subscription free. Set available billing alerts/limits and observe actual memory/CPU during rehearsal. Local tests do not prove cloud resource capacity.

Use deployment history to return to a known-good commit if necessary, and verify the rollback flow. Keep the service available through the full judging period. Afterwards disable deployments/delete the demo service and revoke unused demo credentials. Qloo's guide says hackathon keys deactivate after judging closes.

Committing this configuration does not create a Railway service, enter keys, select a paid plan or publish a public URL. Follow [account setup](ACCOUNTS_AND_STORAGE.md) only if you want live accounts.
