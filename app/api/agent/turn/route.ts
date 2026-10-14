import { inSession } from "../../../../src/agent/store";
import { runTurn } from "../../../../src/agent/orchestrator";
import { agentDependencies } from "../../../../src/agent/runtime";
import { reasons } from "../../../../src/agent/types";
import type { AgentInput } from "../../../../src/agent/types";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 4000) throw Error();
    body = JSON.parse(raw);
    if (
      typeof body.sessionId !== "string" ||
      !Number.isInteger(body.revision) ||
      typeof body.input !== "object" ||
      !body.input
    )
      throw Error();
    const input = body.input as AgentInput;
    if (
      input.message !== undefined &&
      (typeof input.message !== "string" || input.message.length > 1000)
    )
      throw Error();
    if (
      input.feedback?.clear !== undefined &&
      typeof input.feedback.clear !== "boolean"
    )
      throw Error();
    if (
      input.feedback &&
      (typeof input.feedback.id !== "string" ||
        typeof input.feedback.accepted !== "boolean" ||
        (!input.feedback.accepted && !reasons.includes(input.feedback.reason!)))
    )
      throw Error();
    if (input.tagChoice !== undefined && typeof input.tagChoice !== "string")
      throw Error();
  } catch {
    return Response.json(
      { error: "Invalid refinement request." },
      { status: 400 },
    );
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (value: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
        } catch {}
      };
      try {
        const reply = await inSession(
          body.sessionId as string,
          body.revision as number,
          async (state) => {
            const value = await runTurn(
              state,
              body.input as AgentInput,
              agentDependencies(),
              (event) => send({ type: "activity", event }),
            );
            return { state: value.state, value };
          },
        );
        send({ type: "result", reply });
      } catch {
        send({
          type: "error",
          message:
            "Agentic refinement is temporarily unavailable or the session changed. Your existing passport is still available. Rebuild it if the session expired.",
        });
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
