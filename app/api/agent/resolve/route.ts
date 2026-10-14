import { NextResponse } from "next/server";
import { resolveCulturalSeeds } from "../../../../src/agent/runtime";
import { seal } from "../../../../src/passport/service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 3000) throw Error("Input is too long.");
    const b = JSON.parse(raw);
    if (
      !Array.isArray(b.seeds) ||
      b.seeds.length < 3 ||
      b.seeds.length > 5 ||
      b.seeds.some(
        (s: unknown) => typeof s !== "string" || !s.trim() || s.length > 100,
      ) ||
      new Set(b.seeds.map((s: string) => s.trim().toLowerCase())).size !==
        b.seeds.length
    )
      throw Error("Enter three to five different cultural tastes.");
    const items = await resolveCulturalSeeds(
      b.seeds.map((s: string) => s.trim()),
      Array.isArray(b.concepts)
        ? b.concepts.filter(
            (c: unknown) => typeof c === "string" && b.seeds.includes(c),
          )
        : [],
    );
    return NextResponse.json(
      { items, token: seal(items) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not resolve the cultural inputs. Use three to five named tastes or cuisine concepts, without personal identifying information, and retry when Qloo is available.",
      },
      { status: 502 },
    );
  }
}
