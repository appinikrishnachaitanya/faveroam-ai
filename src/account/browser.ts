export class AccountRequestError extends Error {
  signInRequired: boolean;
  constructor(message: string, signInRequired = false) { super(message); this.signInRequired = signInRequired; }
}
export async function accountRequest(path: string, body?: unknown, method = "POST") {
  const longRequest = path === "/api/account/preferences" || (path === "/api/account/rituals" && body && typeof body === "object" && "action" in body && body.action === "replace");
  const signal = AbortSignal.timeout(longRequest ? 100_000 : 25_000);
  const response = await fetch(path, body === undefined ? { cache: "no-store", signal } : {
    signal,
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw new AccountRequestError(value.error || "Please try again.", value.signInRequired === true);
  return value;
}
export function accountChanged() { window.dispatchEvent(new Event("tastepassport:account-updated")); }
export function showNotice(message: string, kind: "success" | "error" = "success") {
  window.dispatchEvent(new CustomEvent("tastepassport:notice", { detail: { message, kind } }));
}
