# Native Gemini runtime

## Latest live acceptance — 2026-10-14T12:04:39.102587+00:00

With the securely configured `GEMINI_MODEL=gemini-3.1-flash-lite`, `npm run verify:gemini` passed (exit 0). For “Find independent contemporary art in Toronto connected to my film tastes.”, native Gemini called `interpret_cultural_intent`, then dynamically selected `qloo_find_tags`. Actual MCP invocation returned status `ok` and five catalog results; the requested section was Culture. Real tag matches await user confirmation before recommendation replanning. The exact same request also produced a live model-only baseline without Qloo tools; baseline contents and credentials were not logged. This verifies the live provider/tool/baseline path, not completion of a new browser comparison or cultural replacement after tag confirmation. Earlier failures below are historical.


`configuredProvider()` prioritizes Google's native `@google/genai` SDK when `GEMINI_API_KEY` is present. `GEMINI_MODEL` defaults to `gemini-2.5-flash`; Gemini has no base URL requirement. Optional `AGENT_MODEL_API_KEY`, `AGENT_MODEL_BASE_URL` and `AGENT_MODEL_NAME` retain the existing compatible adapter for other providers when the native key is absent. Runtime failures retain guided/deterministic Qloo fallback rather than switching provider credentials.

Native `generateContent` uses function declarations with JSON schemas. Intent extraction uses function-calling mode ANY and validates `interpret_cultural_intent`; dynamic Qloo selection uses AUTO so known deterministic requests can select no tool. Selected names must exist in the supplied catalog; arguments must be objects. Existing orchestration validates and bounds actual calls. Model-only comparison has no tools and retains the same-request snapshot contract. Requests have a 20-second timeout and a one-attempt SDK retry budget; existing agent/Qloo limits remain unchanged.

## Local setup

Use Node 24+ and `npm ci`. Put credentials in ignored `.env.local`, never in source or chat:

```text
GEMINI_API_KEY=<secure local key>
GEMINI_MODEL=gemini-2.5-flash
QLOO_API_KEY=<secure local key>
QLOO_API_BASE_URL=https://hackathon.api.qloo.com
AGENT_DEBUG=1
```

Run `npm run dev -- --port 3000`. Run `npm run verify:gemini` to test real model-selected MCP and the tool-free baseline. Both commands work on Windows as well as Unix; the probe explicitly loads local environment files. Restart the server after changing settings. Cloud configuration is separate from local credentials.

## Safe debug events

With `AGENT_DEBUG=1`, the server emits metadata-only JSON:

- `gemini.request`: interpretation, tool choice, or baseline request attempted.
- `gemini.tool_selected`: validated function/tool name returned by Gemini.
- `gemini.result` / `gemini.failed`: selection count or safe HTTP status.
- `qloo.invoked`: actual workflow invocation and MCP/exec transport.
- `qloo.result` / `qloo.failed`: returned result count or failure.

Trace IDs pair each request with its result; individual Gemini and Qloo operations have separate trace IDs. Qloo invocation is logged after catalog validation and may be served by existing pacing/cache logic. Events do not log prompts, arguments, discovery contents, headers, raw exceptions, keys or chain-of-thought. Interpretation function selection alone does not prove a Qloo MCP call. A failure sequence is reported honestly, not as successful tool execution.

## Validation in this pass

Typecheck, 83 tests and production build passed. Native SDK protocol tests verify ANY/AUTO function schemas, tool-free exact-request baseline, unknown-tool rejection, 429 failure and secret-safe logging. These tests use mocked HTTP responses.

The live probe reused the already configured Gemini credential in the isolated process under the native variable name without printing or persisting it. It reached native Gemini generation and received HTTP 404 before tool selection. A separate native model-list request succeeded and listed `gemini-2.5-flash`; a minimal generation request also returned 404. Therefore schema conversion is not established as the cause, and successful live model selection/MCP/baseline remains unverified. No model change or fake successful trace was made.

A cloud draft now declares `GEMINI_API_KEY` restricted to `generativelanguage.googleapis.com`, `GEMINI_MODEL=gemini-2.5-flash`, and optional `AGENT_DEBUG`. The draft is saved but requires secure value entry/review and publication to activate the new variable binding. No secret values were saved by the agent.
