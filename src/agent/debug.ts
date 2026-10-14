/** Metadata-only logging: never accept requests, arguments, responses, headers or errors. */
export function debugEvent(event: "gemini.request" | "gemini.tool_selected" | "gemini.result" | "gemini.failed" | "qloo.invoked" | "qloo.result" | "qloo.failed", meta: { trace?: string; operation?: "interpret" | "choose" | "baseline"; tool?: string; transport?: "exec" | "mcp"; count?: number; status?: number }) {
  if (process.env.AGENT_DEBUG !== "1") return;
  const tool = ["interpret_cultural_intent", "qloo_find_tags", "qloo_rank"].includes(meta.tool ?? "") ? meta.tool : undefined;
  console.info(JSON.stringify({ event, trace: meta.trace && /^[a-f0-9-]{36}$/.test(meta.trace) ? meta.trace : undefined, operation: ["interpret", "choose", "baseline"].includes(meta.operation ?? "") ? meta.operation : undefined, tool, transport: ["exec", "mcp"].includes(meta.transport ?? "") ? meta.transport : undefined, count: Number.isSafeInteger(meta.count) && meta.count! >= 0 ? meta.count : undefined, status: Number.isInteger(meta.status) && meta.status! >= 400 && meta.status! <= 599 ? meta.status : undefined }));
}
