import { getSession } from "../../../../src/agent/store";
import { configuredProvider } from "../../../../src/agent/provider";
export const runtime = "nodejs";
const cache = new Map<string, { at: number; baseline: unknown }>();
const running = new Set<string>();
export async function POST(request: Request) {
  let id = "",
    acquired = false;
  try {
    const raw = await request.text();
    if (raw.length > 200) throw Error();
    const body = JSON.parse(raw);
    if (typeof body.sessionId !== "string") throw Error();
    id = body.sessionId;
    const state = getSession(id);
    const provider = configuredProvider();
    if (!provider?.baseline)
      return Response.json(
        { error: "Comparison unavailable." },
        { status: 503 },
      );
    const cached = cache.get(id);
    if (cached && Date.now() - cached.at < 120000)
      return Response.json(
        { baseline: cached.baseline },
        { headers: { "Cache-Control": "no-store" } },
      );
    if (running.has(id))
      return Response.json(
        { error: "Comparison already in progress." },
        { status: 429 },
      );
    running.add(id);
    acquired = true;
    const baseline = await provider.baseline(
      state.city,
      state.selected.map((s) => s.name),
    );
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(id, { at: Date.now(), baseline });
    return Response.json(
      { baseline },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Comparison unavailable." }, { status: 503 });
  } finally {
    if (acquired) running.delete(id);
  }
}
