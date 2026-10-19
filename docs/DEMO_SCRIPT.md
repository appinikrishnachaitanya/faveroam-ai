# TastePassport AI — demo script

**Working title:** Your taste should travel with you.

**Suggested edited duration:** approximately four minutes. This is a presentation target, not a statement of the hackathon’s video rules. Check current rules first. Rehearse against the actual deployment; API response times can change the timing.

## Recording preparation

- Confirm Railway runs the intended `work` release and native Gemini is healthy. Provider availability changes; check the latest release evidence and do not record guided fallback while describing a successful native model call.
- Use a fresh guest session. Destination: **Toronto**. Interests: **A.R. Rahman**, **Interstellar (2014)** and **Indian cuisine**. Confirm the actual returned matches.
- Select Dining, Music and Movies for the opening; retrieve actual Cinema places through the planner later. Movie recommendations are films, not cinema venues or showtimes.
- Rehearse Together with a second demonstration profile, for example **Taylor Swift**, **Inception (2010)** and **Daft Punk**. Together requires three distinct named interests. Confirm actual matches. Use the real shared tags and recommendations from that run; do not script an expected common interest.
- Record actual requests and outcomes. It is fine to edit out waiting, with a visible “processing time shortened” caption. Do not replace failures with invented success screens.
- Never show environment settings, credentials, browser tokens or raw backend payloads. Safe event names and counts can appear briefly if they correspond to the recorded request.

## Main script

### 0:00–0:20 — Hook: the human problem

**Screen:** Brief opening title, then the app’s destination and interest entry.

**Say:**

> “Moving to a new city gives you a new address. It doesn’t automatically give you a sense of belonging.
>
> Imagine moving from Bengaluru to Toronto. You know the music you love, the films you return to, and the food that feels familiar. You just don’t know where to begin.
>
> This is TastePassport AI. Your taste should travel with you.”

**On-screen caption:** Move anywhere. Keep your vibe.

### 0:20–0:45 — Establish real cultural inputs

**Do:** Select Toronto. Add A.R. Rahman, Interstellar and Indian cuisine. Confirm returned identities, including the intended film year. Generate the Passport.

**Say:**

> “I begin with three things I already love. TastePassport resolves them through Qloo and lets me confirm what I mean.
>
> Those confirmed interests become cultural signals for discovery in my new city. I can start without creating an account.”

### 0:45–1:05 — Show the result and its evidence

**Do:** Show actual dining results, then one other category. Expand a useful card’s explanation. Read an actual cuisine, rating, price or contribution detail.

**Say:**

> “These are returned Qloo entities and listings, rather than places invented by the language model.
>
> I can inspect the available evidence: listing details, matching requirements and returned taste contributions. An audience connection is explained as an audience connection—not a promise that two films share a story or genre.”

**Recording cue:** Describe one real card visible in this take. Do not use a predetermined venue name, count or relationship.

### 1:05–1:45 — The agent acts

**Paste into Ask TastePassport:**

```text
Find cheaper vegetarian Indian food in Toronto and explain why it fits my tastes. Keep my music and movies unchanged.
```

**Do:** Submit and show the actual completed response and updated dining cards.

**Say:**

> “Now I’m asking the agent to act: change dining, apply vegetarian options and a lower price limit, and preserve Music and Movies.
>
> Gemini interprets that goal. The application checks the scope and constraints, uses Qloo for discovery, validates the results, and updates the requested section.
>
> The response explains the applied price category and the preferences it kept. When the listing data supports it, it also shows a real before-and-after price-category example.”

**Recording cue:** Point to the actual receipt. Read its real cap and listing example only if one is present. Price categories are relative, not quoted menu prices.

### 1:45–2:10 — Prove conversational continuity

**Paste:**

```text
Make those cheaper. Keep music and movies unchanged.
```

**Say:**

> “I don’t have to repeat my city, cuisine or dietary preference. ‘Those’ refers to the dining choices we were discussing.
>
> The agent carries context forward, lowers the saved price cap, and keeps the other sections. If it cannot find eligible choices, it preserves the Passport and explains the limitation.”

**Do:** Show the new cap and preserved categories. Do not call an empty result successful retrieval.

### 2:10–2:45 — Together: the distinctive second act

**Do:** Open **Together · find common ground**. Enter the rehearsed second profile, choose **Find their interests**, confirm actual entities and choose **Find something for both of us**.

**Say:**

> “But a new city becomes more interesting when you explore it with someone else. What if our tastes are different?
>
> Together asks Qloo to compare both profiles, then uses its returned common-ground tags to inform shared discoveries.
>
> This is cultural intelligence doing a specific job: helping two people find a starting point together, without pretending either person is guaranteed to love every result.”

**Recording cue:** Point to one actual shared tag and one returned suggestion. If no common ground is returned, do not invent it; use the honest alternate ending below or rework this segment after a successful rehearsal.

### 2:45–3:15 — Deliver a practical outcome

**Do:** Open the day planner. Keep dinner, add Cinema and let the app retrieve actual local cinema options. Show the chosen dinner remains selected. Reorder or swap one stop.

**Say:**

> “Discovery should lead somewhere. I can turn my Passport into an outing, keep dinner, and ask for a local cinema.
>
> The planner finds venue options rather than treating a movie title as a place. I can change one stop without rebuilding the rest. Hours, travel time and ticket availability still need checking.”

### 3:15–3:40 — Explain why the architecture matters

**Screen:** A simple architecture slide, then return to the app.

```text
Conversation + Passport state
            ↓
Gemini: interpret intent / select supported tools
            ↓
TastePassport: scope / preserve / validate
            ↓
Qloo API + official harness / MCP
            ↓
Updated discoveries + decision explanation
```

**Say:**

> “Gemini understands the conversation. Qloo grounds the cultural discovery. TastePassport connects them through state, validated actions and explanations.
>
> We use one agent with bounded tool execution. Known operations use validated API paths; supported dynamic workflows can use model-selected MCP tools.
>
> Without Qloo, we would lose the returned cultural associations and shared-taste discovery engine.”

### 3:40–4:00 — Close with the product promise

**Screen:** The completed outing, then the Passport cover and live URL.

**Say:**

> “TastePassport isn’t asking you to become someone new when you move. It helps you carry what you love into your next chapter—and discover what comes next.
>
> Start with your tastes. Refine through conversation. Find common ground. Make a plan.
>
> TastePassport AI. Move anywhere. Keep your vibe.”

## Optional 20–30 second evidence insert: model-only comparison

Use this only if the live comparison succeeds and the recording length permits it. Place it immediately after the first fully specified refinement, before subsequent follow-ups add inherited constraints.

**Do:** Use **Compare recommendation approaches**. Show the actual request and both actual outputs.

**Say:**

> “Here is a model-only response for this request alongside the Qloo-backed result. The useful difference to inspect is the evidence: returned entities, cultural inputs, listing attributes and applied constraints.
>
> This is an illustration, not a claim that one example proves we outperform every generic model.”

**Fairness check:** Both sides must receive the same destination, tastes and effective requirements. Do not use a conversation-dependent follow-up as a supposedly equal-input benchmark if the baseline lacks its inherited preferences. Never insert a fabricated weak baseline.

## Alternate lines for real limitations

**No shared Together result:**

> “Qloo did not return common ground for these profiles. The app preserves the existing Passport rather than inventing a shared preference.”

**No eligible cheaper result:**

> “The tighter budget did not produce an eligible match. The agent keeps my previous discoveries and asks how I want to proceed.”

**Gemini unavailable:**

> “The model is unavailable in this take. Guided fallback still supports discovery, but this does not demonstrate a successful native conversation call.”

Re-record the primary agent segment after service recovery if the submission is intended to demonstrate native Gemini execution.

## Gallery captions

1. Your tastes, a new city.
2. Confirm the culture you mean.
3. Change the budget. Keep the rest.
4. See what supports a recommendation.
5. Different tastes. Common ground.
6. From discovery to an outing.

## Recording style

- Let the user's request and the app's response carry the argument. Keep code and logs brief.
- Use a readable browser zoom and deliberate cursor movement; pause on the applied constraint and actual listing evidence.
- Keep background music low enough for narration to be clear; use audio you have permission to include.
- Show optional saved profiles/accounts in a supplementary clip rather than interrupting the guest story with login.
- Do not claim verified historical trends, guaranteed dietary safety, showtimes, reservations or an objective relevance win.
