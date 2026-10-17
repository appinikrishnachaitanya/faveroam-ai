import "server-only";
import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { debugEvent } from "./debug.ts";
import { recordProviderHealth } from "./health.ts";
import { culturalText, validateIntent } from "./intent.ts";
import { isObject } from "../qloo/types.ts";
import type {
  AgentState,
  ModelProvider,
  ToolChoice,
  ToolDefinition,
} from "./types.ts";
/** Native Gemini takes precedence; compatible providers remain explicitly configurable. */
export function configuredProvider(): ModelProvider | undefined {
  const native = Boolean(process.env.GEMINI_API_KEY?.trim());
  const key = native
      ? process.env.GEMINI_API_KEY
      : process.env.AGENT_MODEL_API_KEY,
    base = process.env.AGENT_MODEL_BASE_URL,
    model = native
      ? process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash"
      : process.env.AGENT_MODEL_NAME;
  if (!key || !model || (!native && !base)) return;
  const gemini = native
    ? new GoogleGenAI({
        apiKey: key,
        httpOptions: { timeout: 20_000, retryOptions: { attempts: 1 } },
      })
    : undefined;
  const url = new URL(
    native ? "https://generativelanguage.googleapis.com" : base!,
  );
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw Error("Invalid provider configuration");
  async function complete(
    messages: { role: string; content: string }[],
    tools: {
      type: string;
      function: {
        name: string;
        description?: string;
        parameters: Record<string, unknown>;
      };
    }[],
    required = true,
  ): Promise<ToolChoice[]> {
    if (gemini) {
      const trace = crypto.randomUUID();
      debugEvent("gemini.request", {
        trace,
        operation:
          tools[0]?.function.name === "explain_qloo_evidence"
            ? "explain"
            : required
              ? "interpret"
              : "choose",
      });
      try {
        const response = await gemini.models.generateContent({
          model: model!,
          contents: messages
            .filter((m) => m.role !== "system")
            .map((m) => ({ role: "user", parts: [{ text: m.content }] })),
          config: {
            systemInstruction: messages.find((m) => m.role === "system")
              ?.content,
            tools: [
              {
                functionDeclarations: tools.map((t) => ({
                  name: t.function.name,
                  description: t.function.description,
                  parametersJsonSchema: t.function.parameters,
                })),
              },
            ],
            toolConfig: {
              functionCallingConfig: {
                mode: required
                  ? FunctionCallingConfigMode.ANY
                  : FunctionCallingConfigMode.AUTO,
              },
            },
          },
        });
        const calls = response.functionCalls ?? [];
        if (calls.length > 3 || (required && !calls.length))
          throw Error("Invalid provider tool selection");
        const choices = calls.map((c) => {
          if (
            !c.name ||
            !tools.some((t) => t.function.name === c.name) ||
            !isObject(c.args)
          )
            throw Error("Invalid provider tool call");
          debugEvent("gemini.tool_selected", { trace, tool: c.name });
          return { name: c.name, arguments: c.args };
        });
        debugEvent("gemini.result", { trace, count: choices.length });
        recordProviderHealth("healthy");
        return choices;
      } catch (error) {
        debugEvent("gemini.failed", { trace, status: safeStatus(error) });
        recordProviderHealth("unavailable");
        throw Error("Model provider unavailable");
      }
    }
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
      recordProviderHealth("unavailable");
      throw Error("Model provider unavailable");
    }
    if (!r.ok) {
      recordProviderHealth("unavailable");
      throw Error("Model provider unavailable");
    }
    const data = await r.json();
    recordProviderHealth("healthy");
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
    async explain(facts) {
      const calls = await complete(
        [
          {
            role: "system",
            content:
              "Select up to five useful facts to explain this recommendation. Return only indices from the supplied Qloo facts. Do not invent or change metrics, names, causal claims or recommendations.",
          },
          { role: "user", content: JSON.stringify(facts) },
        ],
        [
          {
            type: "function",
            function: {
              name: "explain_qloo_evidence",
              parameters: {
                type: "object",
                properties: {
                  indices: { type: "array", items: { type: "integer" } },
                },
                required: ["indices"],
                additionalProperties: false,
              },
            },
          },
        ],
      );
      const ids = calls[0]?.arguments.indices;
      if (
        calls.length !== 1 ||
        calls[0].name !== "explain_qloo_evidence" ||
        !Array.isArray(ids) ||
        ids.length > 5 ||
        ids.some(
          (i) =>
            !Number.isInteger(i) || Number(i) < 0 || Number(i) >= facts.length,
        )
      )
        throw Error("Invalid evidence selection.");
      return [...new Set(ids as number[])];
    },
    async baseline(destination, tastes, request) {
      for (const taste of tastes) culturalText(taste, 100);
      culturalText(request);
      if (gemini) {
        const trace = crypto.randomUUID();
        debugEvent("gemini.request", { trace, operation: "baseline" });
        try {
          const response = await gemini.models.generateContent({
            model: model!,
            contents: JSON.stringify({ request, destination, tastes }),
            config: {
              systemInstruction:
                "Produce a concise cultural onboarding suggestion using only model knowledge. No tools or Qloo data are available. Explicitly state details and local availability are unverified. Never claim Qloo evidence.",
            },
          });
          const text = response.text;
          if (
            !text?.trim() ||
            text.length > 8000 ||
            [process.env.QLOO_API_KEY, key].some(
              (secret) => secret && text.includes(secret),
            )
          )
            throw Error("Invalid baseline");
          recordProviderHealth("healthy");
          debugEvent("gemini.result", { trace, count: 1 });
          return {
            text: text.trim(),
            model: model!,
            generatedAt: new Date().toISOString(),
            source: "model-only" as const,
            request,
          };
        } catch (error) {
          debugEvent("gemini.failed", { trace, status: safeStatus(error) });
          recordProviderHealth("unavailable");
          throw Error("Comparison unavailable");
        }
      }
      let response: Response;
      try {
        response = await fetch(`${base!.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "Produce a concise cultural onboarding suggestion for a newcomer using only your own model knowledge. No tools or Qloo data are available. Describe familiar routines and adjacent cultural discoveries. Explicitly state that details and local availability are unverified. Do not claim access to Qloo or evidence.",
              },
              {
                role: "user",
                content: JSON.stringify({ request, destination, tastes }),
              },
            ],
          }),
          redirect: "error",
          signal: AbortSignal.timeout(20_000),
        });
      } catch {
        recordProviderHealth("unavailable");
        throw Error("Comparison unavailable");
      }
      if (!response.ok) {
        recordProviderHealth("unavailable");
        throw Error("Comparison unavailable");
      }
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (
        typeof text !== "string" ||
        !text.trim() ||
        text.length > 8000 ||
        [process.env.QLOO_API_KEY, key].some(
          (secret) => secret && text.includes(secret),
        )
      )
        throw Error("Invalid baseline");
      recordProviderHealth("healthy");
      return {
        text: text.trim(),
        model: model!,
        generatedAt: new Date().toISOString(),
        source: "model-only",
        request,
      };
    },
    async interpret(text, context) {
      culturalText(text);
      const calls = await complete(
        [
          {
            role: "system",
            content:
              (context
                ? `The user already has a confirmed Passport in ${context.city}. Interpret this as a refinement of that Passport, not onboarding. Do not replace confirmed tastes. A request for museums OR art galleries is one Culture request with alternative venue genres (tagOperator union), not an intersection. Negated restaurants must not select Eat. `
                : "") +
              "Extract cultural onboarding/refinement intent only. Do not generate discovery data. Destination must be Toronto, New York City, London, Paris or Tokyo. Separate named seeds from cultural concepts and dislikes. Cultural means Culture. More adventurous selects familiarity explore. More familiar selects familiarity familiar. Mixed hide/refine requests hide only explicitly removed categories and refine the requested active categories. Extract query preferences as a partial update: keep omitted preferences unchanged. Places use businessRatingMin, not ratingMin (Qloo film/TV rating). Price levels 1-4, popularity 0-1, business ratings 0-5. Trending uses goal trending; hidden gems uses goal hidden-gems; safe choices goal safe-bets; surprise goal surprise. Geography is a named locality, not a guaranteed point geocode. Never invent IDs or resolved tags. Concepts needing inclusion or exclusion must be resolved first. Do not include personal identifying information.",
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
                  query: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      goal: {
                        type: "string",
                        enum: [
                          "discover",
                          "trending",
                          "hidden-gems",
                          "safe-bets",
                          "surprise",
                        ],
                      },
                      priceMin: { type: "number" },
                      priceMax: { type: "number" },
                      businessRatingMin: { type: "number" },
                      popularityMin: { type: "number" },
                      popularityMax: { type: "number" },
                      locationQuery: { type: "string" },
                      radius: { type: "number" },
                      excludeLocation: { type: "string" },
                      tripAdvisorRatingMin: { type: "number" },
                      tripAdvisorReviewCountMin: { type: "number" },
                      qualityBias: {
                        type: "string",
                        enum: ["low", "medium", "high"],
                      },
                      trendBias: {
                        type: "string",
                        enum: ["low", "medium", "high"],
                      },
                      requiredExternalSources: {
                        type: "array",
                        items: {
                          type: "string",
                          enum: ["michelin", "resy", "tablet"],
                        },
                      },
                      tagOperator: {
                        type: "string",
                        enum: ["union", "intersection"],
                        description:
                          "Union for Indian or Thai, intersection for Indian and vegetarian. Resolve each concept; never invent IDs.",
                      },
                    },
                  },
                  excludeConcepts: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Cultural concepts to exclude, such as seafood. Raw names only; server resolves and user confirms IDs.",
                  },
                  kind: {
                    type: "string",
                    enum: ["onboard", "refine", "hide", "unknown"],
                  },
                  familiarity: {
                    type: "string",
                    enum: ["familiar", "balanced", "explore"],
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
                  hide: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: ["Eat", "Coffee", "Music", "Culture", "Lifestyle"],
                    },
                  },
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

function safeStatus(error: unknown): number | undefined {
  if (!isObject(error) || typeof error.status !== "number") return;
  return error.status >= 400 && error.status <= 599 ? error.status : undefined;
}
