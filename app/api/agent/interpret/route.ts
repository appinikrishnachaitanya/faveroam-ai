import { NextResponse } from "next/server";
import { configuredProvider } from "../../../../src/agent/provider";
import {
  culturalText,
  interpret,
  validateIntent,
} from "../../../../src/agent/intent";
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 2000) throw Error("Input is too long");
    const b = JSON.parse(raw);
    if (typeof b.message !== "string") throw Error("Invalid input");
    culturalText(b.message);
    let provider;
    try {
      provider = configuredProvider();
    } catch {}
    if (provider)
      try {
        return NextResponse.json(
          {
            intent: validateIntent(await provider.interpret(b.message)),
            mode: "model-mcp",
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch {}
    return NextResponse.json(
      {
        intent: interpret(b.message, b.city),
        mode: "deterministic",
        notice:
          "Model-driven conversation is unavailable. Supported deterministic interpretation is active.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Share cultural tastes only, without identifying or contact information.",
      },
      { status: 400 },
    );
  }
}
