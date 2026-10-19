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
| Confirmed interests | Use the intended artist, film, book or concept | Ambiguous identity still needs confirmation |
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
| Historical trends | Inspect returned history when available | Nonempty history and direction claims require actual returned observations |

## A judge's first journey

1. Start as a guest in Toronto and confirm A.R. Rahman, Interstellar (2014) and Indian cuisine.
2. Show actual dining and content discoveries plus evidence from a returned card.
3. Ask for cheaper vegetarian Indian dining while keeping Music and Movies unchanged.
4. Follow up with “Make those cheaper.” Inspect the applied cap and the actual before/after example if returned prices support one.
5. Add a cinema to an outing without replacing dinner.
6. After rehearsal, demonstrate Together using three confirmed named interests for the second profile.

The complete [demo script](DEMO_SCRIPT.md) includes actions, narration and alternate outcomes. Actual counts and venue names depend on the run.

## Matching and recommendation approach

1. **Retrieve real candidates.** Qloo search/tag lookup supplies IDs; the application does not invent catalogue entities.
2. **Resolve identity conservatively.** Name normalization, token overlap and an optional release year order returned candidates. A unique exact named-entity match can be suggested. Lexical ordering is not a cultural-affinity score; ambiguous entities and taxonomy choices are handled explicitly.
3. **Request the correct output domain.** `filter.type` identifies the desired Qloo output. Dining, coffee and cinema are place activities, while Music and Movies are content/entity categories.
4. **Apply explicit requirements.** City, venue kind, dietary options, price/rating bounds and exclusions constrain applicable requests. Missing numeric metadata cannot be represented as verified compliance.
5. **Choose retrieval style.** Familiar uses the direct profile query; Explore uses a broader profile strategy; Balanced blends distinct query pools. Explicitly refined concepts and dietary requirements remain hard constraints across style changes. Only eligible soft profile tags can be broadened.
6. **Curate returned choices.** Preserve returned evidence, deduplicate entities, limit repeated chains and highlight a taste option, a genuinely lower-price option or a broader option only when supported by the data.
7. **Adapt from feedback.** Refresh affected sections and retain unrelated cards and preferences. If no eligible result is found, retain previous discoveries and expose recovery rather than manufacture a match.

This approach separates identity confidence, retrieval constraints and cultural ranking. It does not claim a universal “accuracy percentage.” Useful relevance needs evaluation with real users and controlled profile comparisons.

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
