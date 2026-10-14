import {
  providerHealth,
  conciergeUnavailable,
} from "../../../../src/agent/health";
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
      health: providerHealth(enabled),
      refinement: true,
      notice: enabled
        ? "Taste Concierge is ready to try."
        : conciergeUnavailable,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
