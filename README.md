# TastePassport AI

**Move anywhere. Keep your vibe.**

A cultural discovery agent for people settling into a new city. Bring the artists, films and food you already love; discover real Qloo recommendations, refine them through conversation, find common ground with another person and build an outing.

[Try TastePassport](https://tastepassport-ai-production.up.railway.app/) · [Demo script](docs/DEMO_SCRIPT.md) · [Devpost story](docs/DEVPOST_SUBMISSION.md) · [Architecture](docs/AGENT_ARCHITECTURE.md) · [Release checks](docs/RELEASE_CHECKLIST.md)

## The problem

A new address does not automatically create a sense of belonging. Generic city guides start with popular places. Newcomers need a useful connection between what they already love and what an unfamiliar city offers—and a way to refine those choices without repeatedly explaining themselves.

## The solution

TastePassport combines **Gemini conversation**, **Qloo cultural intelligence** and **stateful application orchestration**:

- Confirm actual cultural entities and concepts before using them as taste signals.
- Discover places and content across selected supported categories.
- Refine cuisine, budget, rating or atmosphere while preserving other preferences.
- Follow up naturally: “Raise that minimum” or “Make those cheaper.”
- Inspect returned evidence and a concrete summary of the agent’s changes.
- Use **Together** to compare two confirmed profiles and discover shared cultural ground.
- Build a flexible outing with actual venue choices; keep dinner while finding a cinema.
- Reuse named taste profiles across cities; optional accounts save Passports and dated plans.

Discovery works as a guest. Account functionality requires Supabase configuration.

## Why Qloo matters

Gemini interprets requests and selects supported functions/tools. **Qloo supplies the returned cultural entities, associations and recommendations.** The application validates them, retains context and applies changes to the requested sections.

Entity/tag lookup, cross-domain Insights and two-profile Compare are central to the product. The official Qloo harness/MCP supports dynamic tag lookup and shortlist ranking; known operations can use validated direct API or exec paths. This is a **single agent with bounded orchestration**, not a claimed swarm or unrestricted autonomous loop.

An audience-taste association is not proof of shared film genre, guaranteed enjoyment or a clinically safe diet. [Capabilities and limits](docs/QLOO_INTELLIGENCE.md) explain the distinction.

## Run locally

Requires **Node.js 24+** and npm. Use this checkout; no additional worktree is required.

```sh
npm ci
```

Copy `.env.example` to ignored `.env.local` for local development and enter credentials securely:

```text
QLOO_API_KEY=<server-only secret>
QLOO_API_BASE_URL=https://hackathon.api.qloo.com
GEMINI_API_KEY=<server-only secret>
GEMINI_MODEL=gemini-3.1-flash-lite
```

`GEMINI_MODEL` is configurable. The native SDK code fallback is `gemini-2.5-flash`; `.env.example` recommends the model previously exercised here. Availability and quotas depend on the configured provider. Gemini does not require a base URL. Guided discovery remains available when it is absent or unavailable.

```sh
npm run dev -- --port 3000
```

Optional accounts use `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and the schema in [supabase/README.md](supabase/README.md). Set `APP_ORIGIN` to the deployed HTTPS origin. Keep all credentials server-side and out of source control, browser code, screenshots and logs.

## Verify and run production

```sh
npm run check:docs
npm test
npm run typecheck
npm run build
npm run smoke:production
npm start -- --port 3000
```

The test suite uses isolated fixtures; it does not certify provider availability, deployed behavior or real email delivery. Live acceptance is opt-in and uses configured provider credentials. [Development and verification](docs/DEVELOPMENT.md) lists prerequisites, scripts and what each check establishes.

Railway runs this application as one Node service. Deploy the intended `work` commit, enable the health check and verify GitHub CI plus the live guest journey. In-memory guest sessions require one replica or shared session infrastructure. See [Railway deployment](docs/RAILWAY_DEPLOYMENT.md).

## Repository map

| Path | Responsibility |
|---|---|
| `app/` | Next.js pages, route handlers and consumer UI |
| `app/styles/` | Theme tokens and styles grouped by UI responsibility |
| `src/agent/` | Conversation context, intent, tool orchestration, state and decision summaries |
| `src/qloo/` | Qloo transport, query planning, normalization, validation and evidence |
| `src/passport/` | Matching, discovery strategies, shortlist and outing domain logic |
| `src/account/` | Supabase integration, ownership checks, profiles and plans |
| `src/workspace/` | Shared UI projections and destination catalogue |
| `scripts/` | Production smoke, browser contracts and opt-in live acceptance |
| `tests/` | Unit, orchestration, provider protocol and rendering regressions |
| `supabase/` | Schema migrations, ownership policies and manual reset script |
| `docs/` | Current product, architecture, operations and submission material |

## Read next

- [Product: problem, features, design and matching](docs/PRODUCT.md)
- [Agent architecture and implementation](docs/AGENT_ARCHITECTURE.md)
- [Qloo integration and evidence boundaries](docs/QLOO_INTELLIGENCE.md)
- [Documentation index](docs/README.md)

Licensed under [MIT](LICENSE). Verify repository visibility and all submitted links while signed out before submission. The live URL above is provided for review; local tests do not establish its current deployment status.
