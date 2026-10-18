import { debugRequest } from "../../../src/agent/debug";
import { NextResponse } from "next/server";
import { passport } from "../../../src/passport/service.ts";
import { createSession } from "../../../src/agent/store.ts";
import type { Constraint } from "../../../src/agent/types.ts";
import { QlooError } from "../../../src/qloo/client.ts";
import { validDestination } from "../../../src/workspace/location";
import { catalogCity } from "../../../src/workspace/destinations";
import { sectionTypes, type Section } from "../../../src/passport/model";
async function handlePOST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 30000) throw new QlooError("Input is too long.", 400);
    const b = JSON.parse(raw);
    const city = await catalogCity(b.city);
    if (
      !validDestination(b.city) || !city ||
      typeof b.token !== "string" ||
      !Array.isArray(b.ids) ||
      b.ids.length < 3 ||
      b.ids.length > 5 ||
      b.ids.some((id: unknown) => typeof id !== "string")
    )
      throw new QlooError(
        "Choose an available destination and confirm three to five tastes.",
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
    if (b.activities !== undefined && (!Array.isArray(b.activities) || b.activities.length > 5 || b.activities.some((s: unknown)=>typeof s !== "string" || !Object.hasOwn(sectionTypes,s))))
      throw new QlooError("Choose up to five supported activities.",400);
    if (b.mode !== undefined && !["familiar", "balanced", "explore"].includes(b.mode))
      throw new QlooError("Choose a supported discovery style.", 400);
    const result = await passport(city!, b.token, b.ids, constraints, b.activities as Section[] | undefined, b.mode);
    const state = createSession(result, constraints);
    state.activeCategories = result.requestedActivities;
    state.discoveryMode = b.mode ?? "familiar";
    if (Array.isArray(b.history))
      state.history = b.history
        .filter(
          (m: { role?: string; text?: unknown }) =>
            ["user", "agent"].includes(m?.role ?? "") &&
            typeof m.text === "string" &&
            m.text.length <= 1200,
        )
        .slice(-30);
    return NextResponse.json(
      {
        ...result,
        session: state,
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

export function POST(request: Request) {
  return debugRequest("passport", () => handlePOST(request));
}
