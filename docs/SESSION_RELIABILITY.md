# Shared Passport state and reliable refinement

Guided Mode and Taste Concierge control one `TastePassportSession`. `runTurn` owns normalization, planning, discovery, feedback, validation, scoped replacement and recovery. Guided controls submit structured intent directly and never call the model. Conversation supplies the same intent after model interpretation or supported deterministic interpretation. There is no second recommendation pipeline.

## State contract

| Product state | Canonical field |
| --- | --- |
| Destination | `city` |
| Resolved taste entities / Taste DNA | `selected` (actual confirmed entity and tag candidates) |
| Resolved tag catalog / category filters | `tags`, `categoryTags` |
| Active and hidden categories | `activeCategories`, `hiddenCategories` |
| Preferences / avoidance constraints | `preferences`, `constraints`, `categoryConstraints` |
| Cultural mode | `explorationMode` (existing alignment or shortlist ranking) |
| Accepted / rejected recommendations | `feedback`, partitioned by `accepted` |
| Current recommendations by category | `cards`, grouped by each card's `section` |
| Current refinement / pending concept confirmation | `intent`, `pending` |
| Conversation | `history` |
| Provider availability | `providerHealth` |
| Empty-result recovery / applied relaxations | `recovery`, `relaxed` |

`Passport` is a rendering projection of this session. Its compatibility fields and agent token are derived by `passportView`, not another state machine. Hidden cards remain in canonical storage, but disappear from the visible sections and translation map. Likes shown on cards derive from canonical feedback. Local form drafts, loading state and reveal counters are presentation state only.

Explicit refinements replace prior constraints for the requested category. Feedback can retain that category's settings. Concepts are scoped by category; a Culture concept never becomes a later Music filter. A new primary cuisine replaces the previous cuisine filter while preserving the original Taste DNA. Requests do not inherit the previous category as an implicit target.

## Reset semantics

**New Passport** clears destination, drafts, selections, concept matches, conversation, results, feedback, rejected IDs, hidden categories, refinements, dialogs and tool activity. It returns to onboarding with an unselected destination. The old server session is deleted; future builds get a new random capability token. A deleted session cannot be resurrected by an in-flight transaction.

**Reset conversation** clears conversation, optional global/category constraints, preferences, current refinement, pending concept choice, refinement-only tags, previous-result history, relaxation/recovery state and the current tool trace. It preserves destination, confirmed Taste DNA, current cards and saved likes/rejections. Hidden categories remain part of the current Passport view; applying a guided refinement reactivates its category. This action makes no Qloo or model request. Both resets preserve model configuration; configuration is not taste state.

## Guided controls and provider health

Guided onboarding supports direct taste entry, entity/concept confirmation and Passport generation without an LLM. Guided refinement offers all five categories, Quiet atmosphere for places, Less mainstream, and avoidance of touristy/mainstream results. Applying a refinement uses the existing Qloo discovery/filtering implementation.

Quiet requires an explicitly confirmed, real Qloo ambience tag whose returned name denotes quiet/calm/tranquil. It does not promise current crowd levels. If none is returned, cuisine discovery still runs and the response explicitly records quiet as relaxed. Less mainstream uses the existing `filter.popularity.max=0.9` heuristic. Touristy avoidance uses existing returned tag validation. Locality is fixed by the destination. Familiar, Adventurous and live crowd filtering are not exposed because their semantics are not established by the existing integration.

Provider health distinguishes unconfigured, configured (not yet proven), healthy and unavailable. Actual failed requests update health. The primary message is “Taste Concierge is temporarily unavailable. You can still refine your Passport.” Guided controls remain available and scroll into view when a Passport is built without AI or a provider becomes unavailable. No generated recommendation or fabricated model response replaces a failed provider.

The existing OpenAI-compatible adapter remains compatible in shape with Gemini's OpenAI-compatible endpoint. Live Gemini credentials are not configured here, so real Gemini function calling remains unverified.

## Progressive fallback and recovery

At most three discovery stages per category, within the existing four-operation/90-second turn budget:

1. Confirmed primary concepts plus requested optional preferences.
2. Remove optional touristy/mainstream constraints; keep quiet/price/atmosphere when supported.
3. Remove remaining optional quiet/price/atmosphere constraints; prioritize the confirmed cultural concept.

Only empty **validated** results advance the relaxation ladder. Network errors and 429s retain the Passport instead of firing additional broad queries. Destination, primary category, confirmed cuisine and rejected entity IDs never relax. Every result is still validated against category/locality/exclusions. Unsupported safety/dietary guarantees are not provided by these controls.

The session records which optional constraints were relaxed and the reply names them. It does not claim all requested preferences were satisfied. If no stage succeeds, current cards remain and recovery buttons submit real structured actions:

- **Keep Indian** (or the actual confirmed cuisine): keep the primary concept, clear optional constraints.
- **Relax quiet**: remove atmosphere/quiet constraints.
- **Allow popular places**: remove popularity/touristy constraints.
- **Show closest matches**: clear optional constraints while retaining cultural concepts and all hard invariants.

Requests update only their categories; hiding a category is local state mutation. Destination or seed editing rebuilds the Passport without a page refresh. The original Qloo client, harness, endpoints, authentication and transport policies are retained.

## Validation

Full typecheck, **52 tests**, and production build passed. Sixteen new session tests cover both resets, shared guided/conversation discovery, provider failure, progressive relaxation, stale hidden state, rejection isolation, every recovery action, primary cuisine replacement, category tag isolation and hidden-card projection and constrained ranking. Existing core Qloo tests remain intact; two agent assertions were updated for friendly provider messaging and explicit hidden state.

Controlled live API scenario: fresh New York City Passport with explicitly confirmed A.R. Rahman, Interstellar (2014), and `urn:tag:cuisine:qloo:indian`. Submitted exactly:

> Tonight I want Indian food, quiet atmosphere, and nothing too touristy.

Eat was selected and stayed visible; discovery returned **14 Qloo-backed dining cards**. Music was byte-for-byte unchanged. The provider was unconfigured; deterministic control remained usable. Qloo returned no usable quiet ambience concept, so quiet was explicitly recorded as relaxed. The three-stage empty-results ladder and network-failed provider path were verified with isolated test doubles rather than represented as live Gemini behavior.

Live guided application, saved acceptance, local hiding, conversation reset, server session deletion, rejection of an old deleted token and clean rebuild all passed. A production Chromium browser flow verified guided onboarding, the exact conversational fallback, unchanged Music, conversation reset preserving all cards, guided application, mobile overflow and complete New Passport reset.

Sessions remain process-local, bounded and expiring. Deployment persistence, cross-process quotas and real Gemini integration verification remain outside this task. No Comfort/Bridge/Discovery modes, Surprise Me, maps or other major feature was added.
