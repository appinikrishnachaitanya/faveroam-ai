import "server-only";
import { randomUUID } from "node:crypto";
import type { Candidate } from "../passport/model.ts";
import type { AgentState, Constraint } from "./types.ts";
import type { Passport } from "../workspace/state.ts";
const globalStore = globalThis as typeof globalThis & {
  tastePassportSessions?: Map<string, AgentState>;
  tastePassportLocks?: Set<string>;
};
const sessions = (globalStore.tastePassportSessions ??= new Map<
  string,
  AgentState
>());
const locks = (globalStore.tastePassportLocks ??= new Set<string>());
export function createSession(
  passport: Passport,
  constraints: Constraint[] = [],
): AgentState {
  for (const [id, s] of sessions)
    if (s.expires < Date.now()) sessions.delete(id);
  if (sessions.size >= 100) sessions.delete(sessions.keys().next().value!);
  const state: AgentState = {
    id: randomUUID(),
    revision: 0,
    expires: Date.now() + 30 * 60_000,
    city: passport.city,
    selected: passport.selected,
    tags: passport.selected.filter((s: Candidate) =>
      s.id.startsWith("urn:tag:"),
    ),
    constraints,
    categoryConstraints: {},
    cards: passport.cards,
    previous: [],
    feedback: [],
    notices: passport.notices,
  };
  sessions.set(state.id, state);
  return state;
}
export function getSession(id: string): AgentState {
  const state = sessions.get(id);
  if (!state || state.expires < Date.now())
    throw Error(
      "Your refinement session expired. Build a passport again; your taste draft remains available.",
    );
  return state;
}
export async function inSession<T>(
  id: string,
  revision: number,
  run: (state: AgentState) => Promise<{ state: AgentState; value: T }>,
): Promise<T> {
  const state = getSession(id);
  if (locks.has(id)) throw Error("A refinement is already in progress.");
  if (state.revision !== revision)
    throw Error("Passport changed. Use the latest state.");
  locks.add(id);
  try {
    const next = await run(state);
    next.state.revision = revision + 1;
    next.state.expires = Date.now() + 30 * 60_000;
    sessions.set(id, next.state);
    return next.value;
  } finally {
    locks.delete(id);
  }
}
