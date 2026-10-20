# Conversation execution and ranking

TastePassport uses structured Gemini decisions with application-owned execution. The model proposes intent and taxonomy tool calls. The server validates the request, resolves concepts through Qloo, retrieves recommendations, checks evidence and commits a scoped update. Model-generated names or self-reported confidence never authorize recommendations.

## Request flow

1. **Route:** greetings, incomplete input, current-result listings and factual follow-ups have inexpensive application routes. Other requests use the existing structured Gemini interpretation. Routing does not add a separate model request.
2. **Interpret:** the versioned system policy in `src/agent/prompts.ts` includes decision examples for gibberish, stale context, preservation and dish requests. Existing detailed category instructions remain. The latest explicit request takes priority over conversational references; omitted preferences remain active.
3. **Execute:** validated, advertised tools run within the existing Qloo guard. Native Gemini can observe taxonomy results and choose the next lookup. Original function-call parts and thought signatures are preserved. Raw tool responses are compacted before model observation.
4. **Check and commit:** a deterministic evaluator rejects identity/destination/seed changes, changes to protected categories, undeclared changes to other recommendation chapters, duplicate IDs, rejected IDs, mismatched evidence, and observable price/rating/exclusion violations. A failed check returns the original Passport. No model-confidence threshold or extra evaluator LLM call is used.
5. **Respond:** evidence-backed decision summaries and up to three returned choices remain the customer response. This change does not introduce unrestricted model-written venue claims.

Per-request execution metadata records routing, interpretation, execution, checking and a terminal outcome: completed, needs-input, partial, blocked, cancelled or failed. It is not saved as preference memory. Logs use the existing safe metadata allowlist; messages, credentials and raw tool payloads are not logged.

## Cost and stopping policy

- Default request deadline: 90 seconds shared across model planning and guarded tool work. Caller-supplied shorter deadlines remain supported.
- Two model planning stages at most: intent interpretation and optional tool planning/observation. The observation stage contains at most three tool executions and one final tool-free model call. Native requests receive the cancellation signal; a cancelled turn cannot commit.
- Therefore the normal native tool path uses at most five logical model requests: one interpretation, three lookup decisions and one conclusion. Many requests use fewer; read-only listing uses none.
- Existing inference recovery retries only HTTP 502, at most twice, with exponential backoff and jitter. Tools are not blindly replayed. At the ceiling this is up to 15 wire attempts, bounded by the shared deadline. HTTP 400/401/429 are not automatically retried by this helper.
- Existing settings remain explicit: temperature 1, decision output ceiling 4,096 tokens and response ceiling 1,024 tokens. Temperature 1 is retained for the configured Gemini family; lowering temperature is not an evidence validator. The five-request path has a 17,408 generated-token ceiling before retries, not an expected token use or monetary quote. Input tokens and provider reasoning/accounting can add cost.
- Qloo guard remains four logical operations by default. One native discovery operation can contain multiple retrieval pools, so this is not a promise of four HTTP requests.
- Exhaustion cannot trigger an extra mutation. Verified taxonomy observations survive optional model-conclusion failure; unavailable categories retain previous results and report recovery.

## Ranking policy

1. Filter for entity type, locality, explicit requirements and rejected IDs before presentation. Familiar content uses same-domain seeds where available. Adjacent retrieval retains cross-domain taste; it cannot relax explicit diet, budget or category requirements.
2. Balanced retrieval uses weighted reciprocal-rank fusion: `sum(weight / (60 + rank))`. Direct and adjacent families receive weights 0.75 and 0.25. Each family's weight is divided among its nonempty subqueries so splitting activity queries cannot artificially multiply influence. Affinity values from different requests are not compared.
3. Preserve the existing adjacent-result quota and repeated-business caps. Requests to avoid mainstream food/coffee exclude recognized chains without claiming that every remaining business is independently owned.
4. A bounded MMR-style diversity pass improves the first three physical-place choices. The relevance leader stays first. For later preview slots, only the next eight candidates compete using `0.85 × rank relevance − 0.15 × redundancy`. Repeated businesses have the largest redundancy penalty; shared cuisine/atmosphere tags have a weaker penalty. Other entity types retain their provider/fusion ordering. The rest of the list keeps its prior relative order.
5. Deduplicate IDs while retaining the first result's evidence. Ratings describe available business quality; they are not converted into cultural relevance probabilities.

These weights are an explicit product policy, not learned parameters or demonstrated accuracy percentages. Evaluate relevance with contrasting profiles, judged top-three choices, chain concentration, constraint compliance and refinement completion. A live provider/protocol check does not establish superiority to a model with search.

## Verification

`tests/request-architecture.test.ts` exercises routing, state termination, rollback, duplicate rejection, preservation, required price evidence and model deadline cancellation. `tests/relevance-ranking.test.ts` checks same-domain routing, fusion provenance and family normalization. Existing customer, tool-loop and SDK regressions cover the surrounding behavior. No database change is needed.

### Live acceptance — 20 October 2026

The native Vertex/Gemini probe completed structured interpretation → model-selected `qloo_find_tags` → MCP response with five tags → model observation → needs-input. A separate model-only baseline completed.

A second live probe resolved Interstellar and Indian cuisine, then submitted: “Find cheaper Indian restaurants in Toronto. Keep music unchanged.” It completed in model/MCP mode, returned 19 Dining results, applied `priceMax: 2`, preserved the existing Music query preferences and required no concept confirmation. This probe started with no Music cards; preservation of actual Music cards is covered by deterministic regressions, not certified by this live probe. These are controlled acceptance examples, not an accuracy benchmark.
