import { NextResponse } from "next/server";
import { configuredProvider } from "../../../../src/agent/provider";
export async function GET() {
  let enabled = false;
  try {
    enabled = Boolean(configuredProvider());
  } catch {}
  return NextResponse.json(
    {
      mode: enabled ? "model-mcp" : "deterministic",
      refinement: true,
      notice: enabled
        ? "Model-driven tool selection configured."
        : "Optional model provider not configured. Deterministic cultural refinement remains available.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
