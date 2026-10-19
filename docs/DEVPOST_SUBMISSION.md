# Devpost submission copy

## Project name

TastePassport AI — The Cultural Belonging Agent

## Elevator pitch

Move anywhere. Keep your vibe. An agent that uses Qloo’s cultural intelligence to turn your tastes into discoveries, adapt to feedback, and find common ground.

## About the project — paste the following story

### Inspiration

You can move your belongings to a new city. Moving your sense of belonging is harder.

You know the music you love, the films you return to, and the food that feels familiar. But in a new city, those connections often disappear behind generic “top places” lists.

We started with a question: **What if your tastes could travel with you?**

TastePassport AI helps people discover an unfamiliar city through the culture they already love—and explore beyond it at their own pace.

### What it does

TastePassport turns confirmed cultural interests into an evolving discovery experience.

- **Carry your tastes into a new city.** Choose a destination and confirm the actual artists, films, cuisines or other interests you mean. Discovery works without an account.
- **Discover across cultural domains.** Explore returned dining, coffee, music, film and other supported categories. Local venue discovery and content recommendations are clearly distinguished.
- **Adapt through conversation.** Ask for vegetarian Indian dining, a lower budget or a different atmosphere. Follow up naturally while keeping other categories unchanged.
- **Understand the change.** The agent reports applied price or rating constraints, retained preferences and a before/after listing example when returned metadata supports one.
- **Find common ground with Together.** Confirm another person’s interests, compare both profiles through Qloo, and use returned shared tags to inform joint discovery.
- **Turn discovery into an outing.** Choose activities, change their order and swap individual stops. Retrieve missing local cinema options without replacing the selected dinner.
- **Keep what works.** My Vibe, reusable taste profiles and optional saved Passports help users continue from their existing tastes rather than start over.

### Why this is an agent-powered application

TastePassport does more than answer a prompt. It maintains state and takes bounded actions against real services.

Google Gemini uses native function calling to interpret a request and, for supported dynamic workflows, select Qloo tools. It receives up to eight recent cultural messages and a whitelist of current Passport preferences. Account records, credentials and raw API responses are excluded from that context.

Our orchestration layer determines the permitted scope, retains omitted preferences, resolves new cultural concepts, executes supported Qloo operations and validates returned results before updating the affected sections. If the intended category is ambiguous, it asks rather than silently choosing one. Read-only questions explain existing evidence without regenerating the Passport.

For example:

> “Find vegetarian Indian restaurants, moderate budget, minimum rating 4.0. Keep music and movies unchanged.”
>
> “Raise that minimum to 4.6.”
>
> “Actually make it 4.7 instead.”

The agent must understand what “that minimum” refers to, retain cuisine and budget, retrieve eligible dining results and preserve the other categories. This sequence was exercised with live Gemini and Qloo.

This is a **single-agent application with bounded orchestration**. Known operations can use validated direct API or official exec paths; supported dynamic workflows can use MCP. We do not claim every request requires MCP or that multiple agents are necessary.

### What makes it Qloo-powered

**Gemini understands the request. Qloo grounds cultural discovery. TastePassport manages continuity and action.**

Qloo is central to the recommendation engine:

1. Entity and tag lookup resolve cultural inputs into real Qloo identifiers.
2. Insights uses confirmed cultural signals, requested output types and applicable geographic, budget and rating constraints to retrieve recommendations.
3. Returned attributes and available positive input contributions support explanations. Audience-taste associations are distinguished from claims of shared story or genre.
4. Qloo Compare identifies shared cultural tags between two profiles; those tags and both profiles inform Together discovery.
5. The official Qloo harness and MCP integration support model-selected tag lookup and shortlist ranking.

Without Qloo, the application would lose this cultural discovery and shared-taste engine. A language model could still suggest ideas, but it would not supply these Qloo-returned entities, associations and query evidence.

The app also includes an optional model-only comparison. We treat it as an illustration of output and provenance, not a controlled benchmark proving universal superiority.

### How we built it

We built the application with **Next.js, React, TypeScript and Node.js**. Google’s native **`@google/genai`** SDK provides Gemini function calling. The **Qloo Taste API**, official **Qloo harness** and **Model Context Protocol** support cultural lookup, discovery and ranking workflows.

The backend shares structured session state across conversation, guided controls and feedback. Server-side checks enforce category scope, preserve unrelated results, validate returned metadata and bound tool execution. Revision checks prevent overlapping requests from silently overwriting each other.

**Supabase** supports optional accounts and persistence for taste profiles, saved Passports and dated plans. **Railway** hosts the application, and **GitHub Actions** runs tests, production builds and smoke checks.

### Challenges we faced

**Ambiguous cultural inputs.** Similar names and repeated taxonomy labels can create friction. We use explicit entity confirmation where identity matters, while resolving recognized requirements such as vegetarian options through the appropriate returned taxonomy.

**Conversation without accidental changes.** “Make those cheaper” must not change Music or discard a dietary requirement. We added bounded conversation context, scoped state updates and server-calculated relative budget changes.

**Explaining surprising recommendations honestly.** An audience association between an artist and a film is not proof of shared plot or genre. We expose the available supporting signals and disclose when only collective evidence is available.

**Real-world API reliability.** Provider failures and sparse results must not erase the user’s Passport. Guided fallback, bounded execution and explicit recovery preserve the experience without pretending a failed model call succeeded.

### What we learned

Cultural intelligence is most useful when paired with continuity and control. Retrieving more results is not the same as helping someone make a decision.

We also learned that trust comes from precise explanations: what changed, which preferences stayed, what the returned evidence supports and what remains unknown.

### Accomplishments we are proud of

- A working guest journey from confirmed interests to real Qloo discoveries.
- Conversational refinements and contextual follow-ups verified against live Gemini and Qloo.
- Two-person discovery informed by Qloo’s returned common-ground tags.
- Real MCP tool integration alongside validated direct operations.
- Scoped replanning, grounded decision summaries and an editable outing planner.
- **214 automated tests**, a passing production build and production smoke checks in the latest development validation.

Automated and local live checks do not replace a fresh rehearsal of the deployed application. Venue hours, menu details, travel times and availability still require checking; the planner does not make reservations.

### What’s next

Our next priority is evaluation with people settling into unfamiliar cities: can they find a useful outing faster, do the choices feel relevant, and does the agent retain their preferences correctly? We want to improve cultural discovery quality through that evidence rather than expand a feature list.

**Move anywhere. Keep your vibe.**

---

## Built with — tags

Next.js, React, TypeScript, Node.js, Google Gemini, Google GenAI SDK, Qloo, Model Context Protocol, Supabase, PostgreSQL, Tailwind CSS, Railway, GitHub Actions

Use the closest autocomplete tag Devpost offers; 13 suggested tags, below the 25-tag limit.

## Try it out links

- Live application: https://tastepassport-ai-production.up.railway.app/
- Source, latest development branch: https://github.com/appinikrishnachaitanya/tastepassport-ai/tree/work
- Repository: https://github.com/appinikrishnachaitanya/tastepassport-ai

Verify the repository is public and the submitted branch is visible while signed out. The latest changes are on `work`; do not submit an older default branch by mistake.

## When did you begin your project?

The earliest tracked commit is **October 13, 2026**. Enter that date only if it matches the actual start of work. Git history cannot establish whether design or implementation began earlier.

## Public URL to your project

https://tastepassport-ai-production.up.railway.app/

## Link to your PUBLIC code repo

https://github.com/appinikrishnachaitanya/tastepassport-ai/tree/work

The repository must be public. Confirm Railway and the submitted code point to the intended release. The repository contains an MIT license.

## Existing-project improvements — use if applicable

Compared with our initial discovery prototype, we added Qloo entity/tag grounding, cross-domain Insights retrieval, native Gemini function calling, official Qloo harness/MCP workflows, bounded multi-turn context, category-scoped replanning, returned-evidence explanations, Qloo Compare-based Together discovery and editable outings. We also added reusable taste profiles, optional Supabase persistence, validation and fallback behavior, and automated tests/build checks. These changes turned a discovery interface into a stateful cultural discovery agent.

If Devpost asks whether this predates the hackathon, answer from the actual project history; this paragraph does not establish eligibility or an earlier start date.

## Project media

### Image gallery — recommended order

Use actual app screenshots with demonstration data, preferably cropped to 3:2 and each below 5 MB.

1. **Hero:** Passport cover and compelling returned discoveries. Caption: “Your tastes, a new city.”
2. **Identity:** confirmed artist, film and cuisine. Caption: “The right interests—not a guessed profile.”
3. **Agent:** cheaper request and its real decision summary. Caption: “Change the budget. Keep the rest.”
4. **Evidence:** an expanded card explanation. Caption: “Know what supports a recommendation.”
5. **Together:** actual shared tags and returned joint suggestions. Caption: “Different tastes. Common ground.”
6. **Outcome:** a complete dinner-and-cinema outing. Caption: “From discovery to a plan you can use.”

### Video demo link

Upload the finished video to a supported host such as YouTube or Vimeo, then paste its accessible URL. No video URL has been created by this document. Check the current hackathon rules before choosing a final duration or visibility setting.

## Before clicking Save & continue

- Confirm the actual current rules, eligibility and deadline on Devpost.
- Rehearse the deployed guest journey and verify healthy Gemini execution; past provider failures demonstrate why a fresh native check is necessary.
- Verify Together, cinema retrieval and any account workflow included in the recording on the deployed build.
- Check the public repository, submitted branch, live URL and video while signed out.
- Replace draft media with actual screenshots and the uploaded video URL.
