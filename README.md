# TastePassport AI MVP

A Next.js, TypeScript, Tailwind App Router product built on the validated Qloo spike. Enter 3–5 tastes, confirm each actual Qloo match, then generate a destination passport. No database, authentication, LLM, or deployment.

## Development

Node.js 24.19.0 / npm 11.9.0.

```sh
npm install --cache /tmp/tastepassport-npm-cache
npm run dev
```

Configure server-only `QLOO_API_KEY` securely in environment settings and `QLOO_API_BASE_URL=https://hackathon.api.qloo.com`. For local development, copy `.env.example` to ignored `.env`. Never prefix these variables with NEXT_PUBLIC_, commit secrets, or publish raw Qloo responses. In cloud settings the secret destination must permit hackathon.api.qloo.com. Startup enables Node HTTPS proxy support.

```sh
npm run typecheck
npm test
npm run build
npm start
```

The home page contains setup, explicit match confirmation, and the resulting passport. Available result sections depend on actual returned metadata; no placeholder recommendations. NYC is validated; London, Paris and Tokyo are exploratory. Music recommendations are audience-context suggestions, not local events. See [MVP behavior](docs/MVP.md) for filtering, retries, caching, and limitations.

## Preserved feasibility spike


Tests taste entity resolution, cross-domain recommendations, and New York City place filtering. No UI, database, authentication, LLM, or deployment.

## Run

Validated tooling: Node.js 24.19.0, npm 11.9.0. Node 24 runs the TypeScript directly; the spike enables `--use-env-proxy` for cloud HTTPS routing; development dependencies only provide type checking.

```sh
npm ci
npm run typecheck
npm test
```

Configure `QLOO_API_KEY` securely in cloud environment settings. For local development, copy `.env.example` to the ignored `.env` and enter the key there. The application reads only `process.env.QLOO_API_KEY`; Node's `--env-file-if-exists` loads local configuration. Never share, log, commit, or put the key in browser code. HTTPS access to `hackathon.api.qloo.com` is required.

```sh
npm run spike
```

The terminal prints resolved names, IDs, types, metadata, requests, real discoveries, and failures. `.spike-output/latest.json` stores ignored, key-redacted live evidence after completed experiments. No mocks replace live results. A missing key fails with exit status 1 before any requests. Authentication and rate-limit failures stop the run; other experiment failures are reported individually. Empty and insufficient results fail the overall run. The file is overwritten only on a completed run; check its timestamp before using it as evidence.

Resolution is deliberately conservative: accept one exact normalized name/type match among five candidates; Interstellar must have release year 2014. Ambiguity, missing metadata, and aliases remain unresolved for manual review. Biryani is attempted as an entity, not treated as an invented cuisine tag. No seed substitutions occur. Additional catalog/tag investigation may be needed.

Physical results use `filter.location.query=New York City` and `filter.location.radius=0`. Music, book, and brand experiments use `signal.location.query`, which reflects audience taste, **not** local venue availability. Places can cover dining, shops, and cultural venues; categories are not guaranteed. Live-validated affinity at `query.affinity` is shown raw only if present, without rescaling. Search `types` arrays are supported. API documentation describes affinity as recommendation strength, not satisfaction probability; its pages disagree on scale.

See [API choices](docs/QLOO_API.md) and [feasibility status](docs/FEASIBILITY.md). Passing unit tests validates local error handling, not Qloo behavior. After running with a key, review locality metadata, actual addresses, category coverage, and relevance before updating the feasibility verdict.
