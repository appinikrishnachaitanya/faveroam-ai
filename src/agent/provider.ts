import "server-only";
import { culturalText, validateIntent } from "./intent.ts";
import { isObject } from "../qloo/types.ts";
import type {
  AgentState,
  ModelProvider,
  ToolChoice,
  ToolDefinition,
} from "./types.ts";
/** OpenAI-compatible tool-calling provider, with no default model or endpoint.
 * Only an explicitly configured server endpoint receives the provider credential. */
export function configuredProvider(): ModelProvider | undefined {
  const key = process.env.AGENT_MODEL_API_KEY,
    base = process.env.AGENT_MODEL_BASE_URL,
    model = process.env.AGENT_MODEL_NAME;
  if (!key || !base || !model) return;
  const url = new URL(base);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw Error("Invalid provider configuration");
  async function complete(
    messages: unknown[],
    tools: unknown[],
    required = true,
  ): Promise<ToolChoice[]> {
    let r: Response;
    try {
      r = await fetch(`${base!.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: required ? "required" : "auto",
        }),
        redirect: "error",
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw Error("Model provider unavailable");
    }
    if (!r.ok) throw Error("Model provider unavailable");
    const data = await r.json();
    const calls =
      data?.choices?.[0]?.message?.tool_calls ?? (required ? undefined : []);
    if (!Array.isArray(calls) || calls.length > 3)
      throw Error("Invalid provider tool selection");
    return calls.map((c) => {
      if (
        !isObject(c) ||
        !isObject(c.function) ||
        typeof c.function.name !== "string" ||
        typeof c.function.arguments !== "string"
      )
        throw Error("Invalid provider tool call");
      const args = JSON.parse(c.function.arguments);
      if (!isObject(args)) throw Error("Invalid tool arguments");
      return { name: c.function.name, arguments: args };
    });
  }
  return {
    async interpret(text) {
      culturalText(text);
      const calls = await complete(
        [
          {
            role: "system",
            content:
              "Extract cultural onboarding/refinement intent only. Do not generate discovery data. Destination must be New York City, London, Paris or Tokyo. Separate named seeds from cultural concepts and dislikes. Do not include personal identifying information.",
          },
          { role: "user", content: text },
        ],
        [
          {
            type: "function",
            function: {
              name: "interpret_cultural_intent",
              parameters: {
                type: "object",
                properties: {
                  kind: {
                    type: "string",
                    enum: ["onboard", "refine", "hide", "unknown"],
                  },
                  destination: { type: "string" },
                  seeds: { type: "array", items: { type: "string" } },
                  concepts: { type: "array", items: { type: "string" } },
                  constraints: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: [
                        "touristy",
                        "crowded",
                        "mainstream",
                        "expensive",
                        "atmosphere",
                      ],
                    },
                  },
                  sections: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["Eat", "Coffee", "Music", "Culture", "Lifestyle"],
                    },
                  },
                  hide: {type:"array",items:{type:"string",enum:["Eat","Coffee","Music","Culture","Lifestyle"]}},
                  strategy: {
                    type: "string",
                    enum: ["discover", "rank", "filter"],
                  },
                },
                required: [
                  "kind",
                  "seeds",
                  "concepts",
                  "constraints",
                  "sections",
                  "strategy",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
      );
      if (calls.length !== 1 || calls[0].name !== "interpret_cultural_intent")
        throw Error("Invalid interpretation");
      return validateIntent(calls[0].arguments);
    },
    async choose(text: string, state: AgentState, tools: ToolDefinition[]) {
      culturalText(text);
      return complete(
        [
          {
            role: "system",
            content:
              "Select the smallest useful Qloo workflow. Use qloo_find_tags for concepts, qloo_rank for shortlist ranking. Never invent IDs, recommendations or metadata. No more than two calls. Return no tool call when a known deterministic discovery query is sufficient. Do not send personal data. All tools are read-only cultural operations.",
          },
          {
            role: "user",
            content: JSON.stringify({
              request: text,
              destination: state.city,
              tastes: state.selected.map((s) => ({
                name: s.name,
                type: s.types,
              })),
              intent: state.intent,
              shortlist: state.cards
                .slice(0, 40)
                .map((c) => ({ id: c.id, name: c.name, section: c.section })),
              accepted: state.cards
                .filter((c) =>
                  state.feedback.some((f) => f.id === c.id && f.accepted),
                )
                .map((c) => ({ name: c.name, section: c.section })),
            }),
          },
        ],
        tools.map((t) => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: t.inputSchema,
          },
        })),
        false,
      );
    },
  };
}
