import { accountClient, requestOrigin } from "../../../src/account/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = requestOrigin(request);
  const code = url.searchParams.get("code");
  if (code)
    try {
      const client = await accountClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error)
        return Response.redirect(
          new URL(
            url.searchParams.get("recovery") === "1"
              ? "/?account=recovery"
              : "/?account=confirmed",
            base,
          ),
        );
    } catch {}
  return Response.redirect(new URL("/?account=retry", base));
}
