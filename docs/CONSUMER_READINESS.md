# Consumer product pass — 16 October 2026

Latest follow-up: [development completion](DEVELOPMENT_COMPLETION.md) records 101 passing tests, the editable first-weekend experience, production browser acceptance and current Gemini HTTP 503 limitation. The details below describe the earlier consumer pass.

The product promise is cultural continuity: bring confirmed tastes into a new city, understand the returned discoveries through real Qloo evidence, and adapt using explicit feedback. MCP is an integration mechanism, not a claim of uniqueness. TastePassport's strongest product angle is the coherent combination of cross-domain cultural translation, real strategy changes, auditable connections and retained personal choices. No individual artist/film-to-place causality is invented.

## Implemented

- A distinctive Passport cover with origin/destination context, confirmed taste chips, and an actual Qloo-backed discovery count.
- Three-card category previews with access to all returned results. Existing server/Qloo order is preserved; no invented “best” scores are attached.
- A visible connection entry point and interactive real query routes. Each route shows its actual input group, category, destination, mode and returned discoveries. The full existing Bridge Map remains as a secondary inspection.
- My Vibe keeps accepted Qloo cards after feed replacement and uses their actual IDs as refinement signals. Clear/reject works for saved cards that no longer appear in the current feed.
- Adaptation notices count newly introduced IDs and name unchanged categories only after comparing their actual card data. They do not claim an improvement when a call fails.
- Optional managed registration/login/recovery and explicit account saving, restoration, deletion and privacy controls. See [accounts setup](ACCOUNTS_AND_STORAGE.md). Accounts are not live until the external project is configured.
- Existing guided fallback, native Gemini, Qloo MCP/native paths, evidence, modes, feedback, comparison and reset behavior remain.

## Validation

TypeScript typecheck, all 98 unit/integration tests, and the Webpack production build passed. Local HTTP checks verified private/no-store account responses, rejection of cross-origin writes, explicit missing-project responses and the privacy page. The captured source/browser assets/backend log scan found zero matches for current runtime secret values. These checks do not establish live Supabase registration or applied database policies. Existing native Gemini/Qloo acceptance from earlier passes remains historical; current provider responses can vary.

The live production Chromium consumer walkthrough passed: onboarding and real resolution, initial Explore queries, three-card previews and expansion, My Vibe retention across replanning, explicit unavailable-account UI, connection/evidence reveals, drawer state, category feedback, both resets and a 390px layout. Gemini returned unavailable during its conversational comparison check; guided fallback passed and comparison stayed hidden rather than generating a fake baseline. Live Supabase registration/storage/RLS are UNRUN until configured.

Next's Turbopack CSS worker could not bind an internal port in this environment. The supported Webpack builder succeeded; build/dev scripts now select Webpack for reproducibility here. This is a tooling choice, not a change to Qloo or Gemini transport.

## Submission/demo

1. Confirm real tastes and build the destination Passport.
2. Open the connection story and inspect a recorded query/result route.
3. Change Familiar/Explore and compare actual discoveries and receipts.
4. Save a discovery with My Vibe, reject another, and show the retained shortlist and unaffected chapters.
5. When account storage is configured, sign in and save; after a restart, restore the saved Passport with dated evidence and refine for fresh results.
6. Run the same-request comparison only when the model is responding successfully.

Remaining external prerequisites include Supabase project/schema/email setup, actual two-user isolation and account lifecycle acceptance, provider availability for a repeatable live comparison, public repository visibility verification and deployment. No deployment or external database mutation was performed by this coding pass.
