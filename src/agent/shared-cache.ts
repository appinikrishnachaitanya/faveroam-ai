import "server-only";
import { createHash } from "node:crypto";
import { Storage } from "@google-cloud/storage";

const storage = new Storage();
const TTL_MS = 120_000;

function objectFor(key: string) {
  const bucket = process.env.GCP_STORAGE_BUCKET?.trim();
  if (!bucket) return;
  const digest = createHash("sha256").update(key).digest("hex");
  return storage.bucket(bucket).file(`cache/comparison/${digest}.json`);
}

/** Short-lived, private cross-replica cache. Never store an API key in its path. */
export async function readComparisonCache(key: string): Promise<{ baseline: unknown; comparison: unknown } | undefined> {
  const object = objectFor(key);
  if (!object) return;
  try {
    const [data] = await object.download();
    const value: unknown = JSON.parse(data.toString("utf8"));
    if (!value || typeof value !== "object") return;
    const row = value as { expires?: unknown; baseline?: unknown; comparison?: unknown };
    if (typeof row.expires !== "number" || row.expires <= Date.now() || !row.comparison) return;
    return { baseline: row.baseline, comparison: row.comparison };
  } catch { return; }
}

export async function writeComparisonCache(key: string, baseline: unknown, comparison: unknown): Promise<void> {
  const object = objectFor(key);
  if (!object) return;
  const value = JSON.stringify({ expires: Date.now() + TTL_MS, baseline, comparison });
  if (Buffer.byteLength(value, "utf8") > 256_000) return;
  try { await object.save(value, { contentType: "application/json", resumable: false }); }
  catch { /* Cache failure must not fail the user's answer. */ }
}
