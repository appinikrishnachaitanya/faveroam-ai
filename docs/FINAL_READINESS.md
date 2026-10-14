# Final readiness — 2026-10-14

Subsequent native Gemini SDK migration: see [Gemini runtime](GEMINI_RUNTIME.md). Current validation is 90 passing tests and a passing production build. Subsequent live acceptance with `gemini-3.1-flash-lite` passed: native intent/function selection, actual `qloo_find_tags` MCP results (five), and a same-request model-only baseline. Earlier HTTP 404 failures are historical. The final-pass native Qloo/browser evidence below remains historical evidence for the preserved flows. The subsequent [progressive frontend redesign](PROGRESSIVE_UX.md) passed production Chromium flow/mobile tests; current live comparison was unrun due to Gemini HTTP 503.

The final coding pass preserves the existing Next.js/Qloo architecture. Native live Qloo acceptance passed. Live Gemini-selected MCP and the model-only baseline remain UNRUN because the running environment has no configured model provider. Do not represent this as complete model acceptance or verified hackathon eligibility.

## Final behavior

Confirmed Qloo entities/tags form inspectable, removable Taste DNA. The SVG bridge shows actual query receipts and result relationships, not inferred per-signal causality. Familiar uses direct cultural constraints; Explore broadens optional cultural constraints while retaining actual taste signals; Balanced combines deduplicated direct/adjacent pools. Explicit requested cuisine and rejected IDs remain hard constraints during feedback.

Evidence uses returned Qloo metadata and raw affinity only when present. Cards expose “View Qloo evidence.” Culture classification recognizes verified museum/gallery/theatre metadata even when a venue also carries a generic tourist-attraction tag; an explicit touristy-avoidance preference still filters it independently. A generic Culture request starts with the real catalog tag `urn:tag:genre:place:museum`, disclosed as a starting point rather than an inferred personal taste.

Natural familiarity requests and guided buttons update the same state. “Forget food. Show me something cultural.” hides Eat and replans Culture. Adventurous follow-ups preserve that scope. Similar-vibe requests use the most recently saved My Vibe recommendation; without an anchor, the concierge asks for clarification. Conversation reset preserves destination, confirmed tastes and cards while clearing conversation/comparison context. New Passport invalidates the old session and clears all state.

## Live native Toronto acceptance

Fresh session; explicitly confirmed A.R. Rahman, Interstellar (2014), Indian cuisine; destination Toronto. Live run completed at 2026-10-14T10:02:07.195Z.

| Check | Result |
| --- | --- |
| Familiar Eat | 14 real results |
| Explore Eat | 11 real results, 6 new entity IDs |
| Exact Indian / quiet / non-touristy request | 13 dining results; only Eat updated |
| Too mainstream feedback | Replacement succeeded; rejected entity ID absent; explicit Indian cuisine preserved |
| Cultural category switch | 12 Culture results; Eat hidden |
| Unrelated section | Music unchanged throughout |
| Reset conversation | Passport preserved; conversation and comparison cleared |
| New Passport | Old session invalidated; state cleared |
| Live baseline | UNRUN; provider unavailable, HTTP 503 and hidden UI |

Private live evidence is ignored under `.spike-output/final-demo-summary.json`; it is not required for public setup.

## MCP and model acceptance

Official `@qloo/qloo-harness` 0.1.26 and the MCP SDK are retained. `qloo_find_tags` was actually executed against the live catalog for the museum concept and returned verified museum tags, including `urn:tag:genre:place:museum`. That was deterministic catalog verification, **not model-selected MCP proof**. The affected Passport section is Culture.

`scripts/verify-gemini-mcp.ts` provides a real acceptance probe for “Find independent contemporary art in Toronto connected to my film tastes.” It records actual selected workflow/tool name, status, count and affected section after the configured model selects a discovered tool. It does not substitute a fixture for live selection. Current execution exits 2 before calls because provider variables are absent. Secure Gemini configuration requirements were saved as an environment draft; saving the draft does not activate them.

Transport errors and unsuccessful MCP envelopes get one bounded exec fallback for the actual workflow. If both paths fail, existing results remain available with recovery controls. Proven deterministic Qloo requests do not require MCP.

The live comparison sends the exact request, destination and confirmed tastes to the model without Qloo tools or returned entities. Its paired Qloo side is frozen from the same refinement and excludes retained/unrelated cards. New requests/resets discard old or late comparison responses. Protocol tests use an explicitly mocked provider and do not establish live Gemini success.

## Validation

- TypeScript typecheck passed.
- All 82 unit/integration tests passed, including 15 added final-pass tests.
- Production build passed.
- Final production Chromium browser Toronto flow passed: confirmed DNA, grounded bridge, Familiar/Explore controls, evidence, dining refinement, rejected-ID exclusion, Culture switching, adventurous follow-up, both resets, hidden unavailable baseline, and no horizontal overflow at 390px. Live result counts can vary between runs.

Tests cover shared state, both resets, grounded DNA/bridge/evidence, actual familiarity strategies, category feedback, cuisine retention, provider/MCP fallback, Qloo 429 behavior, exact-request comparison, and rejection of invented metadata.

## Security and release constraints

Known runtime credential values were scanned in Git-eligible files, generated browser assets, private demo evidence and full Git patch history: zero matches. High-confidence Google-key scan of history: zero matches. Only placeholder `.env.example` is tracked; `.env`, `.env.local`, and private spike output are ignored. Keys are server-only. MIT LICENSE remains present. Qloo requests contain selected catalog IDs/tags, destination and bounded preference filters; identity, persona occupation and raw conversation are not forwarded to Qloo. User-submitted preferences and destination can be sent to the optional model; avoid entering personal identifiers.

No changes were made to the validated Qloo client/transport, original feasibility verdict/API documents or client tests. No deployment, push, visibility change or new major feature was performed.

Before submission: securely configure and publish the model-provider environment, pass `npm run verify:gemini`, exercise the live same-request comparison, verify the repository is publicly readable, and choose a host compatible with Node 24+, child processes and in-memory session limitations. Authenticated Git access worked, but unauthenticated GitHub metadata could not be reached here; public visibility is unverified.

Coverage, quiet/price metadata and cross-domain relevance remain dependent on real Qloo responses. A preference tag does not promise current crowds or price. Bounded retries, timeouts, pacing, caching, per-session serialization and per-turn tool limits remain in place. No public browser tunnel is claimed by this report.
