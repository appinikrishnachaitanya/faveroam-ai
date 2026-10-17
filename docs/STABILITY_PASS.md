# Discovery and conversation stability pass

The user authorized pushing this pass after regression checks. Deployment acceptance remains separate from local validation.

## Behavior

- Repeating the same pending request retains its returned choices without a second provider/tool lookup. A different message replaces the pending request.
- Returned choices are visible directly in Ask TastePassport.
- The fallback understands dinner, movies and nightlife and retains chicken-biryani specificity. Explicit activity categories are taken from the current message, not invented model concepts.
- One exact specialty-dish taxonomy match applies directly. Ambiguous tastes still require confirmation.
- Dining receives a category-specific initial recovery query, alongside coffee. Coffee profile tastes remain relevance signals unless explicitly requested as refinement requirements; coffee dish tags never become dining requirements.
- Culture is initially included for confirmed movie/TV or cultural-venue interests. Cinema/nightlife requests resolve actual venue categories, never nearby-attraction/theme tags or an unrelated museum substitute.
- Familiarity controls explicitly identify the category being changed. Other chapters remain intact. The results toolbar scrolls normally.
- The assistant header action group has a fixed-width flex allocation, avoiding competition with the title; the onboarding form has restrained surface/shadow polish and explicitly states the five-city scope.

## Qloo usage in code

| Endpoint | Use |
| --- | --- |
| `/search` | Resolve named interests into catalog entities for confirmation. |
| `/v2/tags` | Resolve cuisine, dish, venue and other cultural concepts into returned taxonomy. |
| `/v2/insights/` | Retrieve and rank recommendations using confirmed entity/tag signals, location, supported filters and explainability. Also used for shared-interest discovery. |
| `/entities` | Fetch additional information for a selected real discovery. |
| `/v2/analysis/compare` | Compare two confirmed profiles for the Together feature. |
| `/v2/trending` | Optional trend enrichment; availability and supported history depend on Qloo responses. |
| `/v2/tags/types` | Development diagnostics for available taxonomy; not a consumer discovery step. |

Dynamic tool selection uses native Gemini function calling and supported Qloo harness/MCP workflows. Native API retrieval remains the validated filtered discovery path. Implemented endpoints are not a claim that all optional filters, entity domains or account entitlements have passed live acceptance.

## Evidence and limits

The full regression suite passed 136 tests. A live diagnostic London profile used resolved A.R. Rahman, Specialty Coffee and Indian tags: familiar-mode retrieval returned 20 validated dining cards and 15 coffee cards after diversification. This was a diagnostic reconstruction, not the original user's persisted session or a measured relevance score.

Live taxonomy checks confirmed exact Chicken Biryani specialty-dish and Movie theater/Night club venue categories. Generic cinema search also returned theme/nearby tags, which are deliberately rejected for venue filtering.

Live fallback execution using isolated diagnostic states also completed without pending confirmation: `find chicken biryani` returned 15 validated dining candidates; the movie/party/dinner request updated Eat and Culture with five candidates each. These diagnostic states had no personal taste profile, so this verifies category retrieval and execution rather than personalized ranking. The production build and its TypeScript stage passed.

The activity request retrieves venue candidates by category. It does not schedule an ordered cinema/nightclub/dinner itinerary, verify showtimes or opening hours, establish current event availability, or book tickets/tables. Those are separate capabilities and should not be implied by the UI.
