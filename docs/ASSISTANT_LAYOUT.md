# Ask TastePassport layout

The old panel nested an independently scrolling, height-capped conversation inside a scrolling body. Background page scrolling was also left enabled, and the composer moved with the conversation. Broad guided-input sizing inflated native checkboxes and the manual filters repeated the same mainstream constraint.

The assistant now has one content scroll owner (`.concierge-body`). Header/tabs, composer and optional reset action are flex siblings outside that scroller. The conversation has no height cap or overflow scrolling. The document/root overflow is saved, locked on opening, and restored on close/unmount; focus returns to the opener. Chat scrolls to the current reply, or to a pending clarification. The textarea may scroll its own long input as a normal input control; it is not a second conversation scroller.

The visible conversation starts at the first user chat request. Onboarding progress and initial guided-update messages are excluded from the panel; existing structured state and model context remain. An empty chat offers optional starter requests that fill the composer without submitting. Existing draft persistence, actual model/tool orchestration and guided fallback remain. Manual refinement has properly sized checkboxes and one control per constraint.

`app/styles/assistant.css` owns this presentation. Superseded concierge rules were removed from `progressive.css` and `styles/dialogs.css` rather than adding another competing override layer.

Browser assertions add long temporary layout text and verify exactly one content scroller, a stationary header/composer, locked background, no horizontal overflow, draft preservation and correct restoration after closing. Sizes include desktop/tablet, 320px and 390px phones, and a 480px-high mobile viewport. Those fixtures are removed before actual interaction tests and never substitute for real Qloo results. These are Chromium checks, not physical-device virtual-keyboard certification.
