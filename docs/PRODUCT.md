# Product: carry your taste into a new city

## Problem and audience

TastePassport serves people settling into an unfamiliar city: newcomers, relocating professionals and students who know their tastes but do not yet know the local places or routines that fit them. The problem is cultural orientation, not a lack of search results.

A useful outcome is a small set of understandable choices and an editable outing. A high result count alone is not evidence of relevance.

## Solution and differentiator

The user brings confirmed cultural interests. Qloo translates those interests into returned cross-domain discoveries and can identify common ground between two profiles. Gemini interprets conversational goals. The application retains preferences, controls execution and validates the results before changing the Passport.

The differentiator is **cultural continuity plus adaptive action**: the system can use a person's existing music, film and food interests, accommodate feedback, preserve constraints and help another person join the experience. It does not claim that a language model alone is incapable of cultural suggestions; its recommendations have a specific Qloo data source and traceable execution.

## Features and boundaries

| Capability | Customer outcome | Boundary |
|---|---|---|
| Confirmed interests (one to five) | Use the intended artist, film, book or concept | Ambiguous identity still needs confirmation |
| Selected discovery categories | Explore relevant places or cultural content | A film recommendation is not a cinema, showtime or local event |
| Conversational refinement | Change a category without restarting | Ambiguous category scope triggers clarification |
| Multi-turn context | Follow up on a rating or budget | Up to eight recent cultural messages; not unlimited memory |
| Decision summaries | See applied caps, retained requirements and supported listing comparisons | Price categories are relative, not menu quotes or monetary savings |
| Familiar / Balanced / Explore | Adjust retrieval strategy while keeping explicit requirements | Different queries can return overlapping results |
| My Vibe and feedback | Retain liked discoveries and exclude rejected entities | Feedback is explicit preference state, not a trained personal model |
| Together | Find shared cultural tags and joint discovery options | No guarantee both people will enjoy every result |
| Outing planner | Select, order and swap venue stops; retrieve missing cinema options | No reservation, showtime guarantee or timed route optimization |
| Saved profiles and Passports | Reuse interests across cities and restore saved work | Persistence requires configured Supabase and applied schema |
| Taste insights | Inspect returned themes, geographic affinity and optional audience context | Demographics describe aggregate associations, not the user's identity |

## A judge's first journey

1. Start as a guest in Toronto and confirm A.R. Rahman, Interstellar (2014) and Indian cuisine.
2. Show actual dining and content discoveries plus evidence from a returned card.
3. Ask for cheaper vegetarian Indian dining while keeping Music and Movies unchanged.
4. Follow up with “Make those cheaper.” Inspect the applied cap and the actual before/after example if returned prices support one.
5. Add a cinema to an outing without replacing dinner.
6. After rehearsal, demonstrate Together using three confirmed named interests for the second profile.

The complete [demo script](DEMO_SCRIPT.md) includes actions, narration and alternate outcomes. Actual counts and venue names depend on the run.

## Starting and moving to the next city

One confirmed taste is enough. Three tastes was an onboarding policy, not Qloo's API minimum. One taste gives a focused starting point; users can add up to five for a richer cross-domain profile. Resolution, generation, saved snapshots and reusable profiles all accept one to five; empty profiles remain invalid.

The optional home city only labels the journey on the Passport cover. It is not a Qloo input, does not import origin-city venues and does not infer preferences from birthplace or location. The destination and confirmed tastes determine discovery.

While exploring a city, choosing **New Passport** offers a modal to save tastes for reuse. Saving requires an explicitly entered profile name. Users can cancel and keep their current Passport, or continue without saving. A duplicate name is explicitly labelled as an update. Guest users can sign in to save. The saved-profile picker appears on the signed-in start screen, fills the interests, and can generate fresh discoveries in another destination. Editing the draft clears the selected saved-profile shortcut. The current Passport does not carry a separate persistent Save tastes button.

Cards prioritize returned business/Tripadvisor ratings and show unavailable place ratings honestly. They no longer display numeric price-category badges; price metadata remains available to the budget filter and validated decision summaries. Original category-colored fallbacks and stronger Forest & Butter surfaces keep discovery usable when provider photos fail.

Taste Insights helps users understand cultural themes and choose an area for nearby dining. The area action keeps current dining preferences. Optional aggregate audience views are supplementary context, not a personal demographic profile or a guarantee of popularity data.

## Matching and recommendation approach

1. **Retrieve real candidates.** Qloo search/tag lookup supplies IDs; the application does not invent catalogue entities.
2. **Resolve identity conservatively.** Name normalization, token overlap and an optional release year order returned candidates. A unique exact named-entity match can be suggested. Lexical ordering is not a cultural-affinity score; ambiguous entities and taxonomy choices are handled explicitly.
3. **Request the correct output domain.** `filter.type` identifies the desired Qloo output. Dining, coffee and cinema are place activities, while Music and Movies are content/entity categories.
4. **Apply explicit requirements.** City, venue kind, dietary options, price/rating bounds and exclusions constrain applicable requests. Missing numeric metadata cannot be represented as verified compliance.
5. **Choose retrieval style.** Familiar content prioritizes matching-domain seeds; Explore retains broader entity associations; Balanced uses weighted reciprocal-rank fusion with a limited adjacent-only reservation. Automatic cuisine tags do not overwhelm content requests. Explicitly refined concepts and dietary requirements remain hard constraints across style changes. Only eligible soft profile tags can be broadened.
6. **Curate returned choices.** Preserve returned evidence and the validated/fused ranking, deduplicate entities, limit repeated place businesses and highlight a starting choice, a genuinely lower-price option or a broader option only when supported by the data.
7. **Adapt from feedback.** Refresh affected sections and retain unrelated cards and preferences. If no eligible result is found, retain previous discoveries and expose recovery rather than manufacture a match.

This approach separates identity confidence, retrieval constraints and cultural ranking. It does not claim a universal “accuracy percentage.” Useful relevance needs evaluation with real users and controlled profile comparisons. [Recommendation policy](RECOMMENDATION_POLICY.md) records the algorithm, research and live evidence.

## Consumer design

- Forest & Butter theme with centralized tokens and a locally hosted Manrope font.
- A staged guest flow: destination and tastes → identity confirmation → Passport workspace.
- Distinct discovery, saved choices, planning, preferences/Together and insight views.
- A bottom-corner Ask TastePassport entry point with a closable conversation drawer.
- Loading progress, inline errors and toast feedback for meaningful actions.
- Labelled controls, keyboard interaction, focus management, responsive layouts and reduced-motion support.
- Original decorative illustrations are separate from recommendation photos; entity photos use Qloo-returned URLs and fall back visibly when missing or unavailable.

These are implementation choices, not a claim of formal accessibility certification or measured usability superiority.

## Evaluation priorities

Rehearse the guest journey, contextual refinement, hard-constraint preservation, Together and outing retrieval on the submitted deployment. Assess relevance, diversity, user effort and the honesty of explanations. The optional model-only comparison is illustrative; any controlled comparison must provide the same tastes and effective constraints, including carried-over preferences.

### Discover-first workspace

Discover offers a visible conversation entry point and editable starter requests, alongside direct routes to preferences, areas and Together. Requests are prepared for review rather than submitted automatically. The floating concierge and manual refinement remain available.

Preferences and Together are separate views of one retained stateful workspace. Switching views retains confirmed partner interests and shared results. Preferences changes return to Discover so the outcome is visible. Advanced location and listing filters remain available on demand.

Taste themes are actionable: choose a returned theme and a supported category to search. The structured request merges the theme with existing tag filters, preserves other category preferences, and leaves unrelated categories unchanged. No results are invented when coverage is sparse. Area affinity still leads to nearby dining; aggregate demographics remain optional context. Historical-data UI remains removed.

Passport sections use a visible, non-sticky desktop sidebar and a labelled collapsible menu below 1100 px. All six destinations and the saved-discovery count remain available. Mobile selection closes the menu, identifies the current section, and moves focus to the workspace; Escape closes the expanded menu and restores its toggle focus.

Area discovery now presents named places, returned addresses/ratings and nearby discoveries from the existing Passport. Raw heatmap points and affinity scores are kept out of the consumer view. Places within 1.5 km of returned points receive the area connection label; if there is no overlap, the UI explicitly falls back to existing taste-led places. No neighbourhood name or travel time is inferred. Dining searches anchor to the named place, keeping existing preferences. This presentation adds no provider requests or paid geocoding service.

### Customer-facing category names

Discovery uses **Food** and **Coffee & cafés** throughout the interface and conversation receipts. The planner's food stop is also generic rather than assuming dinner. Internal `Eat` and `Coffee` IDs remain stable for existing accounts, saved profiles and Qloo routing. These labels do not assert verified breakfast, lunch or snack availability; specific offerings require returned evidence and venue verification.

Empty requested categories show one recovery panel in Discover with labelled actions such as **Try Food again** and **Adjust preferences**. The same panel is not repeated inside chat, and existing successful discoveries are preserved.

Unclear chat input is not permission to refresh discoveries. Short incomplete text and obvious keyboard noise request clarification immediately. The model is instructed to return unknown intent for nonsense; server-side grounding also rejects unsupported edit guesses when the current message supplies no actionable category, concept or preference. Meaningful contextual numeric edits (for example raising a previously discussed rating minimum) remain supported. Regression checks cover keyboard noise and a model incorrectly proposing a multi-category update; a real configured Gemini check also returned unknown intent with zero changes.
