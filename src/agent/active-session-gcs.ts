import "server-only";
import { Storage } from "@google-cloud/storage";
import type { File } from "@google-cloud/storage";
import type { AgentState } from "./types.ts";
import { compactActiveSession, MAX_ACTIVE_SESSION_BYTES, parseActiveSession, validSessionId } from "./session-lifetime.ts";
import { debugEvent } from "./debug.ts";

const storage = new Storage();

export function gcsSessionConfigured() {
  return Boolean(process.env.GCP_STORAGE_BUCKET?.trim());
}

function sessionObject(id: string) {
  if (!validSessionId(id)) throw Error("Invalid Passport session.");
  const bucket = process.env.GCP_STORAGE_BUCKET?.trim();
  if (!bucket) throw Error("Passport storage is not configured.");
  return storage.bucket(bucket).file(`sessions/${id}.json`);
}

function isMissing(error: unknown) {
  return (error as { code?: number })?.code === 404;
}

function isConflict(error: unknown) {
  return (error as { code?: number })?.code === 412;
}

/** GCS generation preconditions are a cross-instance compare-and-swap. */
export async function readGcsSession(id: string, object: File = sessionObject(id)): Promise<{ state: AgentState; generation: number } | undefined> {
  debugEvent("service.invoked", { service: "cloud-storage" });
  try {
    const [metadata] = await object.getMetadata();
    const generation = Number(metadata.generation);
    if (!Number.isSafeInteger(generation)) throw Error("Invalid storage generation.");
    const [data] = await object.bucket.file(object.name, { generation }).download();
    const state = parseActiveSession(JSON.parse(data.toString("utf8")), id);
    if (!state) return;
    debugEvent("service.response", { service: "cloud-storage", status: 200 });
    return { state, generation };
  } catch (error) {
    if (isMissing(error)) return;
    debugEvent("service.failed", { service: "cloud-storage" });
    throw error;
  }
}

export async function writeGcsSession(state: AgentState, expectedRevision?: number, object: File = sessionObject(state.id)): Promise<boolean> {
  const stored = compactActiveSession(state);
  const data = JSON.stringify(stored);
  if (Buffer.byteLength(data, "utf8") > MAX_ACTIVE_SESSION_BYTES) return false;
  const current = await readGcsSession(state.id, object);
  if (expectedRevision !== undefined && current?.state.revision !== expectedRevision)
    throw Error("Passport changed. Use the latest state.");
  if (expectedRevision === undefined && current)
    throw Error("Passport changed. Use the latest state.");
  try {
    debugEvent("service.invoked", { service: "cloud-storage" });
    await object.save(data, {
      contentType: "application/json",
      resumable: false,
      preconditionOpts: { ifGenerationMatch: current?.generation ?? 0 },
    });
    debugEvent("service.response", { service: "cloud-storage", status: 200 });
    return true;
  } catch (error) {
    if (isConflict(error)) throw Error("Passport changed. Use the latest state.");
    debugEvent("service.failed", { service: "cloud-storage" });
    throw error;
  }
}

export async function deleteGcsSession(id: string): Promise<void> {
  try { await sessionObject(id).delete(); }
  catch (error) { if (!isMissing(error)) throw error; }
}
