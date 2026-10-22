import "server-only";
import type { AgentState } from "./types.ts";
import { deleteGcsSession, gcsSessionConfigured, readGcsSession, writeGcsSession } from "./active-session-gcs.ts";

function report(stage: "read" | "write" | "remove") {
  // Never log session identifiers, preferences, object paths or provider errors.
  console.error(JSON.stringify({ event: "session.persistence.failed", stage }));
}

export async function loadActiveSession(id: string): Promise<AgentState | undefined> {
  if (!gcsSessionConfigured()) return;
  try { return (await readGcsSession(id))?.state; }
  catch { report("read"); throw Error("Passport storage is temporarily unavailable."); }
}

/** A generation precondition rejects concurrent edits across Cloud Run replicas. */
export async function persistActiveSession(state: AgentState, expectedRevision?: number): Promise<boolean> {
  if (!gcsSessionConfigured()) return false;
  try { return await writeGcsSession(state, expectedRevision); }
  catch (error) {
    if (error instanceof Error && error.message === "Passport changed. Use the latest state.") throw error;
    report("write");
    return false;
  }
}

export async function removeActiveSession(id: string): Promise<void> {
  if (!gcsSessionConfigured()) return;
  try { await deleteGcsSession(id); }
  catch { report("remove"); }
}
