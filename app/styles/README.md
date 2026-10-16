# Stylesheet ownership

`app/layout.tsx` imports the existing Tailwind/global baseline and component baseline, followed by these shared styles. The former `consumer.css` override file has been removed and its rules organized and formatted by responsibility:

- `tokens.css`: shared colors, radii, shadows and timing values.
- `foundation.css`: page typography, shared actions, spacing and motion preferences.
- `navigation.css`: header grid, navbar insets, responsive actions and skip link.
- `onboarding.css`: introduction, confirmation and taste-entry layout.
- `discoveries.css`: Passport, cards, explanations and day-out layout.
- `dialogs.css`: account modal, concierge and feedback dialog layout.
- `controls.css`: input/select styling and focus behavior; loaded last deliberately.

Compound controls have one border owner: their wrapper. Their inner input/select has no border, outline or glow. Standalone fields use their own border. Keyboard focus remains visible through the wrapper border change; button/link focus rings are retained. Keep these rules in `controls.css` rather than adding competing focus rules elsewhere.

The old global/component baselines remain and have not been represented as a complete CSS rewrite. When migrating an existing rule, remove the superseded declaration where practical. Avoid appending a new catch-all override file. Use the browser layout assertions to catch cascade changes at all supported widths.
