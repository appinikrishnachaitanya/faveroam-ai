import { cookies } from "next/headers";
import { debugRequest } from "../../../src/agent/debug";
import { accountName } from "../../../src/account/identity";
import { passwordValidationMessage } from "../../../src/account/password-policy";
import { sameOrigin, requestOrigin } from "../../../src/account/policy";
import { auth, clearUserSession, currentUser, firebaseRequest, FirebaseAuthError, gcpAccountConfigured, setUserSession, accountRows, removeJsonObject } from "../../../src/account/gcp";
import { privateJson } from "../../../src/account/server";

export const runtime = "nodejs";

async function handleGET() {
  if (!gcpAccountConfigured()) return privateJson({ configured: false, storage: false, user: null });
  try {
    const user = await currentUser();
    const [firstName = "", ...lastParts] = (user?.displayName ?? "").split(" ");
    const lastName = lastParts.join(" ");
    return privateJson({ configured: true, storage: true, user: user ? { email: user.email, firstName, lastName } : null });
  } catch { return privateJson({ configured: true, storage: false, user: null, error: "Accounts are temporarily unavailable." }, 503); }
}

async function handlePOST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Please use this app to manage your account." }, 403);
  if (!gcpAccountConfigured()) return privateJson({ error: "Accounts are not configured yet. Guest discovery still works." }, 503);
  try {
    const raw = await request.text();
    if (raw.length > 4096) return privateJson({ error: "Invalid account request." }, 400);
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (body.action === "logout") { await clearUserSession(); return privateJson({ signedOut: true }); }
    if (body.action === "recover") {
      if (typeof body.email !== "string" || !/^\S+@\S+\.\S+$/.test(body.email)) return privateJson({ error: "Use a valid email." }, 400);
      try { await firebaseRequest("accounts:sendOobCode", { requestType: "PASSWORD_RESET", email: body.email.trim(), continueUrl: `${requestOrigin(request)}/auth/callback?recovery=1` }); }
      catch { /* Do not reveal whether the address has an account. */ }
      return privateJson({ requested: true });
    }
    if (body.action === "password" || body.action === "change-password") {
      const issue = passwordValidationMessage(body.password);
      if (issue) return privateJson({ error: issue }, 400);
      if (body.action === "password") {
        const code = (await cookies()).get("tastepassport_recovery")?.value;
        if (!code) return privateJson({ error: "Open a fresh recovery link first." }, 401);
        await firebaseRequest("accounts:resetPassword", { oobCode: code, newPassword: body.password });
        (await cookies()).delete("tastepassport_recovery");
        return privateJson({ passwordUpdated: true });
      }
      const user = await currentUser();
      if (!user?.email || typeof body.currentPassword !== "string") return privateJson({ error: "Please sign in again." }, 401);
      try { await firebaseRequest("accounts:signInWithPassword", { email: user.email, password: body.currentPassword, returnSecureToken: true }); }
      catch { return privateJson({ error: "Your current password could not be confirmed." }, 400); }
      await auth().updateUser(user.uid, { password: body.password as string });
      const refreshed = await firebaseRequest("accounts:signInWithPassword", { email: user.email, password: body.password, returnSecureToken: true });
      await setUserSession(String(refreshed.idToken));
      return privateJson({ signedIn: true, passwordUpdated: true });
    }
    if (!["login", "register"].includes(String(body.action)) || typeof body.email !== "string" || body.email.length > 254 || !/^\S+@\S+\.\S+$/.test(body.email) || typeof body.password !== "string" || !body.password || body.password.length > 128)
      return privateJson({ error: "Use a valid email and password." }, 400);
    const email = body.email.trim();
    if (body.action === "register") {
      const issue = passwordValidationMessage(body.password);
      if (issue) return privateJson({ error: issue }, 400);
      let firstName: string, lastName: string;
      try { firstName = accountName(body.firstName); lastName = accountName(body.lastName); }
      catch { return privateJson({ error: "Enter your first and last name using up to 80 characters each." }, 400); }
      let signup: Record<string, unknown>;
      try { signup = await firebaseRequest("accounts:signUp", { email, password: body.password, returnSecureToken: true }); }
      catch (error) {
        if (error instanceof FirebaseAuthError && error.code === "EMAIL_EXISTS")
          return privateJson({ error: "An account already exists for this email. Sign in or use Forgot password.", signInRequired: true }, 409);
        return privateJson({ error: "Registration is temporarily unavailable. Please retry." }, 503);
      }
      await auth().updateUser(String(signup.localId), { displayName: `${firstName} ${lastName}` });
      await firebaseRequest("accounts:sendOobCode", { requestType: "VERIFY_EMAIL", idToken: signup.idToken, continueUrl: `${requestOrigin(request)}/auth/callback?verified=1` });
      return privateJson({ signedIn: false, confirmationRequired: true });
    }
    let result: Record<string, unknown>;
    try { result = await firebaseRequest("accounts:signInWithPassword", { email, password: body.password, returnSecureToken: true }); }
    catch { return privateJson({ error: "We couldn’t sign you in. Check your details or confirm your email." }, 400); }
    const user = await auth().getUser(String(result.localId));
    if (!user.emailVerified) {
      try { await firebaseRequest("accounts:sendOobCode", { requestType: "VERIFY_EMAIL", idToken: result.idToken, continueUrl: `${requestOrigin(request)}/auth/callback?verified=1` }); }
      catch { /* A previous verification email may already have arrived. */ }
      return privateJson({ error: "Check your email to confirm your account, then sign in. We sent another link if email delivery is available." }, 403);
    }
    await setUserSession(String(result.idToken));
    return privateJson({ signedIn: true, confirmationRequired: false });
  } catch { return privateJson({ error: "Account service is temporarily unavailable. Your Passport is preserved." }, 502); }
}

async function handleDELETE(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "Please use this app." }, 403);
  try {
    const body = JSON.parse(await request.text()) as Record<string, unknown>;
    const user = await currentUser();
    if (!user?.email) return privateJson({ error: "Please sign in again." }, 401);
    if (body.confirmation !== "DELETE" || typeof body.password !== "string") return privateJson({ error: "Re-enter your password and type DELETE to confirm." }, 400);
    try { await firebaseRequest("accounts:signInWithPassword", { email: user.email, password: body.password, returnSecureToken: true }); }
    catch { return privateJson({ error: "Password confirmation failed." }, 400); }
    for (const kind of ["passports", "plans", "profiles"] as const) {
      const rows = await accountRows(user.uid, kind).get();
      for (const row of rows.docs) {
        if (kind === "passports") await removeJsonObject(user.uid, row.data().objectPath);
        await row.ref.delete();
      }
    }
    await auth().deleteUser(user.uid);
    await clearUserSession();
    return privateJson({ deleted: true });
  } catch { return privateJson({ error: "Could not delete the account. Please retry." }, 502); }
}

export function GET() { return debugRequest("account", handleGET); }
export function POST(request: Request) { return debugRequest("account", () => handlePOST(request)); }
export function DELETE(request: Request) { return debugRequest("account", () => handleDELETE(request)); }
