# Native Gemini runtime

## Configuration

`configuredProvider()` uses Google's native `@google/genai` SDK when `GEMINI_API_KEY` is present. Configure server-only `GEMINI_MODEL`; `.env.example` recommends `gemini-3.1-flash-lite`, previously exercised here. The code fallback when no model is supplied is `gemini-2.5-flash`. Do not infer the deployed model from a local environment or example file.

Gemini does not need `AGENT_MODEL_BASE_URL`. The optional OpenAI-compatible adapter uses `AGENT_MODEL_API_KEY`, `AGENT_MODEL_BASE_URL` and `AGENT_MODEL_NAME` only when the native key is absent. A native failure retains guided fallback rather than silently switching credentials or providers.

## Interpretation, tools and context

- Native function declarations use JSON schemas. Interpretation requires the `interpret_cultural_intent` function and validates its fields.
- Dynamic tool selection permits supported `qloo_find_tags` and applicable `qloo_rank` workflows. Known direct discovery does not require another model call.
- Up to eight recent cultural messages and a whitelist of current Passport preferences support references such as “those” and “that minimum.” User/model roles are grouped after guided-only actions; oversized or disallowed messages are omitted.
- Current state is authoritative. History is context, not a list of commands to replay. The latest request is a partial update.
- Account records, credentials, raw Qloo payloads and contact information are excluded from the projected context. No transcript is logged.
- This context sharing is enabled for native Gemini. The optional compatible adapter retains its prior latest-message interpretation payload.
- Read-only explanations and action receipts are rendered from returned facts and actual state, not free-form model invention.

The request timeout and SDK retries are bounded. A successful historical probe does not certify current model availability or free-tier quota.

## Acceptance

```sh
npm run verify:gemini
```

This probe requires secure provider/Qloo configuration. It verifies native interpretation, a model-selected MCP operation and an actual model-only baseline. Missing configuration exits separately from a provider failure. It logs safe statuses/counts and event names, not prompt bodies or credentials.

For contextual reference resolution:

```sh
node --use-env-proxy --env-file-if-exists=.env --env-file-if-exists=.env.local --conditions=react-server --import tsx scripts/verify-conversation-context.ts
```

The live sequence changes a dining rating minimum through two follow-ups while checking cuisine, diet, price and protected categories. See [release evidence](RELEASE_CHECKLIST.md). Prior native success and the subsequently observed HTTP 504 are recorded distinctly; guided fallback is never counted as native success.
