import { cookies } from "next/headers";
import { debugRequest } from "../../../src/agent/debug";
import { firebaseRequest } from "../../../src/account/gcp";
import { requestOrigin } from "../../../src/account/policy";

async function handleGET(request: Request) {
  const url = new URL(request.url);
  const base = requestOrigin(request);
  const code = url.searchParams.get("oobCode");
  const mode = url.searchParams.get("mode");
  if (code && code.length < 2048) {
    if (mode === "verifyEmail") {
      try {
        await firebaseRequest("accounts:update", { oobCode: code });
        return Response.redirect(new URL("/?account=confirmed", base));
      } catch { /* Invalid or expired link. */ }
    }
    if (mode === "resetPassword") {
      try {
        await firebaseRequest("accounts:resetPassword", { oobCode: code });
        (await cookies()).set("tastepassport_recovery", code, {
          httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600,
        });
        return Response.redirect(new URL("/?account=recovery", base));
      } catch { /* Invalid or expired link. */ }
    }
  }
  // Firebase's hosted action handler can complete the action before redirecting
  // to continueUrl. These flags only control messaging; they grant no session.
  if (!code && url.searchParams.get("verified") === "1")
    return Response.redirect(new URL("/?account=confirmed", base));
  if (!code && url.searchParams.get("recovery") === "1")
    return Response.redirect(new URL("/?account=reset-complete", base));
  return Response.redirect(new URL("/?account=retry", base));
}

export function GET(request: Request) { return debugRequest("auth.callback", () => handleGET(request)); }
