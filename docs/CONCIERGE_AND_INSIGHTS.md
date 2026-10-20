# Concierge and Insights product decisions

## The customer outcome

Help someone choose what to try in a new city using tastes they already know. A large result count, affinity number or coordinate is not the outcome. Start with a small set of choices, explain available evidence, and let the customer refine or act.

### Conversation

- Tool declarations expose the exact server-authorized taxonomy queries as an enum. Gemini sees the same permitted values that the execution guard enforces; a synonym cannot bypass that guard.
- Native Gemini function calling remains the interpretation/tool-selection path for cultural discovery. The shared application state, bounded tool orchestration, Qloo retrieval and guided recovery remain intact.
- An incomplete message such as `yi` cannot change category context. Explicit category nouns in `list restaurants` take precedence over the earlier conversation. Bounded correction handles common category spelling mistakes without rewriting cultural entity names.
- Listing or comparing existing results is a read-only application operation. It requires neither a model call nor another Qloo call. Requests with new constraints still enter refinement.
- A three-choice request takes one current result per active category before repeating a category. This is a diverse starting shortlist, **not** an estimated optimal ranking across incomparable entity types.
- Chat renders returned names, known ratings/addresses, evidence-based reasons and save/explore actions. Refinement replies include the existing decision summary plus up to three returned choices. Ordinal references use the presented card IDs; missing choices trigger recovery rather than silently pointing to another card.
- The approved model context remains a whitelisted last-eight-message cultural conversation and Passport preferences. UI presentation IDs are not extra model context; account details and secrets are excluded.

### Matching and controls

Onboarding proposes a unique returned exact name, an explicit cuisine match, a unique containing name or a conservative single-edit spelling match for **review**. Conflicting exact names remain unselected. Users still confirm the final choices. Lexical matching resolves identity; it is not a cultural relevance score and does not change the existing Qloo ranking/fusion algorithm.

Familiarity controls show only current/requested, visible output categories. Each mode acts on its labelled category. Advanced preferences use the same active-category source. They no longer expose unrelated catalogue categories as if these were already in the Passport.

Preferences resubmit one chosen Discover category with the existing tastes and explicit constraints. For you uses the default category search. Trending adds Qloo trend bias, Hidden gems adds quality bias and an upper popularity filter, and Safe bets adds quality bias plus a listed business-rating minimum of 4 for places. Surprise me selects the broader Explore pool. These are search and ranking instructions, **not** measured user satisfaction, accuracy scores or availability guarantees. The legacy `bias.content_based` parameter is also sent for Surprise; its effect needs live confirmation against the current API reference before making a stronger product claim.

Together starts with one named interest for the other person; two more are optional. The app resolves each name to a returned entity for customer confirmation. It submits your named interests and theirs to the Qloo Compare endpoint, uses returned shared tags to search one selected category in the destination, and keeps your Passport unchanged. A result badge distinguishes a shared tag actually present on its returned listing, a result from the shared-interest search, and a broader local fallback. These are evidence labels, not a likelihood that both people will enjoy the result. A proper accuracy measure would require rated examples from real pairs and an evaluation set.

### Insights

Lead with two jobs: find a cultural direction to try and choose somewhere to start. Show a small, diverse set of returned theme families, with remaining themes available on request. Route cuisine/dietary themes to Dining, coffee themes to Coffee, and media themes to relevant media outputs. Preserve existing filters when applying a theme.

Named existing places and map links lead the area view. A customer can find food within 1.5 km of a named starting place while retaining food preferences. If geographic points do not connect to current places, the screen explicitly offers existing discoveries instead. The coordinate plot and audience demographics are omitted from the consumer screen because they do not help someone choose an outing. The analysis endpoint remains available for research; demographic association must never be presented as a trait of the customer.

## What makes this more than asking Gemini for restaurants?

A Gemini application with search can already retrieve restaurant information and cite sources. Our defensible difference is the combined workflow: confirmed cross-domain tastes → Qloo audience-taste retrieval → validated, category-scoped results → persistent preferences and feedback → evidence-backed comparison and planning. The model does not invent the recommendation inventory. This provides a reviewable taste-retrieval mechanism; it does **not** by itself prove higher relevance than Gemini with search. That claim needs controlled evaluation with contrasting profiles and customer judgments.

## Primary-source review

Reviewed 20 October 2026. This is a product/engineering source review, not a market survey, usability study or accuracy benchmark.

- [Google's Gemini search-agent reference](https://github.com/google-gemini/gemini-fullstack-langgraph-quickstart): query generation, search, reflection and citations establish a stronger baseline than an ungrounded chatbot. Differentiate through taste and stateful decisions, not a claim that Gemini cannot search.
- [Microsoft Recommenders](https://github.com/recommenders-team/recommenders) and its [evaluation implementation](https://github.com/recommenders-team/recommenders/blob/main/recommenders/evaluation/python_evaluation.py): ranking quality, coverage, diversity, novelty and serendipity are distinct evaluation concerns. A large count or diverse shortlist alone does not establish relevance.
- [Qloo hackathon developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide): cultural retrieval and supported API inputs/outputs ground the integration. Returned affinity is not verified noise level, opening hours, booking availability or a health guarantee.

## Verification boundaries

Regression tests cover ambiguous input, explicit category routing after Music context, review suggestions, active categories, shortlist references, sparse metadata and theme routing. Browser contracts use labelled fixtures. Live Gemini/Qloo and real account persistence are separate acceptance checks; mocks cannot certify them. See [storage audit](ACCOUNTS_AND_STORAGE.md#storage-limit-audit-20-october-2026) for the unchanged database limits and retention requirements.

### Recorded checks — 20 October 2026

The live Vertex/Gemini probe completed native intent selection → `qloo_find_tags` through MCP → five returned tags → model observation. The response correctly requested concept confirmation before changing discoveries. A same-request model-only baseline also completed. This verifies the live tool protocol, not a completed venue-refinement benchmark or general recommendation superiority.
