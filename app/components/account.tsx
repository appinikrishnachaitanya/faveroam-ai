"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Passport } from "../../src/workspace/state";
import { Icon } from "./passport";
import UpcomingPlans from "./plans";
import type { SavedPlan } from "../../src/account/plans";
import {
  accountRequest as request,
  accountChanged,
  showNotice,
} from "../../src/account/browser";
type Account = {
  configured: boolean;
  storage: boolean;
  user: { email?: string } | null;
};
type Entry = { id: string; city: string; updated_at: string };
export default function AccountControl({
  passport,
  disabled,
  onRestore,
  onSignOut,
  onAccountChange,
}: {
  passport?: Passport;
  disabled: boolean;
  onRestore: (passport: Passport) => void;
  onSignOut: () => void;
  onAccountChange?: (signedIn: boolean) => void;
}) {
  const [account, setAccount] = useState<Account>();
  const authEpoch = useRef(0);
  const accountIdentity = useRef<string | null>(null);
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
  const [verificationPending, setVerificationPending] = useState(false);
  const [libraryTab, setLibraryTab] = useState<"passports" | "plans">(
    "passports",
  );
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [plansError, setPlansError] = useState("");
  async function refreshPlans() {
    const epoch = authEpoch.current;
    try {
      const data = await request("/api/account/plans");
      if (epoch === authEpoch.current) {
        setPlans(data.plans);
        setPlansError("");
      }
    } catch (error) {
      if (epoch === authEpoch.current)
        setPlansError(
          error instanceof Error ? error.message : "Could not load your plans.",
        );
    }
  }
  async function removePlan(id: string) {
    setBusy(true);
    try {
      await request("/api/account/plans", { id }, "DELETE");
      await refreshPlans();
      showNotice("Your saved plan was deleted.");
    } catch (error) {
      showNotice(
        error instanceof Error ? error.message : "Could not delete the plan.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  async function refresh() {
    const epoch = ++authEpoch.current;
    try {
      const data = await request("/api/account");
      if (epoch !== authEpoch.current) return;
      const identity = data.user?.email ?? null;
      if (accountIdentity.current !== identity) {
        setEntries([]);
        setPlans([]);
      }
      accountIdentity.current = identity;
      setAccount(data);
      onAccountChange?.(Boolean(data.user));
      accountChanged();
      if (data.user) {
        try {
          const list = await request("/api/account/passports");
          if (epoch === authEpoch.current) setEntries(list.passports);
        } catch {
          if (epoch === authEpoch.current)
            setMessage(
              "Your saved Passports could not load. Try opening them again.",
            );
        }
        if (epoch === authEpoch.current) await refreshPlans();
      } else {
        setEntries([]);
        setPlans([]);
      }
      return data;
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
    const openAccount = () => {
      setPendingSave(false);
      setVerificationPending(false);
      setTab("login");
      setOpen(true);
    };
    const plansUpdated = () => void refreshPlans();
    window.addEventListener("tastepassport:open-account", openAccount);
    window.addEventListener("tastepassport:plans-updated", plansUpdated);
    const notice = new URLSearchParams(window.location.search).get("account");
    if (notice) {
      setOpen(true);
      if (notice === "confirmed")
        setMessage("Email verified. Your account is ready.");
      if (notice === "retry")
        setMessage(
          "That confirmation link could not complete. Sign in or request a new recovery link.",
        );
      if (notice === "recovery") setTab("password");
      window.history.replaceState(null, "", window.location.pathname);
    }
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("tastepassport:open-account", openAccount);
      window.removeEventListener("tastepassport:plans-updated", plansUpdated);
    };
  }, []);
  useEffect(() => {
    const el = dialog.current;
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    if (open) {
      root.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    }
    if (open && !el?.open) {
      opener.current = document.activeElement as HTMLElement | null;
      el?.showModal();
    }
    if (!open) {
      el?.close();
      setPassword("");
      setDeletePassword("");
      setDeleteConfirmation("");
      opener.current?.focus();
    }
    return () => {
      if (el?.open) el.close();
      if (open) {
        root.style.overflow = previousRootOverflow;
        document.body.style.overflow = previousBodyOverflow;
      }
    };
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
      showNotice("Your Passport is saved.");
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
      if (data.confirmationRequired) {
        setVerificationPending(true);
        setMessage(
          "Check your email to confirm your account, then sign in. Your current guest Passport stays here.",
        );
      } else if (tab === "recover")
        setMessage("If an account exists, a recovery link is on its way.");
      else {
        setTab("login");
        const current = await refresh();
        if (current?.user) {
          setVerificationPending(false);
          setOpen(false);
          showNotice("Welcome back. Your saved Passports and plans are ready.");
        } else
          setMessage(
            "Your sign-in completed. Please reopen your account to check the connection.",
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
      authEpoch.current++;
      accountIdentity.current = null;
      setEntries([]);
      setAccount((a) => (a ? { ...a, user: null } : a));
      onAccountChange?.(false);
      setPlans([]);
      setVerificationPending(false);
      accountChanged();
      onSignOut();
      setOpen(false);
      showNotice("You’re signed out.");
    } catch (e) {
      const text = e instanceof Error ? e.message : "Could not sign out.";
      setMessage(text);
      showNotice(text, "error");
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
      authEpoch.current++;
      accountIdentity.current = null;
      setEntries([]);
      setAccount((a) => (a ? { ...a, user: null } : a));
      onAccountChange?.(false);
      setPlans([]);
      setVerificationPending(false);
      accountChanged();
      onSignOut();
      setOpen(false);
      showNotice("You’re signed out.");
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
        aria-label={account?.user ? "My Saved Passports" : "Sign in"}
        disabled={disabled || busy}
        onClick={() => {
          setPendingSave(false);
          setVerificationPending(false);
          setLibraryTab("passports");
          setOpen(true);
          if (account?.user) void refresh();
        }}
      >
        {account?.user ? (
          <>
            <span className="nav-label-long">My Saved Passports</span>
            <span className="nav-label-short">Saved</span>
          </>
        ) : (
          "Sign in"
        )}
      </button>
      {account?.user && (
        <>
          <button
            className="quiet-button upcoming-launch"
            aria-label="Upcoming plans"
            disabled={disabled || busy}
            onClick={() => {
              setLibraryTab("plans");
              setPendingSave(false);
              setOpen(true);
              void refreshPlans();
            }}
          >
            <span className="nav-label-long">Upcoming plans</span>
            <span className="nav-label-short">Plans</span>
          </button>
          <button
            className="quiet-button signout-button"
            disabled={disabled || busy}
            onClick={() => void logout()}
          >
            Sign out
          </button>
        </>
      )}
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            className={
              account?.user
                ? "account-dialog account-library-dialog"
                : "account-dialog"
            }
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
              {verificationPending
                ? "Verify your email"
                : account?.user
                  ? libraryTab === "plans"
                    ? "Your upcoming plans"
                    : "Your saved Passports"
                  : pendingSave
                    ? "Keep your next chapter"
                    : "Welcome to TastePassport"}
            </h2>
            {!account?.user && !verificationPending && (
              <p className="account-intro">
                Explore as a guest. Sign in when you want to keep your confirmed
                tastes, discoveries and My Vibe shortlist across visits.
              </p>
            )}
            {verificationPending ? (
              <section
                className="verification-screen"
                aria-label="Verify your email"
              >
                <span className="verification-mark" aria-hidden="true">
                  <Icon name="send" size={28} />
                </span>
                <h3>One last step. Check your inbox.</h3>
                <p>
                  Open the confirmation link sent to <strong>{email}</strong> in
                  this browser to verify your account.
                </p>
                <p className="helper">
                  Check spam too. Your current Passport and selected plan stay
                  here while you verify. If an account already exists, sign in
                  instead.
                </p>
                <button
                  className="primary-button"
                  onClick={() => {
                    setVerificationPending(false);
                    setTab("login");
                    setMessage("");
                    void refresh();
                  }}
                >
                  I’ve verified — continue to sign in
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setVerificationPending(false);
                    setTab("register");
                    setEmail("");
                    setMessage("");
                  }}
                >
                  Use a different email
                </button>
              </section>
            ) : account?.configured === false ? (
              <div className="account-unavailable" role="status">
                <strong>Accounts are coming online.</strong>
                <p>
                  Saving needs account storage to be connected. Your guest
                  Passport and all discovery controls work now.
                </p>
              </div>
            ) : account?.user && tab !== "password" ? (
              <>
                <p className="account-email">
                  Signed in as {account.user.email}
                </p>
                <div
                  className="account-library-tabs"
                  role="group"
                  aria-label="Saved items"
                >
                  <button
                    className="quiet-button"
                    aria-pressed={libraryTab === "passports"}
                    onClick={() => setLibraryTab("passports")}
                  >
                    Saved Passports
                  </button>
                  <button
                    className="quiet-button"
                    aria-pressed={libraryTab === "plans"}
                    onClick={() => {
                      setLibraryTab("plans");
                      void refreshPlans();
                    }}
                  >
                    Upcoming plans
                  </button>
                </div>
                {passport && libraryTab === "passports" && (
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
                {libraryTab === "plans" ? (
                  <UpcomingPlans
                    plans={plans}
                    busy={busy}
                    error={plansError}
                    onDelete={(id) => void removePlan(id)}
                    onRetry={() => void refreshPlans()}
                  />
                ) : (
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
                      <p className="helper">
                        Your saved cities will appear here.
                      </p>
                    )}
                  </div>
                )}
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
                    This permanently deletes your account and all saved
                    Passports.
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
            {message && !verificationPending && (
              <p className="account-message" role="status">
                {message}
              </p>
            )}
            <p className="account-privacy">
              Saved Passports and dated plans stay with your account. Chat
              history and model-only comparisons aren’t saved.{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacy & data controls
              </a>
            </p>
          </dialog>,
          document.body,
        )}
    </div>
  );
}
