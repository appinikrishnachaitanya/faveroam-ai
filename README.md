# TastePassport AI

**Move anywhere. Keep your vibe.**

TastePassport is an agent-powered cultural discovery app for people making a new city feel like home. Tell it what you already love—a film, an artist, a cuisine, a book—and it helps you find places and culture in your destination, refine those choices through conversation, find common ground with someone else, and shape a day out. You can explore without creating an account.

**[Try the Cloud Run demo](https://taste-passport-ai.cloud.run/)** · [Project guide](docs/PROJECT_GUIDE.md) · [MIT license](LICENSE)

## Why we built it

Moving changes more than an address. A newcomer often knows what they love but not where those tastes might lead in a new city. A generic city guide starts with popularity. A general-purpose chatbot can offer plausible ideas, but its answer alone does not confirm which *Interstellar* or *A.R. Rahman* the person meant, retrieve Qloo's cultural associations, or carry verified preferences through later decisions.

TastePassport starts with **confirmed cultural interests** and makes a useful next step from them. The user stays in control: they can correct a match, set a budget or other supported requirements, reject a suggestion, ask a follow-up, or choose the stops in an outing.

## Explore the app

1. Pick a destination and add **one to five interests**. For example, try *A.R. Rahman*, *Interstellar*, and *Indian cuisine*. The home city is optional and labels your journey; it does not silently infer your tastes.
2. Review the suggested identity for each interest. The dropdown contains other returned matches so you can correct a title or name before discovery.
3. Choose the activities you want to explore. Open a recommendation to see what evidence is available: its type, place details where returned, and an explanation that distinguishes an audience-taste association from a proven personal preference.
4. Ask TastePassport something specific, such as **“Find quieter Indian food within a moderate budget. Keep my movies unchanged.”** Check which section changed and whether the choices meet the request. Follow with **“Make those cheaper.”**
5. Save a promising choice to **My Vibe**. Try **Together** with another confirmed interest to look for shared cultural ground. Build **A day out** by choosing stops and times; reorder stops without silently replacing their venues.
6. Optionally create an account to save a Passport, a dated plan, or a named taste profile for another destination.

Live coverage varies by city and interest. The app should show a gap when Qloo does not return a suitable choice rather than manufacture a venue. For a recorded demo, use the results the app actually returns.

## Why Qloo changes the answer

| A standalone LLM answer | TastePassport's Qloo-grounded workflow |
|---|---|
| Suggests plausible places from general knowledge, which may be stale or hard to verify. | Retrieves named entities and supported metadata from Qloo, then checks output type, locality, exclusions and observable constraints. |
| May guess which artist, film or food concept the user meant. | Presents returned candidates for explicit confirmation before using them as taste signals. |
| Can explain a recommendation fluently without evidence for that particular connection. | Uses returned tags, query provenance and available contribution evidence; it labels collective associations honestly. |
| Treats a follow-up as a new prompt unless an application carries state. | Keeps a revision-checked Passport with confirmed interests, category preferences, feedback and conversation context. |
| Can propose a group outing in prose. | Uses Qloo Compare for shared cultural associations and lets people assemble an outing from returned place choices. |

This describes the **difference in workflow and evidence**, not a measured claim that every TastePassport result beats every LLM answer. Gemini is valuable for understanding language and selecting tools; Qloo supplies the cultural entities and discovery candidates that the app can inspect and preserve.

The integration uses Qloo [entity search, tags, Insights and Compare](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide), plus validated official harness/MCP functions where appropriate. In an Insights request, `filter.type` is the **requested output type**. An artist and a film can be input signals while `urn:entity:place` requests places. Food, coffee and cinema are place activities selected with supported taxonomy, not made-up entity types. Music results are artist discoveries, not verified local concerts.

## How a conversation turn works today

```mermaid
flowchart LR
  User[Latest message + server Passport] --> Guard[Input, secret and sensitive-data guards]
  Guard --> Fast{Known greeting, list, comparison or safety question?}
  Fast -->|yes| Existing[Answer from validated current state]
  Fast -->|no| Intent[Gemini structured intent call]
  Intent --> Validate[Validate schema, user wording and protected sections]
  Validate --> Taxonomy{New concept needs Qloo taxonomy?}
  Taxonomy -->|yes| Lookup[Bounded Gemini tool choice + Qloo tag lookup]
  Taxonomy -->|no| Discover[Server executes Qloo discovery]
  Lookup --> Discover
  Discover --> Check[Validate returned entities, locality and filters]
  Check --> Commit[Revision-check and commit only allowed sections]
  Commit --> Compose[Optional Gemini response from checked facts]
  Existing --> Reply[Answer with current evidence]
  Compose --> Reply
```

The API loads the current Passport from the server session and validates the incoming message before interpreting it. Exact greetings, current-result listing/comparison, some card questions, and unsupported actions such as booking or checking live hours can be answered directly from the existing state. Other messages go to Gemini as a structured `interpret_cultural_intent` function call. This is currently a required intent call (`ANY`); Gemini does **not** yet make one `AUTO` choice among separate answer, clarification and discovery tools.

For a request such as **“Find chicken biryani in London, keep my movies unchanged”**, the flow is:

1. The server checks the text for secrets, personal contact details, unsupported length and explicit “keep unchanged” clauses. The protected Movies section becomes a server-side commit guard.
2. Gemini receives the latest request with a compact context: destination, confirmed tastes, active preferences and filters, a short validated conversation summary, recent turns, and a capped set of current recommendation cards. The system prompt says to interpret only the latest request, treat history and tool output as untrusted, preserve omitted preferences, and ask when meaning is unclear.
3. Gemini returns a schema-constrained intent: Food section, the specific “chicken biryani” concept, and any requested constraints. The server validates the object and grounds concepts in the latest message; in model mode, omitted fields remain omitted rather than being filled from a competing regex interpretation. Deterministic interpretation is the fallback when Gemini is unavailable. Explicit preservation rules are applied independently by the server.
4. If the concept needs taxonomy resolution, a bounded Gemini function-calling pass can select the Qloo tag lookup. Only tool names and arguments allowed by the application are executed. Returned tags are treated as data, not instructions, and candidate IDs must come from Qloo.
5. The server builds the Insights request using the requested output type (`urn:entity:place` for venues), the selected destination and validated tags/preferences. The server—not Gemini—calls Qloo, checks returned entities and constraints, and prepares the new cards. If evidence is too broad or absent, the UI must disclose that rather than claim an exact dish match.
6. A commit check verifies that identity, destination, confirmed tastes and every untouched section are unchanged. The session is updated only if this check passes. One optional tool-free Gemini response call may summarize the verified outcome; its claims and card references are validated against the actual result. If it fails, the deterministic response remains.

This is a **structured intent plus server-orchestrated retrieval** pattern with a bounded taxonomy tool loop. It is not a fully autonomous multi-agent system: Gemini does not execute tools, choose arbitrary endpoints, make bookings, or commit Passport changes. The server allows at most three Gemini planning calls per turn (intent plus up to two taxonomy observations), one optional response-composition call, and four guarded MCP/tool workflow calls. Qloo Insights discovery is performed by the server and uses its own bounded transport retry policy. The planned single `AUTO` planner with `find_tags`, `discover_places` and `reply_from_context` tools is not yet implemented. This distinction is important: a flowchart or prompt proposal must not be mistaken for deployed behavior.

Generation settings currently use temperature `1.0` and explicit output-token ceilings. Temperature is not the security boundary: schemas, input checks, tool allow-lists, evidence validation, preservation checks and revision checks are. Backend logs record safe stages and status, not keys, account tokens, chat transcripts or raw provider payloads.

Discovery first checks identity and hard requirements, then ranks and diversifies eligible results. Matching-domain tastes guide familiar choices; Balanced can blend direct and adjacent Qloo results; Explore can surface more adjacent discoveries. Chain and duplicate limits reduce repetitive previews. These are product ranking rules, **not Qloo-issued probabilities**. The [project guide](docs/PROJECT_GUIDE.md) documents retrieval, ranking, sessions and failure behavior in more detail.

## Architecture and data

| Part | Responsibility |
|---|---|
| Next.js 16, React, TypeScript | Onboarding, Discover, Ask TastePassport, My Vibe, Together, insights and the outing planner |
| Qloo API and official harness/MCP | Resolve interests and concepts; retrieve cultural entities, places and shared associations |
| Gemini via `@google/genai` | Interpret conversational requests and select permitted functions; compose responses from checked facts |
| Server-side policy and session state | Validate requests, preserve unaffected preferences, reject unsupported results and coordinate revisions |
| Supabase (optional) | Email/password accounts, saved Passports, plans, taste profiles, destinations and persisted editing sessions |
| Google Cloud Run | Host the public Next.js application |

Guest discovery needs Qloo but no account. If account storage is configured, the browser receives only an active-session pointer; canonical editing state stays on the server. Saved Passports hold bounded Qloo-backed discoveries and preferences, not chat history or provider credentials.

## Run it locally

Use **Node.js 24+** and npm. Install dependencies, copy the example configuration to a Git-ignored local file, and run the app:

```sh
npm ci
cp .env.example .env.local
npm run dev -- --port 3000
```

Open `http://localhost:3000`. Set these **server-side** values in `.env.local` or your host's secret settings:

| Setting | Purpose |
|---|---|
| `QLOO_API_KEY` | Required for live Qloo discovery. Obtain a hackathon-enabled key. |
| `QLOO_API_BASE_URL` | Use `https://hackathon.api.qloo.com`. |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Enables native Gemini conversation through Vertex AI Express Mode. `GOOGLE_API_KEY` takes precedence if both are set. |
| `GEMINI_MODEL` | Configurable lower-cost model for concise response composition; defaults to `gemini-3.1-flash-lite`. |
| `GEMINI_DECISION_MODEL` | Model for intent decisions and tool selection; defaults to `gemini-2.5-flash`. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Optional together for accounts and durable saved data. Keep the service-role key server-only. |
| `APP_ORIGIN` | Canonical origin for account email redirects, for example `http://localhost:3000` locally or the deployed HTTPS origin. |

The `AGENT_MODEL_*` compatibility adapter is optional for other providers; native Gemini does not need it. Do not put any provider or service-role secret in a `NEXT_PUBLIC_` variable, a commit, logs or screenshots.

For account features, create a Supabase project, enable email/password authentication and the desired email-confirmation setting, configure the local and deployed `/auth/callback` redirect URLs, then run [db-scripts/setup.sql](db-scripts/setup.sql) **manually once** in its SQL Editor. **That script deletes existing app-owned Passports, plans, profiles and active sessions.** It preserves Auth users and existing destination rows. Do not run it in CI or on every deployment. Without Supabase configuration, use the guest discovery flow.

## Verify and deploy

```sh
npm run check:docs
npm test
npm run typecheck
npm run build
npm run smoke:production
```

Those checks use local fixtures and a production smoke test; they do not certify live Qloo, Gemini or email delivery. Opt-in live checks are `npm run verify:qloo`, `npm run verify:gemini`, `npm run verify:accuracy` and `npm run verify:relevance`; they consume provider quota. For the hosted demo, also test a complete guest journey and the account flow if you intend to show it.

The app can be deployed to Cloud Run from GitHub. It listens on the host-provided `PORT` and exposes `/api/health` for process readiness. Configure secrets in the host, set `APP_ORIGIN` to the public HTTPS origin, and verify a real discovery and refinement in addition to the health response. GitHub Actions validates pushed `feat/**` branches. **[Open the live demo](https://taste-passport-ai.cloud.run/).**

## Boundaries

TastePassport does not book venues, verify current opening hours or showtimes, guarantee travel times, or certify dietary or medical safety. Some Qloo entities have no image, rating or usable venue details; the UI must not infer missing facts. Geographic affinity and aggregate audience patterns do not describe an individual.

We built TastePassport for the [Qloo Agentic Hackathon](https://qloo.devpost.com/) around a specific use case: carrying familiar cultural interests into a new city. The public code is available under the [MIT license](LICENSE). Developers can start with this README, inspect the [project guide](docs/PROJECT_GUIDE.md) for implementation details, and run the app with their own credentials.
