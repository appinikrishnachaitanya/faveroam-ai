# MVP behavior

Next.js App Router UI lives at `/`. POST `/api/resolve` accepts 3–5 unique queries and returns up to five explicit choices per seed. Every seed requires confirmation, including one-match queries. No match requires editing the seed. Candidate type, returned year/address/short description aid disambiguation.

POST `/api/passport` verifies a signed, expiring resolution receipt before accepting selected IDs. No key appears in the receipt. Destinations are limited to New York City (validated), London, Paris, and Tokyo (exploratory). Places use strict locality filtering; music uses audience location signals and is labeled accordingly.

The existing validated Qloo client, parser, and query builder are reused. New transport logic serializes calls per process, spaces them by 800ms, keeps a maximum of 100 private five-minute cache entries, and retries HTTP 429 twice with exponential backoff and Retry-After (up to 30 seconds). Longer cooldowns fail immediately rather than retry before the deadline. Failed calls are not cached. This is not a distributed quota limiter.

Place sections use returned tag names, conservatively matched in src/passport/model.ts. Cafes precede dining classification. Museum/gallery/theatre/cinema tags become Culture; bookstore/record-store/boutique/yoga tags become Lifestyle. Government/consulate/embassy/hospital/airport metadata is excluded. Unknown place categories and generic landmarks are omitted. This may omit useful venues; it avoids inventing category filters or fabricating recommendations. Empty sections are hidden.

Only two upstream insights calls are made per passport: places and artists. One failed category leaves the other intact. Returned numeric query.affinity is shown raw. Individual seed attribution is not supplied, so cards state that all confirmed signals were submitted and individual attribution is unavailable. The translation strip uses the actual confirmed entities and actual returned discoveries only.

No authentication, database, booking, maps, LLM, or deployment. Data caches and signed receipts expire; no durable passport storage. Public endpoints require external abuse controls before deployment. Browser input is not an API credential. Raw Qloo responses stay server-side; the browser receives only normalized candidate/card metadata.

## Validation

Validated 2026-10-13 with Node 24.19.0 / npm 11.9.0.

- Dependency installation passed using `/tmp/tastepassport-npm-cache`; default npm cache failed because the home cache path was unavailable.
- Initial standalone type check identified upstream Next declaration errors. The Next production build applied standard TypeScript settings (including skipLibCheck), and the subsequent `npm run typecheck` passed. Application strict checking remains enabled.
- `npm test`: nine tests passed. Existing five client tests preserved; four additional tests cover ambiguous candidates, category filtering, normalization, and bounded 429 retries/Retry-After.
- `npm run build`: passed; generated `/`, not-found, and the two dynamic API routes.
- Production startup passed. Home returned HTTP 200 with the expected hero. Invalid resolution input and tampered receipts returned HTTP 400.
- Live Qloo API routes resolved Rahman, Interstellar, and Blue Tokai with five candidate choices each. Explicit artist/movie/cafe-branch choices generated a NYC passport with 38 normalized cards across Eat, Coffee, and Music, with no category failures. This smoke test selected a returned Blue Tokai branch; it did not claim a brand identity. Culture/Lifestyle remain conditional and were not produced by this particular run.
- Chromium desktop hero rendered successfully. Browser clicks resolved three inputs, displayed three confirmation fieldsets, enabled generation only after selection, and generated a real passport. Mobile width 390px had no horizontal overflow; desktop/mobile screenshots were inspected privately outside the repository. Direct screenshot mode timed out; browser DevTools capture succeeded.
- Value-based scan confirmed the supplied key absent from commit-eligible files and `.next/static` browser bundles. `.env.example` has only an empty key and non-secret base URL. Secret files, build outputs, dependencies and raw evidence remain ignored. No request headers or API credentials were logged.
- `git diff --check` passed. Feasibility docs and LICENSE preserved; no deployment, branch rename or commit performed.

Cloud draft save confirmed updated install_script/start_skill and the non-secret base URL requirement. This saves reusable instructions; it does not publish or deploy them. The running production server is available internally on port 3000.

## Phase 3

Evaluate category precision and taste-signal contribution against location-only baselines; discover Qloo tag filters from official APIs, improve candidate ranking without bypassing user confirmation, and add shared quota/abuse controls before deploying. Consider export/share only after response-data licensing and privacy requirements are addressed. Do not add an LLM to hide missing entity or category evidence.
