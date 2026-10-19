> Historical development record. This snapshot may describe superseded behavior. Use the [current documentation index](../README.md) for the submission release.

# Judge regression: protected categories and a usable cinema stop

## Reproduced defects

The exact request was:

> Find quieter Indian restaurants in London, moderate budget, minimum rating 4.5. Keep my music and movies unchanged.

The deterministic parser treated preservation clauses as positive requests: “music” selected Music and “movies” selected physical Culture/cinema. The explicit numerical minimum rating was not parsed. Quietness was treated as optional after unsuccessful taxonomy lookup, and the tool catalogue and model-selection failures shared a misleading model-unavailable status.

## Corrections

- Preservation clauses are removed before activity detection. Protected sections are also excluded at execution time, including confirmation of pending requests from older sessions. Tests simulate unavailable providers and a model explicitly selecting the protected sections.
- Moderate budget maps to a maximum relative price category of 2; minimum rating 4.5 maps to minimum business rating 4.5. Explicitly parsed preferences override conflicting model values.
- Unrequested model tag operators and unresolved model-produced filter IDs cannot weaken or bypass server-controlled concept resolution.
- Quietness uses a contextual taxonomy lookup, selecting an exact returned Quiet ambience match when available. The generic harness lookup for “quiet” returned non-ambience tags in the investigated sample. If a quiet requirement cannot be verified, the update stops or asks for confirmation rather than silently dropping it. This does not guarantee actual crowd/noise conditions at visit time.
- Known quietness lookups no longer require an extra model planning call. Native Gemini interpretation remains; native model-selected MCP workflows remain for unknown concepts/ranking. A tool-catalogue outage no longer incorrectly labels a successfully responding Gemini model as unavailable.
- Selecting a missing planner activity requests real venues. Cinema requires place/cinema taxonomy; film titles do not fill that stop. The lookup preserves dining and existing activity order. An empty stop also has an explicit retry action.
- With known coordinates, subsequent automatic stop choices prefer closer returned options. Straight-line distance is displayed; no travel-time or route guarantee is invented. Saved explicit choices remain stable.
- Card explanations combine specific returned attributes with returned contribution evidence where available instead of presenting contributor names alone.

## Evidence

- 183 regression tests passed, including the exact request under fallback, model failure and model overscoping; old pending confirmation scope; strict quietness failure; independent tool/provider health; activity order; and proximity ordering.
- Production build passed.
- `scripts/verify-judge-journey.ts` completed against live Qloo: the native run was required to remain healthy and update Eat only. In the final sample it returned 12 eligible dining results; forced fallback returned 10. Both retained explicit price/rating and intersection/quiet filters and preserved Music/Movies cards and preferences. Cinema recovery returned 8 actual cinema venues while preserving dinner and order. Counts are sample observations, not accuracy scores or guarantees.
- `scripts/verify-judge-ui.mjs` passed the same journey through the actual production UI and streaming API, with no mocked providers: native chat updated Eat only; complete Music/Movies card data stayed unchanged; the planner fetched cinema choices and retained dinner; desktop/mobile layout contained its content.
- Screenshots and provider logs remain in `/tmp`, not in the repository. Tests emit status/counts and never credentials or full provider responses.

## Limits

The public Railway capability request was blocked by this environment's network proxy (CONNECT HTTP 403). Local production acceptance does not certify the current deployed revision, credentials or runtime. Railway needs to deploy the pushed branch and the exact journey needs external retesting. No database change is required for this correction.

This addresses the confirmed execution and incomplete-stop failures. It does not establish a higher judge score, universal recommendation relevance, live availability, route feasibility, or a measured advantage over an LLM-only baseline.

## Repeat

```sh
npm test
npm run build
node --use-env-proxy --conditions=react-server --import tsx scripts/verify-judge-journey.ts
PASSPORT_TEST_URL=http://127.0.0.1:3034 PASSPORT_CDP_URL=http://127.0.0.1:9233 node scripts/verify-judge-ui.mjs
```

Live checks need securely configured provider credentials; the browser check needs an isolated Chromium CDP instance and a running production server. Do not point the browser script at a browser containing personal sessions.

## Toronto vegetarian refinement (18 October)

Exact acceptance request: “Find cheaper vegetarian Indian food in Toronto and explain why it fits my tastes.”

- The live tag lookup returns several Vegetarian homonyms: dietary attribute, cuisine, dietary option, and target audience. A dining requirement now selects the unique exact **returned dietary-option** match. It does not ask the user to interpret taxonomy or pick the first homonym.
- The dining query requires restaurant, existing Indian cuisine, and vegetarian options together, plus the lower price cap. A previous union preference cannot make the dietary requirement optional. Missing dietary-option evidence stops the refinement and preserves results.
- Native Gemini and forced deterministic fallback completed with no pending confirmation and returned 18 and 16 eligible dining results respectively. Music and Movies were byte-for-byte preserved. Counts vary with live data.
- User-facing summaries, card evidence, connection badges and taste themes use a shared descriptive-tag allowlist with case-insensitive label deduplication. Narrative keywords and audience labels are kept out of this copy. Matching returned cuisine/dietary tags take priority over repeating cultural seed names; no causal restaurant story is invented.
- Vegetarian options do not certify an entirely vegetarian kitchen or allergen safety. Users are prompted to confirm the menu with the venue.
- A one-stop planner explicitly explains how to add cinema or coffee. Actual venues are fetched through the existing flow while retaining dinner; hours, travel time and availability still require checking.

Reproduce live backend acceptance:

```sh
node --use-env-proxy --conditions=react-server --import tsx scripts/verify-vegetarian-journey.ts
```

Reproduce browser acceptance with a running production server and isolated Chromium CDP profile:

```sh
PASSPORT_JUDGE_SCENARIO=vegetarian PASSPORT_TEST_URL=http://127.0.0.1:3036 PASSPORT_CDP_URL=http://127.0.0.1:9233 node scripts/verify-judge-ui.mjs
```

Credentials are inherited securely from the environment; acceptance output contains counts and statuses only. Local production acceptance is separate from verifying the Railway deployment after push.
