# Progressive TastePassport UX

The frontend now follows three steps rather than presenting a persistent chat dashboard. This pass changes presentation and frontend request sequencing only; existing Gemini/Qloo integrations, tools, shared state, evidence, feedback, fallback and reset semantics remain in place.

## Primary journey

1. **Your move:** centered From/Moving to fields, a single chip input, optional inspiration suggestions and one primary “Build my cultural map” action. Origin is local presentation context and is not sent to Qloo or used as an identity rule. Destination remains one of the supported cities. Add 3–5 taste queries; suggestions are editable inputs, not resolved entities or recommendations.
2. **Your tastes:** “We found your Taste DNA”, real candidates in inline selects with explicit confirmation, remove/replace/back actions, and Feels like home / Balanced / Help me explore. Choosing a mode actually refreshes each populated category through the existing familiarity-turn API after initial creation; no unsupported backend parameters or fabricated discoveries. Individual mode-refresh failures preserve valid results and a recovery notice.
3. **Your Passport:** destination hero, confirmed-taste preview, category-specific style control and only populated recommendation categories. Returned names, categories, addresses, concise query-grounded reasons and My vibe / Not my vibe appear on cards. Query notices and technical receipts are collapsed.

## Optional depth

- **Ask TastePassport:** compact floating launch button after Passport creation; native modal drawer on desktop and bottom sheet on mobile. Ask and Refine manually tabs preserve the same top-level session. Closing the dialog does not clear discoveries, conversation or preferences. Escape/backdrop/close dismiss it with native focus trapping.
- **Reset conversation:** inside the drawer. **New Passport:** top navigation on the results screen; returns to empty onboarding.
- **Why this surfaced / View Qloo evidence:** nested collapsed card disclosures retain actual returned fields and receipts.
- **See your cultural bridge:** secondary disclosure below recommendations, including inspectable/removable Taste DNA. No bridge appears during onboarding.
- **See why Qloo matters:** secondary disclosure only for an eligible exact-request snapshot and available model; comparison remains live and tool-free on the baseline side.
- **Not My Vibe:** existing seven-reason dialog, bottom sheet on mobile; compact progress updates the affected category. Other cards remain available.
- **Pending cultural concepts:** confirmation actions remain accessible both on the Passport and inside the drawer. Ambiguity is never silently resolved.
- **Activity:** existing event collection and backend logs are retained; a compact progress state replaces the permanent frontend activity panel. Completion hides progress.

## Files

`app/page.tsx` retains existing state/actions and coordinates the steps; `app/components/onboarding.tsx` renders move/taste confirmation; `app/components/concierge.tsx` supplies the contextual modal; `app/progressive.css` defines the warm responsive presentation. Existing passport, familiarity, evidence, feedback and comparison components remain in use.

## Validation

Typecheck, all 90 unit/integration tests (85 existing plus five progressive frontend tests), and production build passed. Real production Chromium walkthrough passed with live Qloo: three-step onboarding, explicit real matches, initial Explore strategy, collapsed receipts/bridge, drawer persistence, manual category refinement, rejected-ID exclusion with Music preserved, both resets, and 390px layout. The final live conversational Culture switch also passed through guided fallback when Gemini returned HTTP 503. Live browser baseline generation was UNRUN in that run; comparison correctly remained hidden. The existing exact-request comparison/provider protocol tests passed. Model availability remains an external prerequisite.

To reproduce full live browser checks, start the app on port 3001 and an isolated Chromium instance:

```sh
npm run build
npm start -- --port 3001
chromium --headless --no-sandbox --disable-dev-shm-usage --remote-debugging-port=9231 --user-data-dir=/tmp/tastepassport-progressive-browser about:blank
npm run test:browser
```

Use `--no-sandbox` only when the isolated cloud container requires it. Live Qloo is required; Gemini is required for a successful live comparison. The test reports unavailable comparison separately and validates guided fallback rather than fabricating a baseline. `PASSPORT_TEST_URL`, `PASSPORT_CDP_URL`, and `PASSPORT_TEST_ARTIFACTS` optionally override the target, isolated browser endpoint and screenshot folder. The browser test creates and clears its own Passport; never point its CDP endpoint at an unrelated browser session.

No new product feature, deployment or integration rewrite was performed. Existing in-memory sessions, provider availability and Qloo coverage limitations remain. Long result lists still require scrolling; native select menus follow the platform's styling.
