# Agent architecture and implementation

TastePassport implements a **single stateful, tool-using agent with bounded orchestration**. Gemini supplies structured interpretation and supported dynamic tool choices; Qloo supplies cultural discovery; server code owns scope, state mutation and result validation.

## System view

```mermaid
flowchart TD
  UI[Next.js consumer workspace] --> Resolve[Resolve and confirm cultural interests]
  Resolve --> Qloo[Qloo Taste API]
  Resolve --> Passport[Create Passport and bounded session]
  UI --> Turn[Conversation or guided action]
  Turn --> Context[Project recent cultural conversation and current preferences]
  Context --> Gemini[Native Gemini function calling]
  Gemini --> Policy[Validate intent, preserve scope and requirements]
  Turn -->|Known read-only question or guided input| Policy
  Policy --> Plan[Select direct discovery, tag resolution or shortlist ranking]
  Plan --> Direct[Validated Qloo HTTP client]
  Plan --> Harness[Official Qloo harness: exec or MCP]
  Harness --> Qloo
  Direct --> Qloo
  Qloo --> Validate[Validate IDs, category, locality, exclusions and metadata]
  Validate --> Commit[Replace affected sections; retain unrelated state]
  Commit --> Reply[Evidence and decision summary]
  Reply --> UI
  UI --> Storage[Optional Supabase accounts and saved profiles/plans]
```

## Boundaries and module ownership

| Module | Responsibility |
|---|---|
| `app/page.tsx`, `app/components/` | Consumer state projections, rendering and typed actions |
| `app/api/agent/resolve` and `src/passport/service.ts` | Real candidate resolution, signed choices and initial Passport |
| `app/api/agent/turn` | Validate one action, stream activity/result messages and enforce cancellation |
| `src/agent/context.ts` | Whitelist cultural context; omit account records, secrets and raw responses |
| `src/agent/provider.ts` | Native Google SDK, function declarations, bounded responses and compatible-provider fallback configuration |
| `src/agent/orchestrator.ts` | Interpret, apply scope policy, resolve requirements, execute and commit requested updates |
| `src/agent/scope.ts`, `session.ts`, `store.ts` | Preservation rules, canonical normalization, session lifecycle and revision locking |
| `src/agent/guard.ts` | Tool budget, duplicate-call prevention, timeout and cancellation |
| `src/agent/harness.ts` | Actual official MCP tool discovery/calls and exec workflow transport |
| `src/agent/runtime.ts`, `strategy.ts` | Category retrieval, query pools and familiarity strategies |
| `src/qloo/` | Parameter planning, HTTP transport, normalization, numeric/result checks and evidence helpers |
| `src/agent/answers.ts`, `decision-summary.ts` | Grounded read-only answers and before/after action receipts |
| `src/account/`, `supabase/` | Validated persistence, ownership checks, profiles, plans and Auth integration |

## A conversation turn

1. Validate a single typed action and obtain the current session revision.
2. Answer recognized read-only questions from existing evidence without regenerating recommendations. Guided controls bypass model interpretation.
3. For conversational edits, give native Gemini the latest message, up to eight recent cultural messages and a whitelist of current Passport preferences. Prior requests are context, not instructions to replay.
4. Validate the returned intent. Explicit preservation instructions, typed scope and server state take precedence over unsupported model guesses. Ambiguous multi-section follow-ups ask for a target.
5. Patch only requested preferences. Calculate relative budget changes from server state; “cheaper” cannot raise an existing cap. Ordinary edits do not silently change discovery mode.
6. Resolve genuinely new concepts through actual Qloo taxonomy. Recognized dietary options and unique supported dish matches can apply directly; unresolved identity remains a confirmation step.
7. Run the smallest supported operation under execution limits. Validate actual returned results before replacing affected sections.
8. Return the outcome, applied price/rating changes, retained requirements and a supported before/after listing example. No fabricated discovery or model-authored data enters cards.

## What is model-driven and what is deterministic?

| Model-driven | Server-controlled |
|---|---|
| Semantic intent and reference interpretation | Which changes are permitted |
| Requested domain, constraints and partial query intent | Validation of IDs, fields, scope and explicit requirements |
| Supported dynamic `qloo_find_tags` / `qloo_rank` selection | Executable tool allowlist, query arguments, budgets and result acceptance |
| Selection among supplied explanation facts where used | Factual source material, local read-only answers and decision receipts |

Known queries do not require a model-selected tool on every turn. The application does not implement an unrestricted autonomous loop in which the model repeatedly replans against every tool response until an arbitrary goal is achieved. MCP is a tool transport, not evidence of multiple agents.

## State, memory and persistence

Canonical session state includes confirmed interests, city, category tags/concepts, numeric preferences, discovery modes, feedback, cards, pending resolution and bounded history. Conversation and guided controls share it.

Guest sessions are process-local, revision-checked and expire after inactivity. Requests for the same session are locked to prevent overlap. Restarting the service loses active guest sessions. Saved Supabase snapshots can restore persisted work; they do not make an expired active session valid. Use a single replica for the current deployment unless shared session storage or affinity is added.

**Reset conversation** clears chat and refinement context, including refinement filters, while preserving the destination, confirmed tastes, returned cards and saved feedback. **New Passport** clears the active Passport. These reset semantics are distinct from a normal follow-up, which preserves omitted preferences.

## Requirements and recovery

- A category-style change preserves explicitly refined cuisine, diet, numeric limits and unrelated categories. Explore may broaden eligible soft profile signals; it must not turn a dietary requirement into an optional signal.
- Missing or failed model/tool calls retain guided refinement. Fallback is labelled; its success is not represented as successful native model execution.
- Sparse retrieval can broaden taste signals while keeping explicit requirements. Existing results remain when no acceptable replacement is available.
- Qloo contributions describe returned audience/taste relationships. They do not establish shared film plot, genre or guaranteed individual enjoyment.
- The planner retrieves actual place entities for cinema/nightlife and does not substitute audience-only film/artist recommendations for physical stops.

## Security and observability

Provider and service credentials stay server-side. Inputs and saved snapshots are validated; account operations enforce ownership. The model context is a whitelist projection rather than a serialized session/account record. Contact information, credentials and oversized history are omitted. Native roles are grouped safely after guided-only messages; context sharing is restricted to native Gemini, preserving the optional compatible adapter's prior latest-message behavior.

Production logs contain allowlisted request IDs, event names, counts, statuses and timing. They exclude prompts, transcripts, headers, credentials, account tokens and raw Qloo responses. The private inspector is development-only. See [debugging](FLOW_AND_DEBUGGING.md).

## Verification

The regression suite covers scope preservation, contextual interpretation contracts, strict numeric metadata, dietary taxonomy, style changes, provider function protocols, role grouping, pending state, cancellation, feedback and account guards. Live provider probes and real browser journeys are separate from mocked tests. Consult the [release checklist](RELEASE_CHECKLIST.md) for the actual recorded results and unresolved deployment/account checks.

## Bounded native tool-observation spike

Native Gemini can now optionally perform a bounded **function call → Qloo MCP execution → native functionResponse → Gemini observation** cycle for unresolved user-requested taxonomy concepts. `src/agent/tool-loop.ts` implements the protocol; the orchestrator authorizes each actual query against the interpreted concept list, charges it to `TurnGuard`, and reuses its result so a successful lookup is not issued twice. The feature is enabled when a Vertex Express key is configured; set `AGENT_TOOL_LOOP=0` for an immediate rollback to previous one-shot tool selection. The OpenAI-compatible adapter, existing ranking route, deterministic discovery and guided actions retain their prior behavior.

The native loop exposes **only `qloo_find_tags`**, never arbitrary MCP tools or HTTP endpoints. It permits up to **three sequential model-selected tool executions per individual user message**; the budget starts fresh on the next user message. There is no conversation-wide counter. It rejects duplicate names/queries and unadvertised tools, then makes one final **tool-free** Gemini response call; failed final generation never discards verified Qloo observations. Normal validated Qloo discovery remains available regardless of whether the model selects tools. Each returned MCP observation is reduced to at most five tag IDs/names/types before being sent back to Gemini. Tool data is untrusted, and Gemini's free-text acknowledgement is intentionally *not* used as a factual Passport response. Backend validation still owns final Qloo discoveries, scope, evidence, and user-facing messages. A failure after an observed tool call keeps the earlier verified result rather than forcing a duplicate lookup; other model/MCP failures fall back to the original validated refinement path; it does not turn into invented recommendations. The existing 90-second turn deadline, duplicate-call guard and cancellation remain in force.

This is a safe incremental, feature-switchable experiment, not an unrestricted self-replanning agent. A broader conversational answer generator needs separate evidence-grounding acceptance tests before production use.

### Gemini 400/502 protocol and retry handling

Gemini 3 sequential function responses include the **unmodified original model Content parts**, preserving the function-call thought signature. We do not synthesize/strip function calls or return raw MCP metadata to the model. The Gemini-visible taxonomy schema is the minimal valid Qloo lookup contract instead of forwarding arbitrary JSON Schema keywords from MCP discovery. A model-selected tool runs only after server-side intent validation.

Each Gemini generateContent operation (interpretation, optional tool steps, baseline and final response) uses at most two retries **only on HTTP 502**: three total attempts, exponential delays of roughly one and two seconds with jitter. HTTP 400 and other client errors are not retried. Google SDK automatic retries are configured to one total attempt to avoid nested retry multiplication. MCP executions are never retried by the Gemini retry helper. Tool-call budgets reset per chatbot message; final no-tools Gemini generation is in addition to the three permitted executions. A failure in final generation retains already-validated tool observations; backend-generated Qloo recommendations remain the source of truth. The text of a final model acknowledgement is not itself trusted as Qloo evidence.

The Passport Connections view groups cards by **section**, not Qloo query/pool ID. Each category appears once with distinct discovery counts and merged query-input names. Each card retains its own individual provenance, and interest filtering still checks the selected interest against the particular card's recorded query inputs; those inputs do not establish individual causal contributions.
