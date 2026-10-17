import { normalizeEntity } from "./normalizer.ts";
import type { Entity } from "./types.ts";
/** 200 is insufficient: reject observable violations and disclose unverifiable constraints. */
export function verifyResult(entity: Entity, params: Record<string, string>) {
  const m = normalizeEntity(entity),
    unverified: string[] = [];
  const values: Record<string, number | undefined> = {
    "filter.price_level": m.commercial.priceLevel,
    "filter.popularity": m.quality.popularity,
    "filter.rating": m.quality.qlooRating,
    "filter.properties.business_rating": m.quality.businessRating,
    "filter.external.tripadvisor.rating": m.externalProof.tripadvisorRating,
    "filter.external.tripadvisor.rating.count":
      m.externalProof.tripadvisorReviewCount,
  };
  for (const [parameter, bound] of Object.entries(params)) {
    const root = parameter.replace(/\.(min|max)$/, "");
    if (root in values && /\.(min|max)$/.test(parameter)) {
      const value = values[root];
      if (value === undefined) unverified.push(parameter);
      else if (
        parameter.endsWith(".min")
          ? value < Number(bound)
          : value > Number(bound)
      )
        return { eligible: false, unverified };
    }
    if (
      [
        "filter.exclude.location.query",
        "filter.location.query",
        "diversify.by",
        "filter.external.exists",
        "filter.tags",
        "filter.exclude.tags",
      ].includes(parameter)
    )
      unverified.push(parameter);
  }
  return { eligible: true, unverified };
}
