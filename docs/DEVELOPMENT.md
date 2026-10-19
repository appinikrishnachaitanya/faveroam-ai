# Development and verification

## Setup

Use Node.js 24+ and npm in the existing checkout. Run `npm ci` from the lockfile, configure ignored `.env.local` from `.env.example`, then `npm run dev -- --port 3000`. Do not create an additional worktree for normal setup.

The development server reads Next.js environment files. Direct TypeScript probes below explicitly load ignored `.env` / `.env.local` when needed. Do not place credentials in commands, logs or `NEXT_PUBLIC_` variables. The app's start/dev scripts enable Node environment-proxy support.

Guest discovery requires Qloo; native conversation uses Gemini through Vertex AI Express Mode. Set a Vertex Express Mode key securely in `GEMINI_API_KEY` (or `GOOGLE_API_KEY`, which takes precedence) and choose the model with `GEMINI_MODEL`. No project, location or `AGENT_MODEL_BASE_URL` is needed. Allow `aiplatform.googleapis.com` both in network access and in the key’s secret-forwarding destinations when using a managed proxy. Supabase is optional for guest use and required for account persistence. See [schema setup](../supabase/README.md).

## Required checks

```sh
npm run check:docs
npm test
npm run typecheck
npm run build
npm run smoke:production
```

TypeScript strict mode includes unused-local and unused-parameter checks. `check:docs` checks local Markdown file targets without making network requests. CI installs from the lockfile and runs the suite, build, type check and production smoke without provider credentials. Smoke starts an isolated production service and checks health, rendered home and custom 404; it does not call Qloo/Gemini.

Do not run two builds against the same `.next` directory concurrently. Start a fresh production process after a changed build when testing HTTP behavior.

## Opt-in provider checks

Live probes consume provider quota and can return empty results, partial acceptance, authentication errors or rate limits. They are separate from CI and must use secure credentials.

| Command / script | Purpose |
|---|---|
| `npm run verify:gemini` | Native model → selected MCP tool → returned result, plus real baseline |
| `npm run verify:qloo` | Endpoint/normalization acceptance; exit 2 distinguishes historical enrichment limitations |
| `npm run verify:relevance` | Controlled film/artist/cuisine profiles, contribution audit and actual Together route |
| `npm run verify:accuracy` | Discovery modes, scoped filters and refinement acceptance |
| `scripts/verify-style-preservation.ts` | Real Qloo requirements across Familiar/Balanced/Explore |
| `scripts/verify-conversation-context.ts` | Native reference resolution across turns |
| `scripts/verify-conversation-journey.ts` | Refinement, cheaper follow-up and read-only answers; explicit `PASSPORT_FORCE_GUIDED=1` verifies guided mode separately |
| `scripts/verify-judge-journey.ts` | Preserved Music/Movies, constrained dining and cinema recovery |
| `scripts/verify-vegetarian-journey.ts` | Dietary homonym resolution, cuisine intersection and budget |
| `scripts/verify-destinations.ts` | Destination behavior |
| `scripts/evaluate-discovery.ts` | Opt-in aggregate profile comparison, not a certified relevance benchmark |
| `npm run spike` | Historical feasibility diagnostic; not the consumer app or submission demo |

For direct TypeScript probes use:

```sh
node --use-env-proxy --env-file-if-exists=.env --env-file-if-exists=.env.local --conditions=react-server --import tsx scripts/verify-conversation-context.ts
```

The feasibility spike loads `.env` if present. All direct probes inherit securely injected environment values.

## Browser checks

Browser scripts require a running app and a separate Chromium CDP profile. Read each script's configured app/CDP ports before running it. Do not drive an unrelated browser tab or user session.

- `scripts/verify-judge-ui.mjs` exercises a real backend/providers. `PASSPORT_JUDGE_SCENARIO=conversation` covers consecutive questions/refinement; `vegetarian` covers the Toronto request.
- `scripts/verify-progressive-ui.mjs` and `verify-discovery-journey.mjs` cover guest discovery flows.
- `scripts/verify-account-ui.mjs` explicitly mocks account responses. It is a UI contract, not proof of real Supabase or email delivery.
- `scripts/verify-profile-api.mjs` covers the profile API; configure its required account/session prerequisites before using it.

Example for an already running isolated app and browser:

```sh
PASSPORT_TEST_URL=http://127.0.0.1:3038 PASSPORT_CDP_URL=http://127.0.0.1:9233 PASSPORT_JUDGE_SCENARIO=conversation node scripts/verify-judge-ui.mjs
```

No browser script should be reported as successful unless its actual runner completed. Provider outage, mocked response, native success and guided success are distinct outcomes.

## Code ownership and change standards

- Keep UI in `app/components`, styles in their responsibility-specific files, orchestration in `src/agent` and Qloo transport/validation in `src/qloo`.
- Use typed partial preference updates. Preserve explicit diet, cuisine, numeric requirements and unaffected categories across turns and mode changes.
- Validate IDs and fields at route and provider boundaries; never accept generated catalogue entities as results.
- Keep errors useful and logs metadata-only. Do not add response dumps or credential-bearing fixtures.
- Keep regression tests that exercise behavior; remove tests for retired components alongside the retired code, not to hide a failure.
- Do not delete a file just because it is not imported: Next.js routes, CLI probes, SQL migrations, assets and configuration can be entry points.
- Avoid dependency/toolchain changes during submission freeze unless necessary to resolve a verified issue.
- Document observed limits and keep one current specification. Historical investigations belong in `docs/archive`.

## Repository hygiene

`.next`, `node_modules`, TypeScript caches, private evidence, screenshots and test artifacts are generated/ignored. They are not dead source folders. Removing dependencies or build output is not a product cleanup and can disrupt a running service.

Keep `package-lock.json`, migration history, the manual reset script and licensing records. Do not run the destructive Supabase reset as part of CI/deployment. Legacy local API routes remain supported compatibility boundaries unless separately retired.
