"use client";
import { useEffect, useRef, useState } from "react";
import type { Passport } from "../../src/workspace/state";
import { Icon } from "./passport";
type Account = {
  configured: boolean;
  storage: boolean;
  user: { email?: string } | null;
};
type Entry = { id: string; city: string; updated_at: string };
async function request(path: string, body?: unknown, method = "POST") {
  const response = await fetch(
    path,
    body === undefined
      ? { cache: "no-store" }
      : {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const value = await response.json();
  if (!response.ok) throw Error(value.error || "Please try again.");
  return value;
}
export default function AccountControl({
  passport,
  disabled,
  onRestore,
  onSignOut,
}: {
  passport?: Passport;
  disabled: boolean;
  onRestore: (passport: Passport) => void;
  onSignOut: () => void;
}) {
  const [account, setAccount] = useState<Account>();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"login" | "register" | "recover" | "password">(
    "login",
  );
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pendingSave, setPendingSave] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  async function refresh() {
    try {
      const data = await request("/api/account");
      setAccount(data);
      if (data.user) {
        const list = await request("/api/account/passports");
        setEntries(list.passports);
      } else setEntries([]);
    } catch {
      setMessage(
        "Accounts are temporarily unavailable. You can keep exploring as a guest.",
      );
    }
  }
  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const notice = new URLSearchParams(window.location.search).get("account");
    if (notice) {
      setOpen(true);
      if (notice === "confirmed")
        setMessage(
          "Email confirmed. Sign in here to save your current Passport.",
        );
      if (notice === "retry")
        setMessage(
          "That confirmation link could not complete. Sign in or request a new recovery link.",
        );
      if (notice === "recovery") setTab("password");
      window.history.replaceState(null, "", window.location.pathname);
    }
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  useEffect(() => {
    const el = dialog.current;
    if (open && !el?.open) el?.showModal();
    if (!open) {
      el?.close();
      setPassword("");
      setDeletePassword("");
      setDeleteConfirmation("");
    }
  }, [open]);
  async function save() {
    if (!passport?.agent) return;
    setBusy(true);
    try {
      await request("/api/account/passports", {
        action: "save",
        sessionId: passport.agent.sessionId,
        revision: passport.agent.revision,
      });
      setPendingSave(false);
      setMessage(
        `Your latest ${passport.city} Passport is saved. It includes your My Vibe shortlist.`,
      );
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const data = await request("/api/account", {
        action:
          tab === "recover" ? "recover" : tab === "password" ? "password" : tab,
        email,
        password,
      });
      setPassword("");
      if (data.confirmationRequired)
        setMessage(
          "Check your email to confirm your account, then sign in. Your current guest Passport stays here.",
        );
      else if (tab === "recover")
        setMessage("If an account exists, a recovery link is on its way.");
      else {
        setTab("login");
        await refresh();
        setMessage(
          "You’re signed in. Save your Passport to keep it for next time.",
        );
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Account request failed.");
    } finally {
      setBusy(false);
    }
  }
  async function restore(id: string) {
    setBusy(true);
    try {
      const data = await request("/api/account/passports", {
        action: "restore",
        id,
      });
      onRestore(data.passport);
      setOpen(false);
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not restore.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      await request("/api/account/passports", { id }, "DELETE");
      await refresh();
      setMessage("Saved Passport deleted.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await request("/api/account", { action: "logout" });
      setEntries([]);
      setAccount((a) => (a ? { ...a, user: null } : a));
      onSignOut();
      setOpen(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not sign out.");
    } finally {
      setBusy(false);
    }
  }
  async function deleteAccount() {
    setBusy(true);
    try {
      await request(
        "/api/account",
        { password: deletePassword, confirmation: deleteConfirmation },
        "DELETE",
      );
      setDeletePassword("");
      setDeleteConfirmation("");
      setEntries([]);
      setAccount((a) => (a ? { ...a, user: null } : a));
      onSignOut();
      setOpen(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not delete account.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-control">
      {passport && (
        <button
          className="quiet-button save-passport"
          disabled={disabled}
          onClick={() => {
            setPendingSave(true);
            setOpen(true);
          }}
        >
          Save Passport
        </button>
      )}
      <button
        className="quiet-button account-launch"
        disabled={disabled}
        onClick={() => {
          setPendingSave(false);
          setOpen(true);
        }}
      >
        {account?.user ? "My Passports" : "Sign in"}
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="account-dialog"
          aria-labelledby="account-title"
          onCancel={(e) => {
            e.preventDefault();
            setOpen(false);
          }}
        >
          <div className="dialog-header">
            <span className="micro-label">YOUR CULTURE. WITH YOU.</span>
            <button
              className="icon-button"
              aria-label="Close account"
              onClick={() => setOpen(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <h2 id="account-title">
            {account?.user
              ? "Your saved Passports"
              : pendingSave
                ? "Keep your next chapter"
                : "Welcome to TastePassport"}
          </h2>
          <p className="account-intro">
            Explore as a guest. Sign in when you want to keep your confirmed
            tastes, discoveries and My Vibe shortlist across visits.
          </p>
          {account?.configured === false ? (
            <div className="account-unavailable" role="status">
              <strong>Accounts are coming online.</strong>
              <p>
                Saving needs account storage to be connected. Your guest
                Passport and all discovery controls work now.
              </p>
            </div>
          ) : account?.user && tab !== "password" ? (
            <>
              <p className="account-email">Signed in as {account.user.email}</p>
              {passport && (
                <button
                  className="primary-button"
                  disabled={busy || !account.storage}
                  onClick={() => void save()}
                >
                  Save latest {passport.city} Passport
                </button>
              )}
              {!account.storage && (
                <p className="helper">
                  Account storage is not configured yet. Your current Passport
                  is preserved.
                </p>
              )}
              <div className="saved-passport-list">
                {entries.length ? (
                  entries.map((entry) => (
                    <article key={entry.id}>
                      <div>
                        <strong>{entry.city}</strong>
                        <small>
                          Saved{" "}
                          {new Date(entry.updated_at).toLocaleDateString()}
                        </small>
                      </div>
                      <button
                        className="quiet-button"
                        disabled={busy || disabled}
                        onClick={() => void restore(entry.id)}
                      >
                        Open
                      </button>
                      <button
                        className="icon-button"
                        disabled={busy}
                        aria-label={`Delete saved ${entry.city} Passport`}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete your saved ${entry.city} Passport?`,
                            )
                          )
                            void remove(entry.id);
                        }}
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </article>
                  ))
                ) : (
                  <p className="helper">Your saved cities will appear here.</p>
                )}
              </div>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => void logout()}
              >
                Sign out and clear this screen
              </button>
              <details className="delete-account">
                <summary>Delete my account</summary>
                <p>
                  This permanently deletes your account and all saved Passports.
                </p>
                <label>
                  Confirm password
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={deletePassword}
                    maxLength={128}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />
                </label>
                <label>
                  Type DELETE
                  <input
                    value={deleteConfirmation}
                    maxLength={6}
                    autoComplete="off"
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                  />
                </label>
                <button
                  className="quiet-button"
                  disabled={
                    busy ||
                    !account.storage ||
                    !deletePassword ||
                    deleteConfirmation !== "DELETE"
                  }
                  onClick={() => void deleteAccount()}
                >
                  Permanently delete account
                </button>
              </details>
            </>
          ) : (
            <form onSubmit={submit}>
              <div className="account-tabs">
                {(["login", "register"] as const).map((value) => (
                  <button
                    type="button"
                    className="quiet-button"
                    key={value}
                    aria-pressed={tab === value}
                    onClick={() => {
                      setTab(value);
                      setPassword("");
                      setMessage("");
                    }}
                  >
                    {value === "login" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>
              {tab !== "password" && (
                <label>
                  Email
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    maxLength={254}
                    required
                    disabled={busy}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              )}
              {tab !== "recover" && (
                <label>
                  {tab === "password" ? "New password" : "Password"}
                  <input
                    type="password"
                    autoComplete={
                      tab === "register" || tab === "password"
                        ? "new-password"
                        : "current-password"
                    }
                    value={password}
                    minLength={
                      tab === "register" || tab === "password" ? 12 : 1
                    }
                    maxLength={128}
                    required
                    disabled={busy}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              )}
              {(tab === "register" || tab === "password") && (
                <p className="helper">
                  Use at least 12 characters and a unique password.
                </p>
              )}
              <button
                className="primary-button"
                disabled={busy || account?.configured !== true}
              >
                {busy
                  ? "One moment…"
                  : tab === "register"
                    ? "Create my account"
                    : tab === "recover"
                      ? "Send recovery link"
                      : tab === "password"
                        ? "Set new password"
                        : "Sign in"}
              </button>
              {tab === "login" && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setTab("recover");
                    setPassword("");
                  }}
                >
                  Forgot password?
                </button>
              )}
            </form>
          )}
          {message && (
            <p className="account-message" role="status">
              {message}
            </p>
          )}
          <p className="account-privacy">
            Saving is explicit and keeps the latest Passport per city. Chat
            history and model-only comparisons aren’t saved.{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer">
              Privacy & data controls
            </a>
          </p>
        </dialog>
      )}
    </div>
  );
}
