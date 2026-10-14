import { NextResponse } from "next/server";
import { cities, passport } from "../../../src/passport/service.ts";
import { createSession } from "../../../src/agent/store.ts";
import type { Constraint } from "../../../src/agent/types.ts";
import { QlooError } from "../../../src/qloo/client.ts";
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 30000) throw new QlooError("Input is too long.", 400);
    const b = JSON.parse(raw);
    if (
      !cities.includes(b.city) ||
      typeof b.token !== "string" ||
      !Array.isArray(b.ids) ||
      b.ids.length < 3 ||
      b.ids.length > 5 ||
      b.ids.some((id: unknown) => typeof id !== "string")
    )
      throw new QlooError(
        "Choose a supported destination and confirm three to five tastes.",
        400,
      );
    const constraints: Constraint[] = Array.isArray(b.constraints)
      ? b.constraints.filter((c: unknown) =>
          [
            "touristy",
            "crowded",
            "mainstream",
            "expensive",
            "atmosphere",
          ].includes(String(c)),
        )
      : [];
    const result = await passport(b.city, b.token, b.ids, constraints);
    const state = createSession(result, constraints);
    return NextResponse.json(
      {
        ...result,
        agent: {
          sessionId: state.id,
          revision: state.revision,
          tags: state.tags,
          constraints: state.constraints,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof QlooError
            ? e.message
            : "Could not build your passport. Resolve your tastes and try again.",
      },
      { status: e instanceof QlooError && e.status === 400 ? 400 : 502 },
    );
  }
}
