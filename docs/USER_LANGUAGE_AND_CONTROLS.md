# User language and controls

The primary UI now describes user actions rather than infrastructure:

- The discovery count no longer says “Qloo-backed.” Provider attribution remains in privacy and optional technical source details.
- “First weekend” is **Plan a day out**: choose coffee, something to see and somewhere to eat; swap/skip stops and download a suggested sequence. No date, route timing or booking is implied.
- “Cultural bridge” is **Why these suggestions?**: see the confirmed interests considered together and the suggestions returned for each category. Individual-interest causality is still not claimed.
- “Taste DNA” confirmation is **Confirm your interests**. The first action is **Find my taste matches**.

The stylesheet previously named `consumer.css` has been replaced by responsibility-based files in `app/styles/`; see its README for cascade ownership and remaining legacy baselines. The day-out component and model module use the same feature name. Navbar padding gives the logo a deliberate inset. Compound fields now own a single border at the wrapper and suppress the inner outline/glow, while keyboard focus remains visible. Modal/action accessibility and real Qloo discovery behavior are preserved.

Browser checks cover logo/navigation containment, compound field focus frames, modal centering/focus restoration, in-flow Ask action, user-facing labels, day-out editing/export and the existing real-data flow. Live account lifecycle still requires Supabase, and hosted acceptance is separate from local validation.
