# Consumer interface refinement

Current style ownership and user-facing terminology are documented in [user language and controls](USER_LANGUAGE_AND_CONTROLS.md) and [styles README](../app/styles/README.md).

The shared presentation files in `app/styles/` define action colors, surfaces, borders, radii, shadows and interaction timing above the existing component styles. It uses system UI fonts for controls and reading, Georgia for editorial headings, and no external font or image requests. Product behavior, Qloo evidence and agent orchestration are preserved.

Desktop onboarding uses a two-column introduction/form layout; smaller screens retain a single-column flow. The Passport cover, discovery cards, query connections, weekend plan, confirmation cards, concierge and account dialogs share clearer spacing and typography. Body copy is generally 14–17px, form entry 16px, primary actions at least 52px high and common interactive controls at least 44px high. Utility receipts remain smaller. This is not a claim of a formal accessibility certification.

Navigation stays visible; keyboard users can skip to the main content. Visible focus rings, explicit selected states, hover-capable pointer effects, safe-area spacing and reduced-motion behavior are included. Empty physical weekend categories explain the missing data rather than fabricating stops. No new runtime dependency or tracking was added.

Validation: production build/TypeScript, existing 101 regression tests, and production Chromium real-Qloo walkthrough. Browser assertions check keyboard skip navigation, 16px taste input, primary action height, no horizontal overflow at 320/390/768px in onboarding and results, independent weekend edits/download, feedback, retained choices, both resets and the 390px concierge. Desktop, confirmation and mobile screenshots were inspected; a selected-mode contrast issue was corrected during review. Current live Gemini comparison remains unavailable due to provider failure; guided fallback is preserved. Supabase activation and deployment remain excluded.
