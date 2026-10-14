import { debugRequest, debugEvent } from "../../../../src/agent/debug";
import { discardSession } from "../../../../src/agent/store";
export const runtime = "nodejs";
async function handleDELETE(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 200) throw Error();
    const body = JSON.parse(raw);
    if (typeof body.sessionId !== "string") throw Error();
    discardSession(body.sessionId);
    debugEvent("session.reset", { action: "new-passport" });
    return Response.json(
      { cleared: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Could not clear session." },
      { status: 400 },
    );
  }
}

export function DELETE(request: Request) {
  return debugRequest("agent.session", () => handleDELETE(request));
}
