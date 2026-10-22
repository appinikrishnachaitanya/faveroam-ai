import { Firestore } from "@google-cloud/firestore";
import { destinations } from "../src/workspace/state.ts";

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
if (!projectId) throw Error("Set FIREBASE_PROJECT_ID before seeding destinations.");
const db = new Firestore({ projectId });
for (const [index, name] of destinations.entries()) {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const row = db.collection("destinations").doc(id);
  if (!(await row.get()).exists)
    await row.create({ name, enabled: true, sort_order: index + 1 });
}
console.log(`Destination catalogue ready: ${destinations.length} starter cities; existing records preserved.`);
