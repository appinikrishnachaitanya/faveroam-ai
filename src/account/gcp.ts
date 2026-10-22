import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { Storage } from "@google-cloud/storage";
import { debugEvent } from "../agent/debug.ts";

const SESSION_COOKIE = "tastepassport_session";
const SESSION_AGE_MS = 5 * 24 * 60 * 60_000;
const storage = new Storage();
export class FirebaseAuthError extends Error {
  readonly code: string;
  constructor(code: string) { super("Firebase Auth request failed."); this.code = code; }
}

export function gcpAccountConfigured() {
  return Boolean(process.env.FIREBASE_PROJECT_ID?.trim() && process.env.FIREBASE_WEB_API_KEY?.trim() && process.env.GCP_STORAGE_BUCKET?.trim());
}

function app() {
  if (!gcpAccountConfigured()) throw Error("GCP account storage is not configured.");
  return getApps().find(existing => existing.name === "tastepassport") ??
    initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID }, "tastepassport");
}

export function auth() { return getAuth(app()); }
export function db() { return getFirestore(app()); }
export function bucket() {
  app();
  return storage.bucket(process.env.GCP_STORAGE_BUCKET!);
}

export function accountRows(uid: string, collection: "passports" | "plans" | "profiles") {
  return db().collection("users").doc(uid).collection(collection);
}

export function stableId(value: string) {
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 32);
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;
}

export async function currentUser(): Promise<UserRecord | undefined> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value || !gcpAccountConfigured()) return;
  try {
    const decoded = await auth().verifySessionCookie(value, true);
    return await auth().getUser(decoded.uid);
  } catch { return; }
}

export async function setUserSession(idToken: string) {
  const decoded = await auth().verifyIdToken(idToken);
  const user = await auth().getUser(decoded.uid);
  if (!user.emailVerified) throw Error("Confirm your email before signing in.");
  const session = await auth().createSessionCookie(idToken, { expiresIn: SESSION_AGE_MS });
  (await cookies()).set(SESSION_COOKIE, session, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: SESSION_AGE_MS / 1000,
  });
  return user;
}

export async function clearUserSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function firebaseRequest(path: string, body: Record<string, unknown>) {
  const key = process.env.FIREBASE_WEB_API_KEY?.trim();
  if (!key) throw Error("Firebase Auth is not configured.");
  debugEvent("service.invoked", { service: "firebase-auth" });
  let response: Response;
  try {
    response = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000), cache: "no-store",
    });
  } catch {
    debugEvent("service.failed", { service: "firebase-auth" });
    throw new FirebaseAuthError("UNAVAILABLE");
  }
  debugEvent("service.response", { service: "firebase-auth", status: response.status });
  const result: unknown = await response.json();
  if (!response.ok) {
    const providerCode = (result as { error?: { message?: unknown } })?.error?.message;
    const code = typeof providerCode === "string" && /^[A-Z][A-Z0-9_]+$/.test(providerCode)
      ? providerCode : "UNAVAILABLE";
    throw new FirebaseAuthError(code);
  }
  return result as Record<string, unknown>;
}

export async function saveJsonObject(uid: string, id: string, value: unknown) {
  const path = `passports/${uid}/${id}/${randomUUID()}.json`;
  await bucket().file(path).save(JSON.stringify(value), {
    contentType: "application/json", resumable: false, preconditionOpts: { ifGenerationMatch: 0 },
  });
  return path;
}

export async function readJsonObject(uid: string, path: unknown) {
  if (typeof path !== "string" || !path.startsWith(`passports/${uid}/`) || !/^passports\/[\w-]+\/[\w-]+\/[\w-]+\.json$/.test(path))
    throw Error("Invalid saved Passport reference.");
  const [data] = await bucket().file(path).download();
  return JSON.parse(data.toString("utf8")) as unknown;
}

export async function removeJsonObject(uid: string, path: unknown) {
  if (typeof path !== "string" || !path.startsWith(`passports/${uid}/`)) return;
  try { await bucket().file(path).delete(); }
  catch (error) { if ((error as {code?:number})?.code !== 404) throw error; }
}
