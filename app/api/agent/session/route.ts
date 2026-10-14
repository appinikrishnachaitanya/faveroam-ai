import { discardSession } from "../../../../src/agent/store";
export const runtime = "nodejs";
export async function DELETE(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 200) throw Error();
    const body = JSON.parse(raw);
    if (typeof body.sessionId !== "string") throw Error();
    discardSession(body.sessionId);
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
