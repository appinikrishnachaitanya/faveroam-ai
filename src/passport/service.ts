import "server-only";
import { withEvidence } from "./evidence.ts";
import { createHmac, timingSafeEqual } from "node:crypto";
import { culturalText } from "../agent/intent.ts";
import { validatedSection, validateDiscoveries } from "../agent/validation.ts";
import type { Constraint } from "../agent/types.ts";
import { search, insights, QlooError, insightParams } from "../qloo/client.ts";
import { candidates, classify, card } from "./model.ts";
import type { Candidate, Card } from "./model.ts";
export const cities = [
  "Toronto",
  "New York City",
  "London",
  "Paris",
  "Tokyo",
] as const;
function sign(payload: string) {
  const key = process.env.QLOO_API_KEY;
  if (!key) throw new QlooError("Qloo is not configured.");
  return createHmac("sha256", key).update(payload).digest("hex");
}
export function seal(items: { query: string; candidates: Candidate[] }[]) {
  const payload = Buffer.from(
    JSON.stringify({ items, expires: Date.now() + 20 * 60_000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export function unseal(
  token: string,
): { query: string; candidates: Candidate[] }[] {
  const [payload, signature] = token.split(".");
  const expected = sign(payload ?? "");
  if (
    !signature ||
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    throw new QlooError(
      "Taste confirmation expired or invalid. Resolve again.",
      400,
    );
  const value = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (value.expires < Date.now())
    throw new QlooError("Taste confirmation expired. Resolve again.", 400);
  return value.items;
}
export async function resolve(queries: string[]) {
  const items = [];
  for (const query of queries) {
    culturalText(query, 100);
    try {
      items.push({ query, candidates: candidates(await search(query)) });
    } catch (e) {
      if (e instanceof QlooError && e.status === 404)
        items.push({ query, candidates: [] });
      else throw e;
    }
  }
  return { items, token: seal(items) };
}
export async function passport(
  city: string,
  token: string,
  ids: string[],
  constraints: Constraint[] = [],
) {
  const items = unseal(token);
  const selected = items
    .map((item) => item.candidates.find((c) => ids.includes(c.id)))
    .filter((c): c is Candidate => Boolean(c));
  if (
    selected.length < 3 ||
    selected.length !== ids.length ||
    new Set(ids).size !== ids.length
  )
    throw new QlooError("Confirm three to five distinct taste matches.", 400);
  const cards: Card[] = [];
  const notices: string[] = [];
  for (const type of ["place", "artist"]) {
    try {
      const allEntityIds = selected
        .filter((s) => !s.id.startsWith("urn:tag:"))
        .map((s) => s.id);
      const artistIds = selected
        .filter((s) => s.types.includes("urn:entity:artist"))
        .map((s) => s.id);
      const entityIds =
        type === "artist" && artistIds.length ? artistIds : allEntityIds;
      const tags = selected
        .filter((s) => s.id.startsWith("urn:tag:"))
        .map((s) => s.id);
      if (type === "artist" && !entityIds.length) {
        notices.push(
          "Music needs a confirmed entity signal; cuisine-only concepts are not treated as artist evidence.",
        );
        continue;
      }
      const params = entityIds.length
        ? insightParams(entityIds, type, type === "place")
        : { "filter.type": `urn:entity:${type}`, take: "20" };
      params.take = "20";
      if (type === "place") {
        params["filter.location.radius"] = "0";
        if (tags.length) params["signal.interests.tags"] = tags.join(",");
        const cuisine = selected
          .filter((s) => s.id.includes(":cuisine:"))
          .map((s) => s.id);
        if (cuisine.length) {
          params["filter.tags"] = [
            "urn:tag:genre:place:restaurant",
            ...cuisine,
          ].join(",");
          params["operator.filter.tags"] = "intersection";
        }
      }
      params[
        type === "place" ? "filter.location.query" : "signal.location.query"
      ] = city;
      if (type === "place" && constraints.includes("expensive"))
        params["filter.price_level.max"] = "2";
      if (constraints.includes("mainstream"))
        params["filter.popularity.max"] = "0.9";
      const result = await insights(params);
      const queryId = crypto.randomUUID();
      for (const entity of result.entities) {
        if (ids.includes(entity.entity_id)) continue;
        const section = type === "artist" ? "Music" : validatedSection(entity);
        if (section) {
          const validated = validateDiscoveries(
            { results: { entities: [entity] } },
            city,
            section,
            constraints,
            ids,
          );
          const grounded = withEvidence(
            validated,
            [entity],
            params,
            selected,
            city,
            "familiar",
            "direct",
          );
          for (const c of grounded)
            if (c.evidence) c.evidence.queryId = queryId;
          cards.push(...grounded);
        }
      }
      if (!result.entities.length)
        notices.push(
          `${type === "place" ? "Local places" : "Music"} returned no discoveries.`,
        );
    } catch (e) {
      notices.push(
        `${type === "place" ? "Local places" : "Music"}: ${e instanceof QlooError ? e.message : "Qloo returned an unexpected response."}`,
      );
    }
  }
  return {
    city,
    selected,
    cards: [...new Map(cards.map((c) => [c.id, c])).values()],
    notices,
    explanation:
      "Used confirmed cultural signals for each query. Qloo did not provide individual signal attribution.",
  };
}
