> Historical development record. This snapshot may describe superseded behavior. Use the [current documentation index](../README.md) for the submission release.

# Qloo API inspection and experiment design

Inspected official [qloo/docs-public](https://github.com/qloo/docs-public) at commit `d4a0eb978518f7fb404993d1509d11b21239ada6` on 2026-10-13 before implementing calls.

**Specification limitation:** `openapi-schema.json` is the generic OpenAPI 3.1 document-validation JSON Schema (`$id=https://spec.openapis.org/oas/3.1/schema/2022-10-07`), not a Qloo OpenAPI document. It has no Qloo paths, servers, response schemas, or security schemes. Endpoint choices below come from official reference pages. They are documentation-confirmed, not yet runtime-confirmed. Search parsing remains provisional because the public search reference gives no response example/schema: only explicit `results` arrays or `results.entities` arrays are accepted. Unexpected shapes fail visibly, without fabricated fields.

| Endpoint | Parameters | Source |
| --- | --- | --- |
| `GET https://api.qloo.com/search` | `query`, `take=5`; search broadly, validate candidate subtype afterward | [Search](https://github.com/qloo/docs-public/blob/d4a0eb978518f7fb404993d1509d11b21239ada6/reference/get-search.md) |
| `GET https://api.qloo.com/v2/insights/` | `filter.type`, `signal.interests.entities` (comma-separated entity UUIDs), `take=5` | [Basic insights](https://github.com/qloo/docs-public/blob/d4a0eb978518f7fb404993d1509d11b21239ada6/reference/basic-insights-use-case.md) |
| Same insights endpoint, places | `filter.location.query=New York City`, `filter.location.radius=0` | [Parameters](https://github.com/qloo/docs-public/blob/d4a0eb978518f7fb404993d1509d11b21239ada6/reference/parameters.md), [NYC recipe](https://github.com/qloo/docs-public/blob/d4a0eb978518f7fb404993d1509d11b21239ada6/recipes/recipes.md) |
| Same insights endpoint, other categories | `signal.location.query=New York City`; audience relevance, not a physical constraint | [Location insights](https://github.com/qloo/docs-public/blob/d4a0eb978518f7fb404993d1509d11b21239ada6/reference/insights-with-location-use-case.md) |

Authentication: `X-Api-Key`, from `process.env.QLOO_API_KEY` only. Base URL fixed to the documented production host. No alternate-host or staging fallback with the key.

Documented entity categories: artist, book, brand, destination, movie, person, place, podcast, TV show, video game. This spike requests `urn:entity:place`, `urn:entity:artist`, `urn:entity:book`, and `urn:entity:brand`. Dining and cultural experiences are not standalone output types. Tags could refine place categories, but the spike does not invent tag IDs.

Insights reference responses use `results.entities`, `name`, `entity_id`, `type`, `subtype`, and `properties`. Returned entity IDs and metadata are captured. Scores are optional and currently retained as unknown; raw `scores` is displayed only if received. No assumed affinity path, probability interpretation, or scale conversion. [Insights API](https://github.com/qloo/docs-public/blob/d4a0eb978518f7fb404993d1509d11b21239ada6/docs/insights-api.md) says 0–1, while general affinity pages say 0–100. Live response inspection must resolve the actual metric shape/scale.

Experiments: Rahman → NYC places; Interstellar → NYC places; combined primary seeds → NYC places; combined primary seeds → artists/books/brands with NYC audience signal; all resolved seeds → NYC places. Compare actual entities across single and combined inputs. These queries can establish cross-domain results, but relevance requires reviewing recommendations; a nonempty response alone is insufficient evidence of useful personalization. No event schedule or real-time availability API is established.

## Hackathon server correction

The user supplied the [official hackathon guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide), inspected on 2026-10-13. It explicitly requires `https://hackathon.api.qloo.com`, `X-Api-Key`, GET `/search` and `/v2/insights`, and notes that hackathon keys always return 401 on production/staging. The client now fixes the base URL to the hackathon server. Earlier production authentication failures do not establish an invalid hackathon credential. The guide prohibits publishing Qloo response data in a public repository; live evidence remains ignored/private.

## Live response validation

After correcting and publishing the hackathon secret destination, real responses confirmed search `results` arrays with `types` arrays, insights `results.entities` with `type`/`subtype`, affinity at `query.affinity`, and locality matches at top-level `query.localities.filter`. The client accepts observed types and prints only actual numeric affinity without scaling it. Raw response evidence remains private and ignored. This supersedes the earlier provisional search/score shape notes.
