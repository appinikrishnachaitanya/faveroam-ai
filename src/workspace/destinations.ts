import "server-only";
import { db, gcpAccountConfigured } from "../account/gcp.ts";
import { destinations } from "./state";
import { validDestination } from "./location";

/** Server-side Firestore catalogue; empty projects can use the starter cities. */
export async function destinationCatalog(): Promise<string[]> {
  if (!gcpAccountConfigured())
    return [...destinations];
  const rows = await db().collection("destinations").orderBy("sort_order").get();
  if (rows.empty) return [...destinations];
  return rows.docs.map(row => row.data()).filter(row => row.enabled !== false)
    .map(row => row.name).filter((name): name is string => typeof name === "string" && validDestination(name));
}
export async function catalogCity(value: unknown): Promise<string | undefined> {
  if (typeof value !== "string" || !validDestination(value)) return;
  const name = value.trim().toLowerCase();
  const canonical = name === "nyc" || name === "new york" ? "new york city" : name === "bangalore" ? "bengaluru" : name;
  return (await destinationCatalog()).find(city => city.toLowerCase() === canonical);
}
