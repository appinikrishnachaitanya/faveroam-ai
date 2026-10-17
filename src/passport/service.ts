import "server-only";
import { debugEvent } from "../agent/debug.ts";
import { withEvidence } from "./evidence.ts";
import { createHmac, timingSafeEqual } from "node:crypto";
import { culturalText } from "../agent/intent.ts";
import { validatedSection, validateDiscoveries } from "../agent/validation.ts";
import type { Constraint } from "../agent/types.ts";
import { search, insights, QlooError, insightParams } from "../qloo/client.ts";
import { candidates, classify, card, diversifyCards } from "./model.ts";
import type { Candidate, Card } from "./model.ts";
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
  debugEvent("resolution.started", { count: queries.length });
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
  items.forEach((item, seedIndex) =>
    debugEvent("resolution.candidates", {
      seedIndex,
      count: item.candidates.length,
    }),
  );
  debugEvent("resolution.completed", {
    count: items.reduce((n, item) => n + item.candidates.length, 0),
  });
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
  debugEvent("passport.started", { city, signalCount: selected.length });
  const includeCulture = selected.some((taste) =>
    taste.types.some((type) => /urn:entity:(?:movie|tv_show)/.test(type)) ||
    (taste.id.startsWith("urn:tag:") && /museum|gallery|theatre|theater|cinema|culture/i.test(`${taste.id} ${taste.name}`)),
  );
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
      const queryId = result.traceId;
      const before = cards.length;
      for (const entity of result.entities) {
        if (ids.includes(entity.entity_id)) continue;
        const section = type === "artist" ? "Music" : validatedSection(entity);
        if (section === "Culture" && !includeCulture) continue;
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
            result.params,
            selected,
            city,
            "familiar",
            "direct",
          );
          for (const c of grounded)
            if (c.evidence) {
              c.evidence.queryId = queryId;
              c.evidence.diagnostics = result.diagnostics;
            }
          cards.push(...grounded);
        }
      }
      debugEvent("passport.pool", {
        city,
        pool: type,
        count: result.entities.length,
        keptCount: cards.length - before,
      });
      if (!result.entities.length)
        notices.push(
          `${type === "place" ? "Local places" : "Music"} returned no discoveries.`,
        );
    } catch (e) {
      debugEvent("discovery.failed", {
        pool: type,
        status: e instanceof QlooError ? e.status : undefined,
      });
      notices.push(
        `${type === "place" ? "Local places" : "Music"}: ${e instanceof QlooError ? e.message : "Qloo returned an unexpected response."}`,
      );
    }
  }
  // Fill distinct outing chapters through the same validated refinement pipeline.
  const { discoverSection } = await import("../agent/runtime.ts");
  const { normalizeSession } = await import("../agent/session.ts");
  const state = normalizeSession({
    id: "initial",
    revision: 0,
    expires: Date.now() + 90_000,
    city,
    selected,
    tags: selected.filter((s) => s.id.startsWith("urn:tag:")),
    constraints,
    categoryConstraints: {},
    cards,
    previous: [],
    feedback: [],
    notices,
  });
  await Promise.all(
    ["Eat", "Coffee", ...(includeCulture ? ["Culture"] : [])].map(async (chapter) => {
      const section = chapter as "Eat" | "Coffee" | "Culture";
      if (cards.filter((c) => c.section === section).length >= 3) return;
      try {
        const found = await discoverSection(
          state,
          section,
          constraints,
          ids.filter((id) => !id.startsWith("urn:tag:")),
          false,
          AbortSignal.timeout(35_000),
        );
        const unique = found.filter(
          (c) => !cards.some((old) => old.id === c.id),
        );
        cards.push(...unique);
        if (!found.length)
          notices.push(
            `No eligible ${section} places found. Try a specific venue interest or leave that outing stop open.`,
          );
      } catch {
        notices.push(
          `${section} could not be refreshed. Your other discoveries are preserved.`,
        );
      }
    }),
  );
  // Apply the same coffee diversity guard to the initial passport pools so a
  // single chain cannot consume the first page before the agent is opened.
  const coffee = diversifyCards(
    cards.filter((card) => card.section === "Coffee"),
    "Coffee",
  );
  const coffeeIds = new Set(coffee.map((card) => card.id));
  cards.splice(
    0,
    cards.length,
    ...cards.filter(
      (card) => card.section !== "Coffee" || coffeeIds.has(card.id),
    ),
  );
  debugEvent("passport.completed", {
    city,
    count: new Set(cards.map((c) => c.id)).size,
  });
  return {
    city,
    selected,
    cards: [...new Map(cards.map((c) => [c.id, c])).values()],
    notices,
    explanation:
      "Used confirmed cultural signals for each query. Qloo did not provide individual signal attribution.",
  };
}
