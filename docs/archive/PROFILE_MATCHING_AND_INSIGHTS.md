> Historical development record. This snapshot may describe superseded behavior. Use the [current documentation index](../README.md) for the submission release.

# Named profiles, matching and insights

## Customer flow

The taste library sits above onboarding and Passport content when signed in. Save the current confirmed tastes under a name; saving an existing name updates that profile. Choosing a saved profile fills the interest chips and restores discovery style, constraints and starting categories. Choose a city and use saved tastes to retrieve fresh results without re-entering or re-resolving the confirmed interests. The city-specific results, chat and addresses are not part of a reusable profile.

Together keeps three confirmed selections compact, allows individual correction, and displays up to six shared discoveries. Candidate lists remain available when the lookup is ambiguous. Shared taste is not a relationship compatibility score.

My Vibe preserves specific liked discoveries. Changing style refreshes Discover and switches to those results rather than silently showing the old saved cards.

## Matching algorithm

1. Route named artists, movies, businesses and other cultural entities to Qloo entity search; resolve food and other concepts through Qloo tags.
2. Normalize Unicode, punctuation and case. Rank returned candidates by exact title, a specifically supplied trailing release year, and token overlap. Preserve provider order for ties. Title years such as “1984” and “2001: A Space Odyssey” remain part of the title.
3. Suggest only a unique exact entity match, optionally restricted by the requested release year. Ambiguous remakes, shared names/types, concepts with competing taxonomy matches and fuzzy matches remain reviewable. Lexical ranking is not a cultural affinity score.
4. Use confirmed IDs/tags as Qloo cultural signals and map requested activities to the appropriate result types. Apply city, activity, price, exclusions and other explicit requirements before accepting results. Missing values fail explicit numerical requirements rather than being presented as compliant.
5. Feels like home keeps the direct taste query with content-based bias 0.8 by default. Explore uses bias 0.3 and can soften profile taste tags; explicit refinement concepts and constraints remain. Balanced runs both and interleaves/deduplicates their results. An explicit content-based weight overrides these defaults. Identical resulting queries are disclosed. The ranking bias changes a query, not a guaranteed percentage of new results.
6. Retain Qloo result evidence, returned ranking/affinity and provenance. Existing shortlist selection highlights returned taste affinity, an actually known price comparison and an available broader-pool option, favoring distinct businesses. Repeated coffee branches are capped. No invented cultural explanation or universal match percentage is added.

On cards, concrete returned tags and positive contributor evidence take priority. Price is shown as the returned relative category out of four, not a currency estimate or an unsupported “budget friendly” promise. Detailed evidence remains on each card; duplicate global “Why these suggestions?” prompts have been replaced by insight navigation.

## Find the Qloo features

Open **Taste insights** in the Passport navigation:

- Taste connections: real returned cultural tag associations.
- Heatmap: returned geographic audience affinity points, with nearby dining exploration.
- Demographics: optional aggregate audience affinity, not personal demographic inference or percentages.
- Trend analysis: select a returned artist/place and load historical data on demand. Empty or unavailable history is reported honestly; it never removes recommendations. **Preferences & Together → Trending for you** separately uses trend ranking, which does not guarantee historical series availability.

## Export API

`GET /api/account/preferences/export` downloads all the signed-in user's saved profiles.

`GET /api/account/preferences/export?id=<profile-uuid>` downloads one owned profile; another user's profile returns 404. The route verifies the authenticated Supabase user and applies an explicit owner filter in addition to RLS. Responses use private/no-store headers and an attachment filename. No credentials, account identity, chat, city results or session tokens are exported.

```json
{
  "schema": "tastepassport.profile-export",
  "version": 1,
  "profiles": [{
    "schema": "tastepassport.profile",
    "version": 1,
    "name": "My weekend tastes",
    "updatedAt": "2026-10-18T00:00:00Z",
    "preferences": {"version": 1, "selected": []}
  }]
}
```

The example abbreviates the preferences object. Current authentication uses the app's secure login session. This is an export contract for future integrations, not public cross-origin access or a new API-key/OAuth integration.

## Database

Existing installations: apply `202610180004_named_taste_profiles.sql`. New installations: use the updated single fresh reset script. RLS ownership and server-only writes remain. Supabase email uniqueness remains authoritative; explicit duplicate-email responses and obfuscated no-identity signup results now direct the user to sign in or recover their password instead of falsely claiming a new verification email was sent.

## Verification

- 173 regression tests passed, including profile export privacy, name validation, duplicate registration, title/year matching (including titles containing years), and mode parameters retaining explicit requirements.
- Production build and smoke passed.
- Real app HTTP routes against an isolated synthetic Supabase server passed authenticated export, cross-owner 404, malformed identifier rejection, attachment/no-store headers, private-field exclusion, named listing, and duplicate-account handling. This does not establish live Supabase persistence or migration acceptance.
- Mocked Chromium flows passed named profile save, visible save state, reset/selection, auto-filled interests, reuse in another city, export link, compact Together, heatmap, demographics, trend-history rendering, registration/recovery, planner and responsive containment.
- Live Qloo accuracy checks passed initial activities, explicit dishes, budget caps, cinema/nightlife ordering and independent coffee, plus all three styles for the previously reported London tastes. In that sample the familiar dining preview had one eligible choice; Balanced offered three, with one choice shared. This demonstrates that sample difference, not universal separation or relevance accuracy.
- Live Supabase remains unverified because its credentials are absent in this workspace. Apply the named-profile migration (or the updated fresh schema) before using the profile features on a connected installation.

Repeat the API contract using `node --import tsx scripts/verify-profile-api.mjs` after a production build. It uses synthetic local credentials and cleans up its app/mock-server processes. Live Qloo checks use `npm run verify:accuracy` with securely configured credentials; they log metadata and counts, not keys or full payloads.
