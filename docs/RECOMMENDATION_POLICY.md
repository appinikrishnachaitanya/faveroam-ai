# Recommendation policy and relevance evaluation

TastePassport uses **category-aware retrieval, weighted reciprocal-rank fusion and constrained diversification**. Qloo supplies the candidates and cultural evidence. The application decides which confirmed signals belong in each request, validates the output, and chooses a useful shortlist. These are distinct responsibilities.

## What was wrong

The previous familiar movie query combined an artist, a film and an automatically inherited cuisine tag. In a live Toronto check with A.R. Rahman, Interstellar and Indian cuisine, its leading movies were **Qismat 2, Freddy and Kabir Singh**. The returned entity contributions across those first five results averaged 0.549 for the artist and 0.451 for the film. Those are provider contribution values, not accuracy or enjoyment probabilities; tag influence is not measured by that entity-only summary.

The old Balanced strategy alternated two lists. The three-choice preview could then sort by raw affinity across different requests, undoing the intended retrieval priority. Neither operation established that a familiar movie choice was led by the movie interest.

## Policy order

1. **Confirm identity.** Start from one to five tastes and resolve actual Qloo entities/tags; disambiguate when the returned candidates do not establish a unique match. Name confidence is separate from recommendation relevance.
2. **Apply requirements.** Keep explicit destination, venue kind, cuisine/diet refinements, price/rating bounds and exclusions. A later explicit numeric budget supersedes the legacy cheaper flag; Any budget removes the real cap as well as the control label. Reject observable violations; a missing numeric value cannot satisfy a strict bound.
3. **Route signals by category.** Use directly relevant confirmed seeds for familiar content. Keep broader cultural associations in a separate retrieval path.
4. **Retrieve from Qloo.** Preserve query provenance, returned ranking, affinity and available contributor evidence.
5. **Fuse ranks when needed.** Combine distinct eligible lists without treating their raw affinity scores as a calibrated common scale.
6. **Diversify and shortlist.** Deduplicate entities, cap repeated place businesses, and offer a starting choice, a lower-price alternative or a broader discovery only when supported.
7. **Explain the actual evidence.** Distinguish request inputs, returned contributor evidence and descriptive metadata. Report unavailable individual connections plainly.

An eligible result is not automatically a good personal recommendation. This policy makes retrieval behavior testable; user evaluation is still needed to measure relevance.

## Which tastes influence which category?

| Output | Familiar retrieval | Broader retrieval |
|---|---|---|
| Movies | Confirmed movie seeds and accepted movie feedback; relevant media/movie tags and explicit refinements | Confirmed cross-domain entity interests, retaining deliberate category concepts |
| Music | Confirmed artist seeds and accepted artist feedback; relevant music tags and explicit refinements | Cross-domain cultural entity interests |
| Books, shows, podcasts, games, brands, people, destinations | Matching entity-domain seeds when present | The broader confirmed entity profile |
| Dining | Cuisine/venue requirements plus confirmed cultural signals | Eligible soft profile cuisine can broaden; explicitly refined cuisine/diet, numeric limits and exclusions remain requirements |
| Coffee, culture, shopping and cinema venues | Actual place taxonomy and location, with confirmed cultural signals | Broader taste retrieval within the applicable venue requirements |

Automatic food/ambience tags do not steer content discovery when entity interests are available. An intentionally applied category concept is preserved. Tag-only profiles retain their available cultural grounding rather than turning into an unpersonalized city search. When no same-domain entity exists, the familiar path uses the available profile; the UI does not claim that a nonexistent movie seed was used.

A second relevant entity is not assigned a fabricated affinity. Multiple confirmed same-domain entities remain actual Qloo input signals. This release changes retrieval composition rather than claiming undocumented per-seed GET weights.

## Familiar, Balanced and Explore

- **Familiar:** use the direct request and preserve Qloo's eligible result order.
- **Balanced:** retrieve direct and adjacent lists, combine them with weighted RRF, and reserve up to four of twenty slots for adjacent-only discoveries. Fewer eligible results can be returned.
- **Explore:** use the adjacent request, labelled **Broader discovery**. This is cultural exploration, not a promise of plot/genre similarity or a measured novelty score.

Balanced fusion uses:

```text
score(candidate) = Σ weight(pool) / (60 + rank(candidate, pool))
weight(direct) = 0.75
weight(adjacent) = 0.25
```

Ranks start at one. Shared entities accumulate evidence from both lists; IDs deduplicate them. A shared candidate retains its direct query evidence and a separate fusion receipt with source query IDs, ranks and weights. The preview respects this ranking instead of re-sorting cross-query affinities. The adjacent-slot reservation is applied only when a direct pool exists.

**The 0.75/0.25 weights and four-slot reservation are explicit product policy, not learned optimal values.** The existing `bias.content_based` compatibility setting remains forwarded (normally 0.8/0.3). The current parameter page does not document it, so this implementation does not rely on its effect to prove mode differentiation. Seed routing, fusion and provenance provide the observable behavior. Identical queries collapse into one honest profile pool; results can overlap.

Place diversification caps repeated businesses at two per chapter when repeated brand metadata or normalized names identify them. A restaurant sharing a generic first word such as “Indian” is not enough to classify it as the same business. Coffee retains the existing first-token branch heuristic. These rules reduce repetition; they do not certify that a venue is independently owned.

## Why these algorithms?

| Approach | Decision |
|---|---|
| Weighted reciprocal-rank fusion | Implemented: useful for combining ranked retrieval paths without calibrating unrelated numeric scores; simple enough to inspect and regression-test |
| Hard constraints before ranking | Implemented: a highly ranked result cannot override an observable budget/rating violation or explicit exclusion |
| Business diversity rules | Implemented: repeated branches should not consume the consumer's initial choices |
| Maximal marginal relevance (MMR) | Reviewed: balances relevance against similarity to already selected items. The inspected implementation uses embedding cosine similarity. Adding a new semantic representation now would require validating its relevance and redundancy behavior first |
| Learned ranking / collaborative filtering | Deferred: this project lacks a labelled relevance set and sufficient interaction history to claim a trained improvement |
| LLM-only reranking | Not used as a replacement for Qloo evidence. A fluent model rationale does not establish a real cultural connection |
| Native weighted Qloo signals | The parameter reference documents relative entity/tag weights in POST JSON objects. The current transport is GET with confirmed IDs. Adding a separately validated POST transport is an available future experiment, not something this release claims to send |

Research checked on October 19, 2026:

- [Qloo parameter reference](https://docs.qloo.com/reference/parameters): supported signals, POST weight format and explainability. Contributor scores of at least 0.1 are included; lower values can be omitted. Missing contribution evidence is not proof of no connection.
- [Qloo hackathon guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide): output domains and supported parameter discipline.
- [LangChain weighted RRF implementation](https://github.com/langchain-ai/langchain/blob/v0.3/libs/langchain/langchain/retrievers/ensemble.py): weighted sum of reciprocal ranks, default constant 60, with the original RRF paper reference.
- [LangChain Community MMR implementation](https://github.com/langchain-ai/langchain-community/blob/main/libs/community/langchain_community/vectorstores/utils.py): explicit relevance/redundancy trade-off using cosine similarity.

The source files and live Qloo pages were inspected. Original paper and some vendor-documentation hosts were blocked by the execution proxy; their contents are not presented as independently fetched evidence.

## Live evaluation

Run `npm run verify:relevance` with securely configured Qloo credentials. It uses fixed synthetic tastes, prints a bounded set of public result titles and aggregate evidence, and never prints credentials or raw provider payloads.

The controlled profiles hold two interests constant while changing one:

| Profile | Artist | Film | Cuisine |
|---|---|---|---|
| A | A.R. Rahman | Interstellar (2014) | Indian |
| B | A.R. Rahman | Toy Story (1995) | Indian |
| C | Taylor Swift | Interstellar (2014) | Indian |
| Dining contrast | A.R. Rahman | Interstellar (2014) | Italian instead of Indian |

Recorded live behavior:

- Familiar Interstellar recommendations began **Dune: Part Two, Clara, Zack Snyder's Justice League**. Familiar Toy Story recommendations began **Toy Story 4, The Lego Movie 2: The Second Part, Missing Link**.
- With identical artist/film signals and the same bias setting, removing only the automatic cuisine tag changed the leading movies to Dune: Part Two, Clara and Little Women.
- Changing the movie changed all ten leading movie results in this run. Changing only the artist retained the familiar Interstellar movie order.
- Changing the film retained familiar artist results; changing the artist changed the music shortlist.
- Indian and Italian dining requests used their respective cuisine filters and produced different shortlists.
- Balanced returned sixteen direct and four adjacent-only movie candidates in the recorded run. Explore used the broader artist-and-film profile.
- Together completed a real Compare → discovery request using the confirmed profiles, returning six joint dining suggestions with positive contribution evidence from both profiles, a price cap of 2 and minimum rating 4, while preserving Indian cuisine and the individual Passport.

Titles and counts describe a particular provider response. They are not a Precision@3 score, causal quality estimate or guarantee of similar future output. Qloo can still return unexpected associations, including superhero films for Interstellar; familiar means same-domain taste grounding, not an asserted shared genre.

## What to measure next

A relevance benchmark needs human judgements. Use a fixed, contrasting profile set and label the first three/ten results for usefulness, recording the active constraints and mode. Compare Precision@3 and nDCG@10, repeat-business rate, distinct-category coverage and constraint-violation rate. Keep profile changes controlled and separate provider failures from relevance failures. Do not publish a quality percentage from simple list overlap or test pass counts.

### Feedback and control consistency

A new explicit familiarity choice clears an older Surprise goal for that category, so a previous goal cannot silently override Balanced. “Too mainstream” retains popularity filtering and excludes a conservative list of known dining/coffee chains from every retrieval pool before display. This is not comprehensive chain detection or certification of independent ownership. Sparse results remain sparse.

Planner venue IDs are pinned when first displayed. Changing activity order preserves them; “Reselect venues for this order” explicitly requests new defaults from current discoveries. Refinements that remove a selected venue require reselection. Completeness compares chosen stops with the number of requested activities, not a fixed three-stop assumption.
