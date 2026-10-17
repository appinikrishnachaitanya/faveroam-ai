export async function accountRequest(path: string, body?: unknown, method = "POST") {
  const response = await fetch(path, body === undefined ? { cache: "no-store" } : {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw Error(value.error || "Please try again.");
  return value;
}
export function accountChanged() { window.dispatchEvent(new Event("tastepassport:account-updated")); }
export function showNotice(message: string, kind: "success" | "error" = "success") {
  window.dispatchEvent(new CustomEvent("tastepassport:notice", { detail: { message, kind } }));
}
