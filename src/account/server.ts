import "server-only";
import { gcsSessionConfigured } from "../agent/active-session-gcs.ts";
export { sameOrigin, requestOrigin } from "./policy.ts";

export function storageConfigured() { return gcsSessionConfigured(); }

export function privateJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
