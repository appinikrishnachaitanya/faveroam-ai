# Qloo relevance audit — 20 October 2026

## Findings from the live documentation

Read the current [hackathon guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide), [parameter reference](https://docs.qloo.com/reference/parameters) and [entity-type parameter guide](https://docs.qloo.com/reference/available-parameters-by-entity-type).

- `filter.type` selects the requested output category. Search input types have a separate contract. Confirm seed identities before using their IDs in Insights.
- Hackathon Insights uses GET and `X-Api-Key`. The general reference also describes weighted entity/tag objects for POST. Do not send those objects or duplicate IDs to simulate weights in the hackathon GET integration.
- Unsupported or deprecated parameters may be silently ignored. `bias.content_based` is absent from the inspected current parameter reference and per-entity tables. Remove automatic mode weights and reject that legacy wire parameter with diagnostics; retain compatibility with saved preference objects so old profiles still load.
- Locality searches include fuzzy boundary expansion by default. `filter.location.radius=0` requests strict locality boundaries. Keep this for destination discovery; use an explicit point and radius for a customer-selected nearby search.
- Returned affinity describes a cultural association, not a guarantee of personal enjoyment, dietary suitability or current availability. Explore is not synonymous with hidden gems.

## Implemented retrieval policy

Keep confirmed same-domain seeds as the familiar content anchor, retain cross-domain seeds in adjacent retrieval, enforce explicit concepts/constraints in both, and fuse ranks rather than incomparable affinity scales. Normalize weights across activity subqueries. Apply limited redundancy reduction to the first three place choices. Preserve the provider relevance leader and provenance.

Styles now rely on actual seed/tag differences. If there is no defensible distinct query, use one pool and explain the limitation rather than pretending an undocumented numeric bias changed the result. Cards label Explore results “Explore choice”, rather than claiming every adventurous result is a hidden gem.

## How to measure further improvement

Use identical destinations and constraints with contrasting confirmed taste profiles. Judge the top three results for relevance, usefulness, repeated chains and explanation support. Track successful refinement, strict constraint compliance and category preservation separately from relevance. Include cuisine-only and single-entity profiles, sparse regions, negative feedback and changing cuisines. Compare to a model with search using the same request; an ungrounded model is an insufficient quality baseline.

More endpoints and larger inventories do not establish better accuracy. Current test and live protocol results demonstrate integration and safety properties. They do not establish a measured preference-accuracy percentage or a universal best recommendation model.

## Controlled live check after the audit

`npm run verify:relevance` passed against the live API. In the familiar movie top ten, changing Interstellar to Toy Story left two overlapping titles; changing only A.R. Rahman to Taylor Swift while keeping Interstellar retained all ten titles. The familiar artist output changed to the requested artist's domain. The API returned individual seed-contribution evidence for the routed content results.

Indian versus Italian cuisine retrieval returned distinct dining inventories (14 and 19 eligible results). A live Together comparison returned six shared Dining results with both profiles represented in returned contribution evidence, while retaining the current price/rating filters and individual Passport. These observations verify routing, differing inventories and constraint handling for these synthetic examples. They do not measure customer satisfaction or general recommendation accuracy.
