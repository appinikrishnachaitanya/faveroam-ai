import type { Candidate, Card, Section } from "../passport/model.ts";
export type Constraint =
  | "touristy"
  | "crowded"
  | "mainstream"
  | "expensive"
  | "atmosphere";
export const reasons = [
  "Too touristy",
  "Too crowded",
  "Too mainstream",
  "Too expensive",
  "Wrong atmosphere",
  "Not interested",
  "Other",
] as const;
export type Reason = (typeof reasons)[number];
export interface ConversationCardSummary {
  id: string;
  name: string;
  section: Section;
  priceLevel?: number;
  rating?: number;
  tags?: string[];
}

export interface Intent {
  targetCardId?: string;
  kind: "onboard" | "refine" | "hide" | "unknown";
  question?: "capabilities" | "preferences" | "explanation";
  destination?: string;
  seeds: string[];
  concepts: string[];
  constraints: Constraint[];
  sections: Section[];
  strategy: "discover" | "rank" | "filter";
  hide?: Section[];
  familiarity?: import("../passport/evidence.ts").Familiarity;
  query?: import("../qloo/query-plan.ts").QueryPreferences;
  excludeConcepts?: string[];
  activityGenres?: ("cinema" | "nightclub")[];
}
export interface AgentEvent {
  label: string;
  status: "active" | "complete" | "attention";
}
export interface FeedbackRecord {
  id: string;
  section: Section;
  accepted: boolean;
  reason?: Reason;
  detail?: string;
}
export interface AgentState {
  id: string;
  revision: number;
  expires: number;
  city: string;
  selected: Candidate[];
  tags: Candidate[];
  constraints: Constraint[];
  categoryConstraints: Partial<Record<Section, Constraint[]>>;
  categoryConcepts?: Partial<Record<Section, string[]>>;
  activityGenres?: Partial<Record<Section, ("cinema" | "nightclub")[]>>;
  outingActivities?: string[];
  cards: Card[];
  previous: Card[];
  savedCards?: Card[];
  feedback: FeedbackRecord[];
  intent?: Intent;
  comparison?: import("./comparison.ts").ComparisonSnapshot;
  notices: string[];
  activeCategories?: Section[];
  hiddenCategories?: Section[];
  preferences?: Partial<Record<Section, string[]>>;
  explorationMode?: "aligned" | "shortlist";
  discoveryMode?: import("../passport/evidence.ts").Familiarity;
  categoryModes?: Partial<
    Record<Section, import("../passport/evidence.ts").Familiarity>
  >;
  categoryTags?: Partial<Record<Section, string[]>>;
  queryPreferences?: Partial<
    Record<Section, import("../qloo/query-plan.ts").QueryPreferences>
  >;
  history?: { role: "user" | "agent"; text: string }[];
  /** Successful or failed model-selected MCP attempts in the active chat. */
  modelToolCalls?: number;
  providerHealth?: "unconfigured" | "configured" | "healthy" | "unavailable";
  recovery?: Section[];
  relaxed?: { section: Section; constraints: Constraint[] }[];
  pending?: {
    query: string;
    candidates: Candidate[];
    sections: Section[];
    constraints: Constraint[];
    strategy?: Intent["strategy"];
    rankMcp?: boolean;
    optional?: boolean;
    request?: string;
    exclude?: boolean;
    remainingConcepts?: string[];
    remainingExcludeConcepts?: string[];
    conceptSections?: Section[];
    activityGenres?: Intent["activityGenres"];
  };
}
/** Fully initialized canonical state; AgentState also accepts legacy bootstrap fixtures. */
export interface TastePassportSession extends AgentState {
  savedCards: Card[];
  activeCategories: Section[];
  hiddenCategories: Section[];
  preferences: Partial<Record<Section, string[]>>;
  explorationMode: "aligned" | "shortlist";
  discoveryMode: import("../passport/evidence.ts").Familiarity;
  categoryConcepts: Partial<Record<Section, string[]>>;
  categoryModes: Partial<
    Record<Section, import("../passport/evidence.ts").Familiarity>
  >;
  categoryTags: Partial<Record<Section, string[]>>;
  history: { role: "user" | "agent"; text: string }[];
  modelToolCalls: number;
  providerHealth: "unconfigured" | "configured" | "healthy" | "unavailable";
  recovery: Section[];
  relaxed: { section: Section; constraints: Constraint[] }[];
}
export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}
export interface ToolChoice {
  name: string;
  arguments: Record<string, unknown>;
}
export interface ConversationContext {
  city: string;
  history?: {role: "user" | "agent"; text: string}[];
  tastes?: string[];
  lastSections?: Section[];
  activeRecommendations?: ConversationCardSummary[];
  categories?: {section: Section; preferences: Record<string, string | number>; constraints: Constraint[]; concepts: string[]; requirements: string[]; exclusions: string[]; resultCount: number}[];
}
export interface ModelProvider {
  explain?(facts: string[]): Promise<number[]>;
  interpret(text: string, context?: ConversationContext): Promise<Intent>;
  baseline?(
    destination: string,
    tastes: string[],
    request: string,
  ): Promise<{
    text: string;
    model: string;
    generatedAt: string;
    source: "model-only";
    request: string;
  }>;
  chooseWithObservation?(
    text: string,
    state: AgentState,
    tools: ToolDefinition[],
    execute: (choice: ToolChoice) => Promise<ToolResult>,
    signal?: AbortSignal,
    remainingCalls?: number,
    onCall?: (choice: ToolChoice) => void,
  ): Promise<import("./tool-loop.ts").ObservedChoices>;
  choose(
    text: string,
    state: AgentState,
    tools: ToolDefinition[],
  ): Promise<ToolChoice[]>;
}
export interface ToolResult {
  operation?: string;
  status: string;
  results?: unknown;
  error?: unknown;
  execution?: { transport?: string };
}
export interface AgentInput {
  discovery?: {
    section: Section;
    preferences: import("../qloo/query-plan.ts").QueryPreferences;
  };
  reset?: "conversation";
  familiarity?: {
    mode: import("../passport/evidence.ts").Familiarity;
    section: Section;
  };
  guided?: { section: Section; constraints: Constraint[] };
  recovery?: {
    section: Section;
    action: "keep-concept" | "relax-quiet" | "allow-popular" | "closest";
  };
  message?: string;
  feedback?: {
    id: string;
    accepted: boolean;
    reason?: Reason;
    detail?: string;
    clear?: boolean;
  };
  tagChoice?: string;
}
export interface AgentReply {
  state: TastePassportSession;
  changed: Section[];
  events: AgentEvent[];
  message: string;
  mode: "deterministic" | "model-mcp";
}
