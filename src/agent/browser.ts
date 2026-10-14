import type { AgentInput, AgentEvent, AgentReply } from "./types.ts";
import type { AgentSession } from "../workspace/state.ts";
export async function sendAgentTurn(
  session: AgentSession,
  input: AgentInput,
  onEvent: (event: AgentEvent) => void,
): Promise<AgentReply> {
  const response = await fetch("/api/agent/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: session.sessionId,
      revision: session.revision,
      input,
    }),
  });
  if (!response.ok || !response.body)
    throw Error(
      "Refinement is unavailable. Your existing passport remains available.",
    );
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let buffer = "",
    reply: AgentReply | undefined;
  function line(text: string) {
    if (!text.trim()) return;
    const data = JSON.parse(text);
    if (data.type === "activity") onEvent(data.event);
    if (data.type === "result") reply = data.reply;
    if (data.type === "error") throw Error(data.message);
  }
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) {
        line(buffer.slice(0, index));
        buffer = buffer.slice(index + 1);
      }
    }
    buffer += decoder.decode();
    if (buffer) line(buffer);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (!reply)
    throw Error(
      "Refinement did not complete. Your passport has been preserved.",
    );
  return reply;
}
