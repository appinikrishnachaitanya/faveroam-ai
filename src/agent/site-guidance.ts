import type { Intent } from "./types.ts";

type SiteAction = NonNullable<Intent["action"]>;
/** Explicit website actions are safe to route without a model or Qloo lookup. */
export function siteGuidanceAction(message:string):SiteAction|undefined {
  const text=message.trim().toLowerCase();
  if (/\b(?:don't|do not|never|not)\s+(?:save|store)\b/.test(text))return;
  if (/\b(?:save|store)\b.{0,35}\b(?:my |this |the )?(?:day |outing )?(?:plan|itinerary)\b/.test(text) && !/\b(?:how|where|can i)\b/.test(text))return "save-plan";
  if (/\b(?:save|store)\b.{0,35}\b(?:my |this |the )?passport\b/.test(text) && !/\b(?:how|where|can i)\b/.test(text))return "save-passport";
  if (/\b(?:find|recommend|different|new|cheaper|quieter|vegetarian|budget|rating)\b/.test(text) && !/^(?:open|go to|take me to|how\b)/.test(text))return;
  if (/\b(?:open|go to|take me to|show me|what is|how (?:use|does|do i|to|can i)|where (?:is|do i|can i))\b/.test(text)) {
    if (/\b(?:taste insights?|insights?)\b/.test(text))return "open-insights";
    if (/\btogether\b/.test(text))return "open-together";
    if (/\b(?:my vibe|saved discoveries)\b/.test(text))return "open-vibe";
    if (/\bpreferences?\b/.test(text))return "open-preferences";
    if (/\bdiscover(?:y)?\b/.test(text))return "open-discover";
    if (/\b(?:plan a day|day planner|outing planner)\b/.test(text))return "plan-day";
  }
  if (/\b(?:set|adjust)\b.{0,35}\bpreferences?\b/.test(text) && !/\b(?:to|for|under|above|without|exclude|cheaper|quieter)\b/.test(text))return "open-preferences";
  return;
}

export function siteGuidanceReply(action:SiteAction,city:string):string {
  switch(action) {
    case "save-passport": return "I’ll open saving for this Passport. If you’re signed out, sign in first; your discoveries will stay here.";
    case "save-plan": return "I’ve opened your day plan. If you’re signed in, I’ll save its selected stops and times; otherwise sign in, then choose Save to Upcoming plans. Your choices stay here.";
    case "plan-day": return "I’ve opened Plan a day. Choose activities, venues, date and times, then save or download your outing.";
    case "open-preferences": return "I’ve opened Preferences. Choose categories, then set the style, budget, rating or area that matters to you. Apply changes to refresh only those categories.";
    case "open-vibe": return "I’ve opened My Vibe. This is where discoveries you saved from cards appear. Save a place from Discover to add it here.";
    case "open-discover": return `I’ve opened Discover. Browse your ${city} suggestions, see why a card fits, save favorites to My Vibe or ask me to refine a category.`;
    case "open-together": return "I’ve opened Together. Add one thing the other person loves, confirm the match, and choose categories to find shared ideas.";
    case "open-insights": return "I’ve opened Taste Insights. Select the interests to explore, find a related theme, then use it to discover more in your chosen categories.";
  }
}
