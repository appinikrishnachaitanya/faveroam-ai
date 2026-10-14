# TastePassport agentic workspace

## Architecture

The UI remains a Next.js App Router client workspace at `/`, backed by the existing POST `/api/resolve` and `/api/passport`. Server Qloo client, proxy/base URL handling, credentials, pacing/cache/retry transport, signed receipts, normalizers, filters, feasibility implementation and documentation are unchanged. No external LLM, MCP, orchestration framework, database, authentication or deployment was introduced.

- `app/page.tsx`: conversation, editable draft, destination, actual request phases, selected candidate IDs, result and session feedback state.
- `app/components/disambiguation.tsx`: native modal dialog and candidate radio choices.
- `app/components/passport.tsx`: small SVG icons, activity feed, Taste DNA, collective translation visualization, conditional sections and provenance cards.
- `src/workspace/state.ts`: deterministic editable conversation parsing, confirmed signal lookup, activity/section derivation.
- `tests/workspace.test.ts`: isolated UI rendering/protocol fixtures; never imported into production.

## Conversation and signals

Recognizes supported city names and simple `I love / I like / I enjoy / I'm into` clauses; commas, semicolons, newlines and `and` separate a 3–5 taste draft. This is not general natural-language understanding. Users review/edit extracted phrases before lookup, especially titles containing conjunctions. Unknown/free-form input remains editable rather than transformed into invented interests. Suggestions prepare user input only; they are not resolved data or example recommendations.

Lookup completion means candidate search returned; an entity is marked **confirmed** only after explicit choice. Native dialogs show real candidate names/types/details with no default selection; `Escape` closes without selection, focus is trapped by native modal behavior, and labels identify choices. Structured controls allow editing/adding draft tastes. Taste DNA remove controls drop a selected entity, invalidate the displayed passport, and require at least three distinct confirmed tastes to generate again. Removed rows can be restored and reconfirmed. Re-resolving an edited draft clears old matches.

## Honest execution state

Activity derives from actual draft preparation, active resolution request, candidate response, explicit confirmations, active passport request and returned passport. There is no timed fake progress, invented per-seed success, fabricated category completion or model reasoning. The current endpoint batches place/music work, so both are shown as a single exploration step. Building the passport becomes complete only when the response is received. Partial query notices retain available sections; errors keep the draft or confirmed tastes for retry. Empty categories and fake cards are never shown.

## Taste DNA and translation

Only confirmed Qloo entities appear as DNA chips, with returned entity types. The SVG bridge represents the **combined** confirmed signals → Qloo → sections with actual returned cards. It does not draw unsupported one-seed-to-one-result causal edges. An explicit note explains that individual attribution is unavailable. Empty/waiting placeholders are clearly placeholders, not results. No confidence percentages are invented.

## Cards and feedback

Cards use returned normalized names, addresses, descriptions and types. Native `details` reveals "Why this surfaced": all submitted signals, collective provenance, and raw affinity only when actually returned. Affinity is not presented as probability. Music remains labeled as contextual suggestions, not local concerts. My vibe / Not my vibe are toggle buttons with aria-pressed; preferences last for this browser session and do **not** call Qloo, reorder, replan or claim adaptive behavior. Negative feedback softly mutes the card without hiding its evidence. The UI explicitly states that recommendations have not been replanned.

## Visual and accessibility system

38/62 desktop split, dark evergreen conversational panel, rich-light passport surface, warm amber accents, restrained borders/shadows, serif discovery/destination typography and consistent inline SVG icons. Sticky desktop agent panel, balanced tablet layout, conversation-first mobile stack. CSS-only activity/reveal motion honors reduced-motion preferences. No heavy visualization dependency. Content wraps long names/addresses; keyboard focus, semantic fieldsets, native dialog, labelled controls, live activity/conversation/error announcements and mobile touch targets are included.

`next.config.ts` additionally allows the local test origin `127.0.0.1` for Next 16 development assets; without that documented setting, the browser could render server HTML while hydration was blocked. No public tunnel origin is enabled or claimed.

## Validation

- `npm install --cache /tmp/tastepassport-npm-cache --no-audit --no-fund`: passed. Added only `tsx` as a development test loader so the node test runner can render TSX components. Existing tests were preserved.
- Type checking passed. Production build passed.
- 15 tests passed: nine existing tests and six focused tests covering editable conversational extraction, honest activity rendering, no-default disambiguation, empty sections, partial failures/feedback semantics, and collective translation provenance.
- Browser checks used actual Qloo calls. Conversation draft created three inputs; three match rows returned; all three dialogs opened with no preselected radio; three explicit confirmations created three DNA chips; passport returned 38 cards, with no partial-query notice for this run. Feedback aria-pressed toggled true. No mocked production API responses were used.
- Browser layout checks found no horizontal overflow at 1440px, 768px or 390px. Desktop workspace, modal, result cards and mobile screenshots were inspected privately outside the checkout.
- Initial dev/browser check stalled after a production build. Restarting the development server and configuring the documented local dev origin restored hydrated interaction. The production build itself passed throughout.

## Known limitations / Phase 3 boundary

Conversation is deterministic draft extraction, not a genuine conversational agent. No streamed per-category events are available from the unchanged endpoints. Preferences are ephemeral and no adaptive replanning occurs. Other destinations remain exploratory. **Inherited tag-classification quality issue:** actual cards included landmarks in Eat; the current backend's broad tag matcher can overclassify. This phase deliberately preserved those filters and reported the issue instead of silently rewriting the backend. Real data alone does not imply correct section classification or user relevance.

Phase 3 should evaluate category precision and replace broad tag matching with validated category evidence, measure signal contribution against baselines, add genuine conversational orchestration/Qloo MCP where appropriate, implement Not My Vibe replanning and Taste Concierge, and introduce shared quota/abuse controls before deployment. None were implemented here.

## Completion checks

The final production build passed after all UI changes. Keyboard browser validation confirmed focus enters the match dialog, Escape dismisses it, and focus returns to the original trigger; an initial focus-restoration failure was fixed explicitly. Removing a confirmed DNA chip reduced the selected count to two, cleared the prior passport, and disabled generation below the required minimum. The final desktop/tablet/mobile checks still showed no horizontal overflow.

`git diff --exit-code` confirmed the Qloo client/transport, passport backend, category filters, feasibility docs, and existing tests are unchanged. Whitespace validation passed. Credential scans across commit-eligible files and browser bundles found no API key; secret files and raw evidence remain ignored. Browser captures are private temporary artifacts, not production fixtures or published recommendation datasets.
