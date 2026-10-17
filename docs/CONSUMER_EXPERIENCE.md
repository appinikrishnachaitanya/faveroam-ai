# Consumer workspace and operational logging

## Interaction changes

- Cards use relative budget labels: Budget-friendly, Moderate, Premium and Luxury. These are categories, not dollar amounts. Unknown/invalid categories are omitted. Cards retain a simple rating and useful connection explanation; API parameter names, raw affinity, query receipts and technical diagnostics are removed from cards. The private development inspector remains separate.
- Budget changes in Preferences & Together immediately submit a chapter-scoped discovery update. The other settings remain unchanged. The option labels explain the ceiling; Any budget maps to the documented maximum category. The main Update suggestions action applies the remaining form settings.
- Plan a day starts with today in the destination. Next weekend selects the next Saturday and announces the exact date, including when that date was already selected. Changing workspace views preserves the chosen date and stops.
- Authentication closes before refreshing the verified account state. Saved Passport and plan lists load on explicit library actions rather than holding sign-in open. Email confirmation success shows a notice without opening the saved library. Recovery and retry flows still open the appropriate account screen.
- One workspace view is visible at a time: Discover, My Vibe, Plan a day, Preferences & Together, or Your connections. Inactive views remain mounted to preserve selections. View navigation accounts for the sticky header and toolbar. The assistant is a bottom-right button that opens the existing accessible drawer.
- The About us page is `/about`, linked from the footer on both onboarding and Passport screens. It explains the product, data sources and personal-plan limits. Manrope is self-hosted with its OFL license under `public/fonts`; no runtime font service is required. Typography, blue/teal surfaces, spacing and mobile controls share presentation tokens.

## Backend logs

Safe **info** and **error** logs are enabled by default. Open the application's Railway service logs to see structured JSON records. No additional key or schema configuration is required.

- API boundaries: start/completion/failure, route, independent request trace, HTTP status and duration. This now includes account/auth callbacks, saved Passports/plans and capabilities in addition to existing discovery/agent routes.
- Qloo and native Gemini: request/response, function selection and failures through the existing metadata allowlist.
- Supabase: authentication/storage HTTP invocation, response status and duration, with no URL, SQL, user identifier, body or credential logged.
- Active sessions: creation, updates and expiry, without bearer IDs.

Set `LOG_LEVEL=error` to suppress routine info. `AGENT_DEBUG=1` adds the existing detailed count/strategy metadata; it does not enable raw response or prompt logging. `QLOO_DEBUG_UI=1` still works only on a development server. Credentials, cookies, passwords, email, raw provider errors, prompts and response bodies are excluded from application logs. Hosted platform access/error logs have their own settings.

## Validation

The 124-test suite covers the preserved Qloo/account/plan behavior plus readable price rendering and production logging levels/privacy. The browser contract uses explicitly mocked account/intelligence responses and verifies immediate budget payloads, next-weekend selection, no library-modal flash or library fetch during sign-in, focused navigation, temporary Together results, saved plans/calendar, floating assistant containment and About/font rendering. It does not establish real Supabase delivery or live hosted acceptance.

Qloo supports both named entities and semantic tags; recommendations can also use comparison and trend workflows. No ordering/reservation capability is assumed. Existing historical-trend and unsupported-parameter limits remain documented in `QLOO_INTELLIGENCE.md`.
