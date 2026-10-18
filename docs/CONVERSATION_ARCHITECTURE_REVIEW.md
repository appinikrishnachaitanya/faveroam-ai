# Ask TastePassport conversation review

## Findings

The existing interface uses native Gemini function calling, but the interpretation request carries only the latest message and destination. History is stored on the server and shown in the UI; it is not supplied to Gemini. Tool selection receives a separate cultural shortlist and intent. Calling this unrestricted conversational memory would be inaccurate.

The review identified several concrete failures beyond model availability:

1. Read-only questions could fall through to command guidance or become mutations.
2. A follow-up without a named section could default to Dining or the first previous section.
3. A model could guess Dining for a Coffee follow-up, invent a new “budget-friendly” concept requiring disambiguation, or supply a higher absolute price cap for “cheaper.”
4. More context would improve semantic reference resolution, but that data transfer requires the outstanding explicit approval. No recent transcript or new preference-context payload has been enabled.

## Current execution boundary

```mermaid
flowchart TD
  Message[Latest chat message] --> Local[Recognize explicit scope and read-only questions]
  Local -->|Known read-only question| Answer[Render current filters or returned evidence locally]
  Local -->|Edit or semantic question| Gemini[Native Gemini function call: structured intent]
  Gemini --> Scope[Server scope and preservation checks]
  Scope -->|Read-only question| Answer
  Scope -->|Ambiguous scope| Clarify[Ask category; retain Passport]
  Scope -->|Valid edit| Plan[Patch requested preferences; retain omitted fields]
  Plan --> Resolve[Resolve genuinely new concepts using returned Qloo IDs]
  Resolve --> Qloo[Bounded Qloo client or MCP execution]
  Qloo --> Validate[Validate returned category, location and numeric filters]
  Validate --> Commit[Replace affected sections only; preserve others]
  Commit --> Reply[Return outcome and evidence]
```

Gemini supplies a constrained intent rather than recommendation facts. The server owns Qloo IDs, execution budgets, mutations, numerical relative updates and preserved categories. Known read-only questions require no external call. Semantic questions can select a fixed question type through Gemini, then receive an answer rendered from server evidence; the model does not invent an explanation.

## Changes in this pass

- Read-only capabilities, active-filter and recommendation-explanation answers. They preserve cards, preferences and any pending confirmation.
- Local scope inheritance for ordinary pronoun/relative follow-ups; explicit category changes still take precedence. Multi-section ambiguity asks a question rather than choosing the first section.
- No default to Dining when several visible sections plausibly match the request. A venue-only modifier can target the sole visible venue section.
- A relative modifier does not create a new cuisine/taxonomy lookup. Existing cuisine and diet are retained.
- “Cheaper” is calculated from the current server cap, with a floor of category 1. A model-generated absolute cap cannot increase it.
- The deterministic interpreter uses the current Passport city rather than a New York default.

## Validation and limits

`tests/conversation-architecture.test.ts` exercises read-only answers, pending-state retention, explicit edits with explanations, ambiguous scope, native intent validation, Coffee scope protection and relative budget changes. `scripts/verify-conversation-journey.ts` exercises real Gemini/Qloo refinement, an ordinary follow-up, protected categories, and local read-only answers without transferring private history.

Full native multi-turn history remains disabled pending the user's choice about sending up to eight cultural chat messages and current Passport preferences to Gemini. Account data, credentials and raw provider payloads must never enter that context. Until approved, the server can resolve supported follow-ups locally but Gemini cannot interpret arbitrary references to the complete conversation.

Other existing limits remain: content recommendations are not local showtimes; venue tags do not certify dietary safety; opening hours, transport times, prices and reservations require checking. If strict constraints produce no eligible results, recovery must preserve prior recommendations rather than silently relaxing requirements.

Final regression checks: 200 tests passed. The live native sequence completed vegetarian dining and a cheaper follow-up without pending disambiguation, preserved Music/Movies and answered explanation/filter questions without Qloo mutation calls. Counts are observations of live data, not guaranteed future inventory. Ordinary budget updates also preserve discovery mode when no mode change was requested.

The production browser scenario also passed across consecutive messages: vegetarian dining, explanation, saved filters, cheaper follow-up, then cinema planning. The follow-up returned 20 dining cards, all with a known price category at most 1; other content sections remained unchanged. The selected dinner survived cinema retrieval. Desktop/mobile containment and production smoke passed. No claim is made that the Railway deployment has been checked.
