# Custom destinations

The destination field accepts a typed city, optionally qualified by country. The former five cities remain suggestions only. The passport API, model intent validation, native Gemini instructions, saved-passport creation/restoration and fallback relocation extraction accept custom locality names.

Names are bounded and validated; URLs, contact details and control characters are rejected. Place validation compares the returned city, metro or locality name, allowing accent normalization and explicit aliases such as Bengaluru/Bangalore. A supplied country/region qualifier must match returned geographic metadata. Missing or mismatched qualifiers fail closed. This is not a geocoding service or a guarantee of Qloo coverage for every city or spelling.

The planner retains existing time zones for previously configured cities. Other destinations explicitly use UTC until their destination time zone is resolved; this fallback is labeled in the UI and saved with the plan. Calendar exports remain all-day dates. A future location resolver should provide stable city identity, country and IANA time zone together.

Live diagnostic: an Insights restaurant query for Bengaluru, India returned ten entities; four passed the existing dining and new locality validation. This establishes that a destination outside the former allowlist can return validated results, not a universal coverage or personalization claim.
