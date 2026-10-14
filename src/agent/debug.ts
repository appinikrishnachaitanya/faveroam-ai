import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

const context = new AsyncLocalStorage<string>();
const sections = ["Eat", "Coffee", "Music", "Culture", "Lifestyle"];
const routes = ["resolve", "agent.resolve", "agent.interpret", "passport", "agent.turn", "agent.session", "agent.comparison"] as const;
type DebugEvent =
  | "gemini.request" | "gemini.tool_selected" | "gemini.result" | "gemini.failed"
  | "qloo.invoked" | "qloo.result" | "qloo.failed" | "qloo.request" | "qloo.response"
  | "qloo.cache_hit" | "qloo.retry" | "qloo.entities"
  | "api.started" | "api.completed" | "api.failed"
  | "resolution.started" | "resolution.candidates" | "resolution.completed"
  | "passport.started" | "passport.pool" | "passport.completed"
  | "discovery.started" | "discovery.pool" | "discovery.completed" | "discovery.failed"
  | "agent.started" | "agent.intent" | "agent.completed" | "agent.fallback"
  | "feedback.recorded" | "session.reset";
interface DebugMeta {
  trace?: string;
  operation?: "interpret" | "choose" | "baseline";
  tool?: string;
  transport?: "exec" | "mcp";
  count?: number;
  status?: number;
  route?: typeof routes[number];
  endpoint?: "search" | "insights";
  city?: string;
  section?: string;
  sections?: string[];
  mode?: string;
  kind?: string;
  pool?: string;
  action?: string;
  signalCount?: number;
  excludedCount?: number;
  keptCount?: number;
  seedIndex?: number;
  elapsedMs?: number;
  attempt?: number;
  delayMs?: number;
}
/** Strict metadata allowlist. Never log bodies, cache keys, tokens, arguments or errors. */
export function debugEvent(event: DebugEvent, meta: DebugMeta = {}) {
  if (process.env.AGENT_DEBUG !== "1") return;
  const allowed = (value: unknown, values: readonly string[]) => typeof value === "string" && values.includes(value) ? value : undefined;
  const number = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  console.info(JSON.stringify({
    event, requestTrace: context.getStore(),
    trace: meta.trace && /^[a-f0-9-]{36}$/.test(meta.trace) ? meta.trace : undefined,
    operation: allowed(meta.operation, ["interpret", "choose", "baseline"]),
    tool: allowed(meta.tool, ["interpret_cultural_intent", "qloo_find_tags", "qloo_rank"]),
    transport: allowed(meta.transport, ["exec", "mcp"]),
    route: allowed(meta.route, routes), endpoint: allowed(meta.endpoint, ["search", "insights"]),
    city: allowed(meta.city, ["Toronto", "New York City", "London", "Paris", "Tokyo"]),
    section: allowed(meta.section, sections), sections: Array.isArray(meta.sections) ? meta.sections.filter(s => sections.includes(s)) : undefined,
    mode: allowed(meta.mode, ["familiar", "balanced", "explore", "deterministic", "model-mcp"]),
    kind: allowed(meta.kind, ["onboard", "refine", "hide", "unknown"]),
    pool: allowed(meta.pool, ["direct", "adjacent", "place", "artist"]),
    action: allowed(meta.action, ["conversation", "new-passport", "feedback", "accepted", "rejected", "cleared", "guided", "recovery", "familiarity", "tag-choice", "message"]),
    status: number(meta.status) !== undefined && meta.status! >= 100 && meta.status! <= 599 ? meta.status : undefined,
    count: number(meta.count), signalCount: number(meta.signalCount), excludedCount: number(meta.excludedCount),
    keptCount: number(meta.keptCount), seedIndex: number(meta.seedIndex), elapsedMs: number(meta.elapsedMs),
    attempt: number(meta.attempt), delayMs: number(meta.delayMs),
  }));
}
/** Correlate all async backend operations without logging or exposing the session token. */
export function debugRequest(route: typeof routes[number], run: () => Promise<Response>): Promise<Response> {
  return context.run(randomUUID(), async () => {
    const started = Date.now();
    debugEvent("api.started", { route });
    try {
      const response = await run();
      debugEvent(response.ok ? "api.completed" : "api.failed", { route, status: response.status, elapsedMs: Date.now() - started });
      return response;
    } catch (error) {
      debugEvent("api.failed", { route, elapsedMs: Date.now() - started });
      throw error;
    }
  });
}
