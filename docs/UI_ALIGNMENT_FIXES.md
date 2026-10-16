# UI alignment fixes

The account dialog lacked an explicit centered margin after the CSS reset. It now renders through a body portal, uses fixed viewport centering, limits its height and restores keyboard focus to its opener. Account presentation no longer inherits the sticky navigation layout.

Navigation actions are grouped in a semantic nav with explicit grid/flex sizing. Captions truncate or hide before competing with actions. Narrow phones use two header rows instead of overflowing.

Ask TastePassport is part of the results toolbar next to Discover/My Vibe, stacked below them on phones. It no longer floats over cards, feedback or dropdowns. The concierge still opens as a modal side panel/bottom sheet.

Selects now have explicit borders, consistent chevrons, constrained widths and room between text and the arrow. Destination uses its existing bordered input wrapper to avoid doubled borders. Category selectors reserve sufficient arrow space.

Browser regression assertions cover navigation containment, account-dialog viewport centering and Ask-toolbar containment at 320, 390, 640, 768, 1024 and 1440 pixels. Screenshots are local review artifacts, not Qloo response data committed to the repository. Existing live-Qloo walkthrough, feedback, weekend download, resets and mobile concierge checks remain in the browser runner. Supabase account lifecycle and the deployed Railway environment still require their separate acceptance checks.
