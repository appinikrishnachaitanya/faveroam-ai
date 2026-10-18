# Results reliability follow-up

## Reproduced problems

- `Indian Savouries` was classified as a named entity search. Live Qloo search offered unrelated named places including Indian Museum. Food descriptions such as Indian Savouries now use Qloo tag resolution; named businesses such as Indian Coffee House remain entity lookups. The exact concept still needs confirmation.
- The browser generated a familiar Passport first, then serially refined every returned category for Balanced/Explore before rendering anything. These extra requests could keep successful results behind the loading screen. Discovery style now travels in the initial request, is validated server-side, and runs through the existing parallel category search under its shared deadline. The resulting session retains that style.
- Initial categories with only one or two matches did not disclose sparse coverage. They now include a specific notice; exact requirements are not silently dropped.
- Category-taxonomy lookup now receives the existing cancellation/deadline signal. Category failures log safe HTTP status metadata where available, without error bodies or credentials.

## Verification

- 167 regression tests passed, including food-concept discrimination and initial Balanced queries/evidence.
- Production build and mocked browser regression checks passed.
- The actual production HTTP `/api/agent/resolve` → `/api/passport` flow passed for the reported profile in Balanced mode, retaining Balanced in session state and returning Music 20, Coffee 15, Eat 16 in that separate sample.
- Expanded live `npm run verify:accuracy` passed the reported London profile in all three styles, plus the earlier dining/film, chicken-biryani, budget, multi-activity, and independent-coffee checks.
- With A.R. Rahman + Specialty Coffee + Indian Savouries, Familiar returned Music 20, Coffee 15, Eat 1. Balanced and Explore returned Music 20, Coffee 15, Eat 15 in the tested sample. Broader dining results are labeled through existing broader-pool evidence, not claimed as exact savouries matches. Some requests reused the query cache; these are not cold-start latency benchmarks.

Counts demonstrate this sample flow, not a general relevance percentage or universal city coverage. No recommendation or venue was fabricated to fill a category.

## Deployment limit

The Railway public origin could not be checked from this environment: its proxy rejected the connection with HTTP 403. This does not establish an application failure or success there. These fixes are local until pushed and deployed; the database-backed destination changes also need their pending migration when Supabase is configured.
