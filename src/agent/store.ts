import "server-only";
import { debugEvent } from "./debug.ts";
import { normalizeSession, clearPassport } from "./session.ts";
import { randomUUID } from "node:crypto";
import type { Candidate } from "../passport/model.ts";
import type { AgentState, Constraint, TastePassportSession } from "./types.ts";
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
): TastePassportSession {
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
  const session = normalizeSession(state);
  sessions.set(state.id, session);
  debugEvent("session.created", { count: sessions.size });
  return session;
}
export function getSession(id: string): AgentState {
  const state = sessions.get(id);
  if (!state || state.expires < Date.now()) {
    debugEvent("session.expired");
    throw Error(
      "Your refinement session expired. Build a passport again; your taste draft remains available.",
    );
  }
  return state;
}
export async function inSession<T>(
  id: string,
  revision: number,
  run: (state: AgentState) => Promise<{ state: AgentState; value: T }>,
  signal?: AbortSignal,
): Promise<T> {
  const state = getSession(id);
  if (locks.has(id)) throw Error("A refinement is already in progress.");
  if (state.revision !== revision)
    throw Error("Passport changed. Use the latest state.");
  locks.add(id);
  try {
    let abort: (() => void) | undefined;
    const next = await (signal
      ? Promise.race([
          run(state),
          new Promise<never>((_, reject) => {
            abort = () =>
              reject(
                Error(
                  "Refinement cancelled or timed out. Your discoveries are preserved.",
                ),
              );
            if (signal.aborted) abort();
            else signal.addEventListener("abort", abort, { once: true });
          }),
        ]).finally(() => {
          if (abort) signal.removeEventListener("abort", abort);
        })
      : run(state));
    signal?.throwIfAborted();
    next.state.revision = revision + 1;
    next.state.expires = Date.now() + 30 * 60_000;
    if (!sessions.has(id)) throw Error("Passport was reset.");
    sessions.set(id, next.state);
    debugEvent("session.updated", { count: next.state.cards.length });
    return next.value;
  } finally {
    locks.delete(id);
  }
}

export function discardSession(id: string) {
  const old = sessions.get(id);
  if (old) clearPassport(old);
  sessions.delete(id);
}

/** Rehydrate trusted account data with a fresh, bounded guest-session token. */
export function registerRestoredSession(state: TastePassportSession) {
  for (const [id, s] of sessions)
    if (s.expires < Date.now()) sessions.delete(id);
  if (sessions.size >= 100) sessions.delete(sessions.keys().next().value!);
  sessions.set(state.id, state);
}
