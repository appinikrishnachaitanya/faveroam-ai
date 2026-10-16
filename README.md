# TastePassport AI

**Move anywhere. Keep your vibe.**

TastePassport translates confirmed food, music, film and cultural interests into Qloo-backed discoveries in an unfamiliar city. Guided controls and the conversational Taste Concierge share one structured session. The Bengaluru → Toronto persona is editable demo content; only explicitly confirmed Qloo matches become taste signals.

The six core capabilities are:

- **Taste DNA:** inspect and remove confirmed entities and tags, without invented personality scores.
- **Cultural Bridge Map:** trace actual query/result relationships from your tastes to destination discoveries.
- **Feels Like Home ↔ Help Me Explore:** Familiar, Balanced and Explore execute different retrieval strategies.
- **Qloo evidence:** inspect returned metadata and the query receipt behind each discovery.
- **Not My Vibe:** reject an entity and replan its category while preserving the remaining Passport.
- **Taste Concierge:** refine preferences, switch categories and update the same state as guided controls.

## Reproducible setup

For temporary hackathon hosting, see [Render Free deployment and GitHub CI](docs/HACKATHON_DEPLOYMENT.md). The repository includes one-service configuration and a quota-free production smoke check; hosting has not been provisioned automatically.

Requires Node.js 24+ and npm. Validated with Node 24.19.0 / npm 11.9.0.

```sh
npm ci
npm run dev -- --port 3000
```

Configure server-only `QLOO_API_KEY` securely in the runtime environment and `QLOO_API_BASE_URL=https://hackathon.api.qloo.com`. Local development may use an ignored `.env.local` copied from `.env.example`. Never put credentials in `NEXT_PUBLIC_` variables, browser code, source control or chat. Cloud secret bindings must permit the Qloo hostname. Start scripts enable Node environment-proxy support.

```sh
npm run typecheck
npm test
npm run build
npm start -- --port 3000
```

Deploy to a host supporting a persistent Node process and child processes for the official Qloo harness. This task does not deploy the application. Active guest sessions and caches are bounded, in-memory and lost on restart; multiple replicas need shared state or session affinity. Optional managed accounts can save and restore per-city Passport snapshots after Supabase setup. Music suggestions reflect audience taste, not local concert availability. Place coverage and metadata depend on Qloo.

## Optional Gemini conversation layer

Guided discovery, feedback and deterministic conversation refinements work without an LLM. The native `@google/genai` SDK handles Gemini intent extraction, function selection and model-only comparison. Securely configure:

```text
GEMINI_API_KEY=<secure runtime secret>
GEMINI_MODEL=gemini-3.1-flash-lite
AGENT_DEBUG=1
```

No Gemini base URL is needed. Native Gemini takes precedence when `GEMINI_API_KEY` is set; other OpenAI-compatible providers can still use the optional `AGENT_MODEL_*` settings. A native request failure preserves the existing guided fallback and does not silently switch credentials/providers. Allow `generativelanguage.googleapis.com` in cloud secret bindings. The model interprets requests and can select real discovered Qloo MCP tools; deterministic operations retain the validated native API path. The model is never the source of Qloo entities, addresses or scores.

```sh
npm run verify:gemini
```

The verification command also loads ignored `.env` / `.env.local` files and works across Windows/macOS/Linux on Node 24+. It enables metadata-only logs unless explicitly disabled. Normal app logs require `AGENT_DEBUG=1`; set `0` to disable. No prompts, arguments, model text, headers or credentials are logged. See [native Gemini runtime](docs/GEMINI_RUNTIME.md).

This acceptance probe requires a configured provider, verifies a genuine live model-selected Qloo MCP operation, and generates a live baseline without Qloo tools for the same request. Missing configuration exits with status 2 before making calls. Live native Gemini acceptance **passed with `gemini-3.1-flash-lite`**: intent extraction, dynamic `qloo_find_tags` MCP selection/execution and the same-request model-only baseline. Use that verified model in this environment; the earlier `gemini-2.5-flash` default remains configurable. See the latest acceptance record in the native runtime guide.

The optional judge comparison pairs the exact refinement request with a frozen snapshot of its actual Qloo results. It is hidden without a configured provider or eligible request; it never uses a fabricated baseline.

## Accounts and consumer experience

Guest discovery works without login. Optional managed registration, email confirmation, login/recovery and saved city Passports are implemented; live accounts require your Supabase project and schema. See [account setup and security boundaries](docs/ACCOUNTS_AND_STORAGE.md) and [consumer product readiness](docs/CONSUMER_READINESS.md). My Vibe keeps liked discoveries through replanning; the connection reveal shows actual grouped Qloo query relationships.

## User experience

Start with your move and 3–5 tastes, confirm the real matches, then create your Passport. Chat/manual refinement, bridge and judge comparison are optional. See [progressive UX and live browser checks](docs/PROGRESSIVE_UX.md).

## Toronto demo

See [the full code flow and backend log guide](docs/FLOW_AND_DEBUGGING.md). The sample fills editable inputs only; discoveries are real Qloo responses. Set `AGENT_DEBUG=1` to follow resolution, HTTP/cache/retry activity, model/MCP choices, category validation, feedback and resets in server logs.


Start a New Passport, choose Toronto, add and confirm A.R. Rahman, Interstellar (2014) and Indian cuisine. Build the Passport, inspect DNA and bridge receipts, and change Eat from Familiar to Explore. Then try:

1. “Tonight I want Indian food, quiet atmosphere, and nothing too touristy.”
2. Not My Vibe → Too mainstream on an Eat card.
3. “Forget food. Show me something cultural.”
4. “Give me something more adventurous but still connected to my tastes.”

Save a recommendation with My Vibe before asking “I liked this. Find me something with a similar vibe.” Reset conversation preserves the Passport; New Passport clears the session. Quiet/crowded/price metadata is incomplete and is not a guarantee about current conditions.

See [final readiness and acceptance results](docs/FINAL_READINESS.md), [cultural strategies](docs/CULTURAL_ONBOARDING.md), [agent architecture](docs/AGENT_ARCHITECTURE.md) and [session reliability](docs/SESSION_RELIABILITY.md). Earlier phase documents describe their historical validation; the final readiness report records this pass.

## Preserved feasibility spike

```sh
npm run spike
```

The spike uses Node's ignored `.env` file when present or securely configured environment variables. It resolves cultural seeds and tests native Qloo discovery and locality. It prints public catalog/result evidence, never credentials, and saves ignored evidence under `.spike-output/`. Check evidence timestamps; unit tests do not prove live Qloo behavior. See [feasibility verdict](docs/FEASIBILITY.md) and [validated API choices](docs/QLOO_API.md).

## Open-source release

Licensed under [MIT](LICENSE). Setup and validation are reproducible from the repository. Public repository visibility still needs verification before hackathon submission; an authenticated Git read does not establish public access. No deployment or repository visibility change was performed in this task.
# Latest development pass

The guest experience includes an editable **My first weekend** plan with locally grounded Qloo discoveries, independent stop selection, location lookups and a downloadable text copy. It does not claim live opening hours, route optimization or bookings. Plan edits stay in the open view; download them to retain a copy. Account Passport snapshots do not save weekend edits.

See [development completion](docs/DEVELOPMENT_COMPLETION.md) for current validation and [demo script](docs/HACKATHON_DEMO.md) for the end-to-end story. Supabase activation and deployment remain separate tasks.
