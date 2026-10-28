# FaveRoam — Devpost submission copy

## Project name

**FaveRoam — Move anywhere. Keep what moves you.**

## Elevator pitch

Moving to a new city can make familiar comforts hard to find. FaveRoam uses your confirmed interests and Qloo’s cultural graph to discover local places, plan a first week, and find common ground with someone new. It shows the evidence behind its suggestions and lets you steer the results.

## Project story

### Inspiration

You can pack your life into a suitcase. Your favourite things are harder to bring along.

Moving to a new city can make familiar comforts—an artist you love, a film you return to, a cuisine you grew up with—feel far away. We wanted to help people use those interests as a starting point for discovering a new place.

Generic recommendations can be popular without feeling personal. FaveRoam starts with interests you confirm, uses Qloo’s cultural graph to find relevant connections, and shows what supports each suggestion. You can refine the results, and when the available evidence is limited, the app makes that clear.

### What it does

FaveRoam helps people turn confirmed interests into a practical start in a new city.

- **Confirm interests:** Search for artists, films, cuisines, and other interests, then choose the entity you mean.
- **Discover with context:** Explore returned places and cultural recommendations. Explanations distinguish confirmed interests from request-specific filters and describe audience associations as patterns—not proof of an individual’s preferences.
- **Explore on a map:** View returned places with available coordinates, see nearby results grouped around real venue anchors, and sort by distance when you choose to share your location.
- **Save places and rituals:** Keep favourite discoveries in My Places and create a recurring ritual from a saved place.
- **Plan a First Week:** Arrange returned venues across seven editable days. Lock or remove stops, undo changes, and export the plan to a calendar. Missing recommendations remain visible as open stops.
- **Steer discovery:** Use the Vibe Dial to explore themes returned by Qloo and see what changed.
- **Ask FaveRoam:** Refine recommendations in natural language, such as “Find quieter Indian food within a moderate budget. Keep my movies unchanged.” The server validates the request and protects sections you asked to keep.
- **Find Common Ground:** Compare two people’s confirmed interests to explore shared themes, distinct recommendations, and a possible place to try together.
- **Share your taste:** Signed-in users can download a taste card or create a read-only link that expires and can be revoked.

### Try it

1. Open the [live demo](https://my-faveroam-app.cloud.run/) and choose **Try a sample**.
2. Confirm the interests and generate a Passport.
3. Open a discovery card to see its supporting context, then explore the map.
4. Ask FaveRoam to refine one category while keeping another unchanged. Expand **What I checked** to inspect the request route and validation.
5. Open **First Week** to build a plan from returned places.
6. Try **Common Ground** with a second set of interests.

### How we built it

**Gemini interprets; the server validates and acts.** Gemini turns a message into a structured request and can select from constrained discovery tools. The server validates the request, executes Qloo calls, checks returned entities and locality, and verifies that protected Passport sections have not changed before saving an update. The model does not directly call arbitrary services or commit Passport changes.

**Qloo grounds discovery in cultural data.** We use Qloo entity search to resolve interests, tags to represent concepts, Insights to retrieve recommendations, and Compare to examine shared and distinct audience associations. In Insights, `filter.type` specifies the kind of result to retrieve; confirmed interests and tags provide the input signals.

The app also uses returned audience, trend, and geographic context where available. These describe aggregate patterns. They are not individual predictions or guarantees.

**Stack:** Next.js, React, TypeScript, MapLibre, Gemini, Supabase for optional accounts, and Google Cloud Run.

### Challenges we ran into

- **Separating confirmed interests from search constraints:** A request such as “pure vegetarian” may help shape a search without being an interest the user confirmed. We updated customer-facing explanations to distinguish confirmed tastes from request-specific signals.
- **Choosing a useful Common Ground venue:** Taking the first result can produce a weak recommendation. We added evidence-aware ranking based on returned themes and audience associations, and disclose when a strong connection is unavailable.
- **Handling imperfect results honestly:** A broad or weakly supported result should not look as certain as a direct match. We improved result labels and preserved visible gaps when no suitable venue was returned.
- **Making maps resilient:** Map tiles can be blocked or slow. FaveRoam provides a coordinate-based fallback so users can still inspect returned places.

### What we learned

- Safety belongs in server-side validation and state checks, not only in a prompt.
- Qloo’s output type and cultural input signals serve different roles; understanding that distinction shaped our discovery flow.
- Showing a gap is more useful than filling it with an unsupported recommendation.
- Audience associations provide context, but they should not be presented as proof of what one person will enjoy.

### What’s next

We want to improve live collaboration, broaden city and language support, and learn from feedback such as “not my vibe.” FaveRoam does not book venues or verify opening hours, so users should check those details before going.

**Try it:** https://my-faveroam-app.cloud.run/  
**Source:** https://github.com/appinikrishnachaitanya/tastepassport-ai
