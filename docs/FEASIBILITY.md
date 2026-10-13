# TastePassport Phase 1 feasibility

## Recommendation

**GO WITH CHANGES**. Live Qloo search and insights successfully support taste entities → NYC-filtered places and cross-domain recommendations. The results are sufficient to proceed with a focused prototype, but category filtering, seed disambiguation, and recommendation-quality evaluation are required before promising a broad cultural onboarding experience.

Validated on 2026-10-13 after publishing the secret binding for `hackathon.api.qloo.com`. Earlier HTTP 401 failures were environment/credential-destination issues, not Qloo capability failures. The key was neither changed nor printed nor saved.

## What worked

- Authenticated `GET /search` returned real entities. Search uses `types` arrays; the client was corrected using observed responses. Insights use `type`/`subtype`.
- Two primary seeds resolved unambiguously: A.R. Rahman as artist, and Interstellar as the 2014 movie. Real IDs, full metadata, queries, and responses remain in private ignored evidence, not copied as raw response fixtures into the repository.
- Seven insight requests returned five entities each: 35 returned entries, **not 35 unique discoveries**. Six distinct experiments ran; the all-resolved query duplicated the combined-primary query because only the two primary seeds resolved.
- Three meaningful place combinations succeeded: artist-only → places, movie-only → places, and artist+movie → places. Different inputs yielded different ranked sets; the place query contained entity UUID signals rather than input-name keywords.
- Combined tastes also yielded artist, book, and brand recommendations with NYC audience location signals.
- All 20 place entries from four requests reported New York city metadata and NYC addresses. The API resolved the filter to New York, New York, United States in `query.localities.filter`. `filter.location.radius=0` was sent for strict locality filtering. This is API metadata confirmation, not an independent polygon-containment audit.
- Actual insight relevance appears at `entity.query.affinity`; the client now prints that numeric value only when returned. Observed scores were 0–1. Affinity represents relative recommendation strength, not satisfaction probability or causal explanation.

## What failed

- Blue Tokai searched as a brand returned named cafe branches of type place; no exact brand seed was accepted. A branch-specific choice could be tested later without misrepresenting it as the brand.
- Biryani returned restaurant names, not an exact food/cuisine entity. Generic food preferences need discovered tags or a user-confirmed representative restaurant.
- The Strand returned multiple exact place-name matches; no bookstore was selected blindly.
- The Hitchhiker's Guide to the Galaxy returned movie/game/album candidates among the five results, not the intended book. This does not establish that the book is absent from Qloo; targeted category search remains untested.
- Initial live execution rejected real seeds because the parser expected subtype rather than search `types`. Fixed, then rerun successfully.
- Unfiltered places included a consulate. Combined taste results were broad tourist landmarks, so mixed-input relevance is not uniformly strong.

## Best working query

**A.R. Rahman → NYC places** is the strongest cultural-transfer example. Artist affinity produced Indian dining options rather than musician-name keyword matches. Several outputs fit a plausible food discovery use case, while a consulate demonstrates the need for category refinement.

Request: `GET https://hackathon.api.qloo.com/v2/insights/` with `filter.type=urn:entity:place`, `signal.interests.entities=<resolved artist UUID>`, `filter.location.query=New York City`, `filter.location.radius=0`, `take=5`. Authentication uses the environment-backed API key header. Actual IDs and ranked responses are retained privately in `.spike-output/latest.json`.

Experiment review: movie-to-place output favored recognizable NYC landmarks; combined-to-artist output aligned with cinematic/composer interests; book and brand outputs were broader lifestyle associations. These are genuine cross-domain API responses, but usefulness is an engineering judgment from this small sample, not a validated user-study outcome. No location-only baseline was run, so the independent contribution of each signal is not quantified.

## API endpoints used

- `GET https://hackathon.api.qloo.com/search`: `query`, `take=5`; conservative exact normalized name/type matching, plus release year 2014 for Interstellar.
- `GET https://hackathon.api.qloo.com/v2/insights/`: `filter.type` of place, artist, book, or brand; `signal.interests.entities`; `take=5`.
- Physical place constraints: `filter.location.query=New York City`, `filter.location.radius=0`.
- Artist/book/brand context: `signal.location.query=New York City`. These are audience relevance signals, **not physical location guarantees**. The location signal's independent effect was not measured.
- Header: `X-Api-Key` populated only from `process.env.QLOO_API_KEY`. Node uses `--use-env-proxy` to access the supplied cloud HTTPS proxy.

Official sources and initial generic-OpenAPI-schema limitation are recorded in [QLOO_API.md](QLOO_API.md). Live responses now confirm search `results` arrays, search `types`, insights `results.entities`, insight `query.affinity`, and locality metadata at `query.localities.filter`.

## Product implications

Proceed with a small server-side prototype centered on named taste seeds and category-refined NYC places. Offer users a choice of matched entities when ambiguous. Discover supported dining/cultural tags through documented APIs rather than inventing tag IDs. Keep music/book suggestions separate from local places. Evaluate single and mixed seeds against a location-only baseline before optimizing ranking or claiming personalization quality.

## Product limitations

Do not promise arbitrary free-text taste resolution, verified local concerts/events, real-time availability, bookstore recommendations from generic literature interests, universal cuisine entities, adaptive rejection replanning, or an LLM agent. None were proven here. Affinity is not probability; recommendations do not establish why a particular user will enjoy a place. One city and two primary seeds do not establish broad geographic or demographic reliability. Hackathon keys are specific to the hackathon host and subject to quota/expiry.

## Commands and checks

- Published configuration metadata: existing QLOO_API_KEY binding permits hackathon.api.qloo.com.
- Initial `npm run spike`: authenticated search succeeded; local type mismatch prevented seed selection (exit 1).
- After parser correction, `npm run typecheck`: passed.
- After parser correction, `npm run spike`: passed (exit 0); seven nonempty insight queries, five entities each.
- After adding actual affinity display, `npm run typecheck`: passed.
- `node --test --test-name-pattern='live-observed|unexpected envelopes|physical locality' tests/client.test.ts`: three selected tests passed. Credential-mutating tests were not run with the supplied key.
- Final live rerun, key-content scan, and whitespace validation: see completion record below.

Private evidence is ignored in `.spike-output/latest.json`; inspect its timestamp for the current run. Raw Qloo responses must remain private under the hackathon guide. No response fixtures were committed. LICENSE and branch are preserved; no full application or deployment was started.

## Completion record

The final rerun after affinity-display changes hit **HTTP 429** during seed search and stopped correctly (exit 1); no further requests were sent. It did not overwrite the successful run's evidence. The evaluated successful evidence is timestamped `2026-10-13T17:51:19.348Z`. Thus the complete live workflow passed before the display-only change; the post-change full rerun was rate-limited. Affinity display is based on the real stored response fields, and the selected parser tests/type check passed. Rate limiting is a production consideration: add request pacing and bounded Retry-After-aware retries in the next implementation. Do not interpret the interrupted rerun as absent recommendations.

`git diff --check` passed. A value-based security scan passed across tracked/commit-eligible files, private evidence, and the captured terminal report: the supplied key is absent. `.env.example` remains an empty assignment and private secret/evidence paths remain ignored. No credential value was modified, printed, logged, or saved.
