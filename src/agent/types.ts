import type { Candidate, Card, Section } from "../passport/model.ts";
export type Constraint =
  "touristy" | "crowded" | "mainstream" | "expensive" | "atmosphere";
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
export interface Intent {
  kind: "onboard" | "refine" | "hide" | "unknown";
  destination?: string;
  seeds: string[];
  concepts: string[];
  constraints: Constraint[];
  sections: Section[];
  strategy: "discover" | "rank" | "filter";
  hide?: Section[];
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
  cards: Card[];
  previous: Card[];
  feedback: FeedbackRecord[];
  intent?: Intent;
  notices: string[];
  pending?: {
    query: string;
    candidates: Candidate[];
    sections: Section[];
    constraints: Constraint[];
    strategy?: Intent["strategy"];
    rankMcp?: boolean;
  };
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
export interface ModelProvider {
  interpret(text: string): Promise<Intent>;
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
  state: AgentState;
  changed: Section[];
  events: AgentEvent[];
  message: string;
  mode: "deterministic" | "model-mcp";
}
