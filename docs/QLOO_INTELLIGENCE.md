# Qloo integration and evidence

Qloo is the cultural discovery data source. Gemini interprets requests; it does not supply venue names, addresses, Qloo IDs or recommendation scores.

## Requests and output domains

Use `https://hackathon.api.qloo.com` for hackathon credentials, with server-side `X-Api-Key`. The client also allowlists the production host for appropriately provisioned credentials; it does not switch hosts to work around an authentication error.

**`filter.type` specifies the requested output domain.** It is not the type of every input interest. Confirmed artists and films can be input signals for an output request for places.

Normal entity Insights supports these output URNs: `artist`, `book`, `brand`, `destination`, `movie`, `person`, `place`, `podcast`, `tv_show`, and `video_game`, each prefixed with `urn:entity:`. Dining, coffee and cinema are place activities refined by actual taxonomy, not invented entity types. Music means artist discovery, not concert availability.

| Endpoint / workflow | Application use | Evidence boundary |
|---|---|---|
| `/search` | Resolve named cultural interests for confirmation | Returned identity is not inferred from a matching string alone |
| `/v2/tags` | Resolve cuisine, dietary options, dishes, ambience and venue concepts | Use actual returned taxonomy IDs; distinguish homonyms |
| `/v2/tags/types` | Taxonomy diagnostics | A diagnostic capability, not a consumer recommendation |
| `/v2/insights/` | Entity discovery with confirmed signals and applicable constraints | Validate output type, city/category and observable filters |
| `/entities` | Additional information for a returned entity | Missing metadata remains missing |
| `/v2/analysis/compare` | Two confirmed entity profiles and shared cultural tags | Shared tags inform discovery; they do not guarantee compatibility |
| `/v2/trending` | Optional historical observations | Empty/failed history is not a trend or momentum score |
| `qloo_find_tags` / `qloo_rank` | Supported model-selected harness/MCP operations | Tool selection and execution must actually succeed before claiming a live MCP demonstration |

Special Insights requests for `urn:tag`, `urn:heatmap` and `urn:demographics` use dedicated analysis parsers, not the normal entity-card parser. They return cultural associations, geographic audience affinity or aggregate audience context; none establishes a user's demographics.

## Parameter and result validation

`src/qloo/query-plan.ts` maps typed preferences to allowed parameters per output type. Numeric ranges, min/max order and unsupported fields are checked; diagnostics identify unavailable settings. `src/qloo/verify-result.ts` validates observable returned values. A result with missing price/rating information cannot be called compliant with a strict numeric requirement.

Place requests use physical location filters; content requests use audience location context. This is not equivalent to proving local performances or current event availability.

Dietary options are resolved through the actual dietary-option taxonomy. Cuisine and dietary requirements are combined as requirements rather than optional alternatives. Vegetarian options do not certify an entirely vegetarian kitchen, allergen safety or medical suitability.

## Familiar, Balanced and Explore

The current planner **forwards and allowlists `bias.content_based`**. Direct and adjacent retrieval default to weights 0.8 and 0.3 respectively; an explicit supported preference can override the defaults. Earlier reports claiming the parameter is always dropped are historical and are archived.

Explore may broaden eligible soft tags from the confirmed profile while retaining grounded taste signals. Explicitly refined cuisine/diet concepts, atmosphere, numeric requirements and exclusions remain constrained. Balanced blends distinct pools and deduplicates returned entities. Changing a query does not prove a causal ranking improvement; outputs can overlap and relevance still requires evaluation.

## Explainability

Cards retain returned entity metadata, actual query provenance, input roles, available affinity and positive contributor data. Affinity and contributor values are not advertised as a universal match probability.

Customer-facing tag labels use descriptive taxonomy families and label deduplication. Narrative keywords and raw audience labels do not become taste explanations. For screen content, positively contributing music/film inputs are described as audience-taste associations, with no implied shared plot or genre. When per-interest evidence is absent, the explanation says so.

Agent decision receipts use actual before/after state. A lower-price example requires two distinct returned listings with known relative price levels and a genuine lower category. Otherwise the response discloses that the comparison could not be verified. It does not claim monetary savings or that an itinerary stop was automatically replaced.

## Reliability and known limits

The HTTP layer paces requests per process, uses a bounded private cache and respects supported 429 retry behavior. Model/tool failures retain guided fallback and existing discoveries. These controls do not eliminate provider outages or cross-process quotas.

Historical trending remains partially accepted: earlier live place-history requests returned HTTP 400 and tested artist/movie histories were empty. Trend-biased recommendation retrieval is separate from successful historical observations. Do not claim verified acceleration, breakout trends or reliable history for every entity.

Qloo image URLs can be unavailable or blocked by the viewer's network. The UI uses a visible fallback rather than an unrelated image. Use real app captures for submission media and label the environment accurately.

## Verification

Use the opt-in commands in [development](DEVELOPMENT.md). Tests and fixtures establish parsing and state invariants, not current live provider coverage. Aggregate live records are in [the release checklist](RELEASE_CHECKLIST.md) and the clearly labelled [archive](archive/README.md); raw Qloo response dumps and credentials do not belong in the repository.

Official references: [hackathon guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide), [Insights](https://docs.qloo.com/reference/insights-api-deep-dive), [parameters](https://docs.qloo.com/reference/parameters), [Compare](https://docs.qloo.com/reference/analysis-compare).
