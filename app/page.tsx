"use client";
import { useEffect, useRef, useState } from "react";
import { sendAgentTurn } from "../src/agent/browser";
import type { Intent } from "../src/agent/types";
import type { AgentInput, AgentEvent, Constraint } from "../src/agent/types";
import { FamiliarityControl, ModelComparison } from "./components/cultural";
import GuidedRefinement, { RefinementRecovery } from "./components/guided";
import FeedbackDialog from "./components/feedback";
import type { Section } from "../src/passport/model";
import type { Candidate } from "../src/passport/model";
import {
  confirmed,
  supportedCity,
  extractDraft,
  typeLabel,
  onboardingTastes,
  passportView,
} from "../src/workspace/state";
import type { Passport, Phase, Resolution } from "../src/workspace/state";
import {
  ActivityFeed,
  Icon,
  PassportSections,
  TasteDNA,
  TranslationMap,
} from "./components/passport";
import type { Feedback } from "./components/passport";
import Disambiguation from "./components/disambiguation";
import {
  MoveForm,
  TasteConfirmation,
  StepIndicator,
} from "./components/onboarding";
import ConciergeDrawer from "./components/concierge";
import { suggestedMatches } from "../src/passport/matching";
import AccountControl from "./components/account";
import DayOutPlan from "./components/day-out";
import TasteIntelligence from "./components/intelligence";
import { JourneyLoading, ToastNotice } from "./components/status";
import {
  PassportCover,
  SavedDiscoveries,
  ConnectionExplorer,
} from "./components/passport-overview";
import { sectionOrder } from "../src/workspace/state";
import type { Familiarity } from "../src/passport/evidence";
interface Message {
  role: "agent" | "user";
  text: string;
}
const welcome: Message = {
  role: "agent",
  text: "Move anywhere. Keep your vibe. Tell me your new city and three to five cultural tastes you love. We’ll build a bridge between your world and your next chapter.",
};
async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}
export default function Home() {
  const [showSaved, setShowSaved] = useState(false);
  const [adaptation, setAdaptation] = useState("");
  const [city, setCity] = useState("");
  const [origin, setOrigin] = useState("");
  const [initialMode, setInitialMode] = useState<Familiarity>("familiar");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantTab, setAssistantTab] = useState<"ask" | "manual">("ask");
  const [composer, setComposer] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [draft, setDraft] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [resolution, setResolution] = useState<Resolution>();
  const [chosen, setChosen] = useState<Record<number, string>>({});
  const [removed, setRemoved] = useState<number[]>([]);
  const [result, setResult] = useState<Passport>();
  const [workspaceView, setWorkspaceView] = useState<
    "discover" | "plan" | "preferences" | "connections"
  >("discover");
  const [accountSignedIn, setAccountSignedIn] = useState(false);

  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<number>();
  const [editing, setEditing] = useState(false);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [conceptSeeds, setConceptSeeds] = useState<string[]>([]);
  const [providerHealth, setProviderHealth] = useState("unconfigured");
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [updating, setUpdating] = useState<Section[]>([]);
  const [updates, setUpdates] = useState<Partial<Record<Section, number>>>({});
  const [rejectionId, setRejectionId] = useState<string>();
  const [conceptDialog, setConceptDialog] = useState(false);
  const feedbackOpener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    fetch("/api/agent/capabilities")
      .then((r) => r.json())
      .then((d) => setProviderHealth(d.health))
      .catch(() => {});
  }, []);
  const activeTurn = useRef<AbortController | null>(null);
  const [retryInput, setRetryInput] = useState<AgentInput>();
  const agentScroll = useRef<HTMLDivElement>(null);
  const matchOpener = useRef<HTMLButtonElement>(null);
  function closeDialog() {
    setDialog(undefined);
    requestAnimationFrame(() => matchOpener.current?.focus());
  }
  const busy =
    phase === "resolving" ||
    phase === "exploring" ||
    phase === "refining" ||
    phase === "interpreting";
  const signals = result?.session?.selected ?? confirmed(resolution, chosen);
  const feedback: Record<string, Feedback> = Object.fromEntries(
    (result?.session?.feedback ?? []).map((f) => [
      f.id,
      f.accepted ? "like" : "dislike",
    ]),
  );
  const sessionHistory = result?.session?.history ?? [];
  const conversationStart = sessionHistory.findIndex(
    (message) => message.role === "user",
  );
  const committedMessages = result
    ? conversationStart < 0
      ? []
      : sessionHistory.slice(conversationStart)
    : messages;
  const visibleMessages = retryInput?.message
    ? [
        ...committedMessages,
        { role: "user" as const, text: retryInput.message },
      ]
    : committedMessages;
  const conciergeAvailable =
    providerHealth === "healthy" || providerHealth === "configured";
  const operationLabel =
    phase === "interpreting"
      ? "Understanding your request…"
      : phase === "resolving"
        ? "Matching the artists, films, food and interests you chose…"
        : phase === "exploring"
          ? `Exploring ${city}…`
          : (agentEvents.at(-1)?.label ?? "Planning your refinement…");
  const activeItems =
    resolution?.items
      .map((item, index) => ({ item, index }))
      .filter(({ index }) => !removed.includes(index)) ?? [];
  const complete =
    activeItems.length >= 3 &&
    activeItems.every(({ index }) => chosen[index]) &&
    new Set(signals.map((s) => s.id)).size === signals.length;
  useEffect(() => {
    const body = agentScroll.current;
    if (!assistantOpen || !body) return;
    body.scrollTop =
      assistantTab === "ask" && !result?.agent?.pending ? body.scrollHeight : 0;
  }, [
    assistantOpen,
    assistantTab,
    messages,
    result?.session?.history,
    result?.agent?.pending,
  ]);
  function say(text: string) {
    setMessages((m) => [...m, { role: "agent", text }]);
  }
  function resetMatches(nextPhase: Phase = "review") {
    setResolution(undefined);
    setChosen({});
    setRemoved([]);
    setResult(undefined);
    setPhase(nextPhase);
    setError("");
    setAgentEvents([]);
    setUpdating([]);
  }
  async function submitConversation(event: React.FormEvent) {
    event.preventDefault();
    if (!composer.trim() || busy) return;
    const text = composer.trim();
    setComposer("");
    if (
      result?.agent &&
      !/\b(?:i love|my tastes (?:are|include)|i'm moving|i’m moving)\b/i.test(
        text,
      )
    ) {
      setMessages((m) => [...m, { role: "user", text }]);
      await refine({ message: text });
      return;
    }
    setPhase("interpreting");
    setError("");
    try {
      const interpreted = await post<{
        intent: Intent;
        mode: string;
        health: string;
      }>("/api/agent/interpret", {
        message: text,
        city: city || "New York City",
      });
      const combined = onboardingTastes(interpreted.intent);
      const parsed = {
        city: supportedCity(interpreted.intent.destination ?? city) ?? "",
        tastes: combined.length ? combined : extractDraft(text, city).tastes,
      };
      setConceptSeeds(interpreted.intent.concepts);
      setProviderHealth(interpreted.health);
      setConstraints(interpreted.intent.constraints);
      setMessages((m) => [
        ...m,
        { role: "user", text },
        {
          role: "agent",
          text: `I’ve prepared an editable taste draft for ${parsed.city || "your next city"}. Choose a supported destination and check the phrases below before I look for matching interests.`,
        },
      ]);
      setCity(parsed.city);
      setDraft(parsed.tastes);
      setEditing(true);
      resetMatches();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not interpret the request.",
      );
      setPhase("error");
    }
  }
  async function refine(input: AgentInput) {
    if (!result?.agent || busy || activeTurn.current) return;
    const controller = new AbortController();
    activeTurn.current = controller;
    setRetryInput(input);
    setError("");
    setPhase("refining");
    setAgentEvents([]);
    setUpdating(
      input.feedback
        ? [
            [...result.cards, ...(result.session?.savedCards ?? [])].find(
              (c) => c.id === input.feedback!.id,
            )?.section,
          ].filter((s): s is Section => Boolean(s))
        : [],
    );
    try {
      const reply = await sendAgentTurn(
        result.agent,
        input,
        (event) => {
          setAgentEvents((events) => [...events, event]);
          const match = event.label.match(
            /(?:Updating|Ranking) your (Eat|Coffee|Music|Culture|Lifestyle) passport/,
          );
          if (match && event.status === "active")
            setUpdating((sections) => [
              ...new Set([...sections, match[1] as Section]),
            ]);
        },
        controller.signal,
      );
      if (controller.signal.aborted || activeTurn.current !== controller) return;
      setRetryInput(undefined);
      const changed = reply.changed;
      const unchanged = sectionOrder.filter(
        (section) =>
          !changed.includes(section) &&
          result.cards.some((c) => c.section === section) &&
          JSON.stringify(result.cards.filter((c) => c.section === section)) ===
            JSON.stringify(
              reply.state.cards.filter((c) => c.section === section),
            ),
      );
      const added = reply.state.cards.filter(
        (c) =>
          changed.includes(c.section) &&
          !result.cards.some((old) => old.id === c.id),
      ).length;
      setAdaptation(
        input.feedback?.accepted
          ? input.feedback.clear
            ? "Removed from My Vibe."
            : "Saved to My Vibe. This real discovery can guide future refinements."
          : changed.length
            ? `Updated ${changed.join(", ")}${added ? ` with ${added} new discoveries` : ""}. ${unchanged.length ? `${unchanged.join(", ")} stayed unchanged.` : ""}`
            : input.reset
              ? "Conversation cleared. Your discoveries and My Vibe are still here."
              : "Your Passport is preserved.",
      );
      setResult(passportView(reply.state, result.explanation));
      setUpdates((u) => {
        const next = { ...u };
        for (const section of reply.changed)
          next[section] = (next[section] ?? 0) + 1;
        return next;
      });
      setProviderHealth(reply.state.providerHealth ?? "unconfigured");
      if (input.reset) {
        setMessages([welcome]);
        setComposer("");
        setConstraints([]);
        setConceptSeeds([]);
        setConceptDialog(false);
        setRejectionId(undefined);
        setAgentEvents([]);
        setUpdates({});
      }
      setPhase("ready");
      if (input.feedback && !input.feedback.accepted)
        requestAnimationFrame(() =>
          document
            .getElementById(`section-${reply.state.feedback.at(-1)?.section}`)
            ?.focus(),
        );
    } catch (e) {
      if (activeTurn.current !== controller) return;
      setError(
        controller.signal.aborted
          ? "Refinement cancelled. Your discoveries are preserved. Retry when you’re ready."
          : e instanceof Error && e.name === "TimeoutError"
            ? "This search took too long. Your discoveries are preserved. Try again or adjust this category."
            : e instanceof Error
              ? e.message
              : "Refinement is unavailable. Your passport is preserved.",
      );
      setPhase("ready");
      say(
        "Refinement is temporarily unavailable. Your existing TastePassport is still available. Try the guided controls.",
      );
    } finally {
      if (activeTurn.current === controller) {
        activeTurn.current = null;
        setPhase("ready");
        setUpdating([]);
      }
    }
  }

  function selectWorkspaceView(next: typeof workspaceView) {
    setWorkspaceView(next);
    requestAnimationFrame(() =>
      document.getElementById(`view-${next}`)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      }),
    );
  }
  function updateDraft(index: number, value: string) {
    setDraft((d) => d.map((s, i) => (i === index ? value : s)));
    resetMatches();
  }
  async function resolve() {
    const queries = draft.map((s) => s.trim()).filter(Boolean);
    if (
      queries.length < 3 ||
      queries.length > 5 ||
      new Set(queries.map((s) => s.toLowerCase())).size !== queries.length
    ) {
      setError("Keep three to five different tastes in your draft.");
      return;
    }
    resetMatches("resolving");
    setEditing(false);
    say(
      "I’m looking up your cultural signals. You’ll choose the intended match for each taste.",
    );
    try {
      const r = await post<Resolution>("/api/agent/resolve", {
        seeds: queries,
        concepts: conceptSeeds,
      });
      setResolution(r);
      setChosen(suggestedMatches(r.items));
      setPhase("confirming");
      say(
        r.items.some((i) => !i.candidates.length)
          ? "Some tastes didn’t return matches. Edit them or remove them, keeping at least three. The available matches are ready to confirm."
          : "Your matches are ready. Confirm each intended entity to bring your taste DNA into focus.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not resolve your tastes.",
      );
      setPhase("error");
      say(
        "The taste lookup couldn’t complete. Your draft is still here; you can retry.",
      );
    }
  }
  function choose(index: number, id: string) {
    setChosen((c) => ({ ...c, [index]: id }));
    closeDialog();
    setResult(undefined);
    setPhase("confirming");
    const item = resolution?.items[index];
    const candidate = item?.candidates.find((c) => c.id === id);
    if (candidate)
      say(`Confirmed ${candidate.name} as ${typeLabel(candidate)}.`);
  }
  function removeSignal(id: string) {
    const entry = Object.entries(chosen).find(([, value]) => value === id);
    if (!entry) {
      const remaining = signals.filter((signal) => signal.id !== id);
      const query = (signal: Candidate) =>
        signal.id.includes(":cuisine:")
          ? `${signal.name} cuisine`
          : signal.name;
      fresh();
      setCity(city);
      setDraft(remaining.map(query));
      setConceptSeeds(
        remaining
          .filter((signal) => signal.id.startsWith("urn:tag:"))
          .map(query),
      );
      setEditing(true);
      setPhase("review");
      say(
        "Taste draft updated. Confirm at least three tastes to rebuild your Passport.",
      );
      return;
    }
    const index = Number(entry[0]);
    const name = signals.find((s) => s.id === id)?.name;
    setChosen((c) => {
      const next = { ...c };
      delete next[index];
      return next;
    });
    setRemoved((r) => [...r, index]);
    setResult(undefined);
    setPhase("confirming");
    say(
      `Removed ${name ?? "that taste"} from the current selection. Keep at least three confirmed tastes to continue.`,
    );
  }
  function setLatestActivity(event: AgentEvent) {
    setAgentEvents((events) => [...events, event]);
  }
  async function generate() {
    if (!resolution || !complete || busy || !city) return;
    setError("");
    setResult(undefined);
    setAgentEvents([]);
    setUpdating([]);
    setPhase("exploring");
    say(
      `I’m exploring ${city} using your confirmed tastes. I’ll check local places and music suggestions, then assemble your passport.`,
    );
    try {
      const r = await post<Passport>("/api/passport", {
        city,
        token: resolution.token,
        ids: signals.map((s) => s.id),
        constraints,
        // Onboarding progress is not assistant chat history.
        history: [],
      });
      let passport = r;
      if (initialMode !== "familiar" && r.agent) {
        for (const section of [...new Set(r.cards.map((c) => c.section))]) {
          try {
            const reply = await sendAgentTurn(
              passport.agent!,
              { familiarity: { mode: initialMode, section } },
              setLatestActivity,
            );
            passport = passportView(reply.state, r.explanation);
          } catch {
            passport = {
              ...passport,
              notices: [
                ...passport.notices,
                "Some discoveries could not be refreshed in your chosen style. You can try again from your Passport.",
              ],
            };
          }
        }
      }
      setResult(passport);
      setPhase("ready");
      say(
        r.cards.length
          ? `Your passport is ready: ${r.cards.length} discoveries${r.notices.length ? ", with a few categories unavailable" : ""}. Explore what feels like you.`
          : "No suitable discoveries were returned this time. Try editing your tastes or try again.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not build your passport.",
      );
      setPhase("error");
      say(
        "Exploration couldn’t complete. Your confirmed tastes are preserved for a retry.",
      );
    }
  }
  function recordFeedback(id: string, value: Feedback) {
    if (busy) return;
    if (value === "dislike") {
      feedbackOpener.current = document.activeElement as HTMLElement;
      setRejectionId(id);
    } else
      void refine({
        feedback: { id, accepted: true, clear: feedback[id] === "like" },
      });
  }
  function closeFeedback() {
    setRejectionId(undefined);
    requestAnimationFrame(() => feedbackOpener.current?.focus());
  }
  function fresh() {
    activeTurn.current?.abort();
    activeTurn.current = null;
    setRetryInput(undefined);
    if (result?.agent)
      void fetch("/api/agent/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: result.agent.sessionId }),
      });
    setShowSaved(false);
    setWorkspaceView("discover");
    setAdaptation("");
    setCity("");
    setOrigin("");
    setInitialMode("familiar");
    setAssistantOpen(false);
    setAssistantTab("ask");
    setComposer("");
    setMessages([welcome]);
    setDraft([]);
    setConstraints([]);
    setConceptSeeds([]);
    setEditing(false);
    setUpdates({});
    setDialog(undefined);
    setRejectionId(undefined);
    setConceptDialog(false);
    resetMatches("idle");
  }
  const step = result ? 3 : resolution && !editing ? 2 : 1;
  const progress =
    phase === "refining"
      ? updating.length
        ? `Finding a better fit for ${updating.join(", ")}…`
        : "Finding a better fit…"
      : phase === "resolving"
        ? "Resolving cultural signals…"
        : phase === "interpreting"
          ? "Understanding your tastes…"
          : `Exploring ${city} and curating your Passport…`;
  return (
    <main className="app-shell progressive-app">
      <ToastNotice />
      <a href="#passport-content" className="skip-link">
        Skip to main content
      </a>
      <header className="workspace-topbar">
        <a className="brand" href="/" aria-label="TastePassport home">
          <span className="brand-symbol">
            <Icon name="star" size={22} />
          </span>
          <span>
            TastePassport <small>AI</small>
          </span>
        </a>
        <span className="topbar-caption">Move anywhere. Keep your vibe.</span>
        <nav className="header-controls" aria-label="Passport actions">
          <AccountControl
            onAccountChange={setAccountSignedIn}
            passport={result}
            disabled={busy}
            onSignOut={fresh}
            onRestore={(passport) => {
              fresh();
              setResult(passport);
              setCity(passport.city);
              setDraft(passport.selected.map((s) => s.name));
              setPhase("ready");
              setProviderHealth("unconfigured");
              void fetch("/api/agent/capabilities")
                .then((response) => response.json())
                .then((value) => setProviderHealth(value.health))
                .catch(() => {});
              setAdaptation(
                "Your saved Passport is back. Refine a chapter for fresh suggestions.",
              );
            }}
          />
          {result && (
            <div className="topbar-actions">
              <span className="current-city">
                <Icon name="pin" size={14} />
                {city}
              </span>
              <button
                className="quiet-button"
                aria-label="Start a new Passport"
                onClick={fresh}
                disabled={busy}
              >
                <Icon name="plus" size={14} />
                <span className="new-passport-label">New Passport</span>
                <span className="new-passport-short" aria-hidden="true">
                  New
                </span>
              </button>
            </div>
          )}
        </nav>
      </header>
      <div className="progressive-content" id="passport-content" tabIndex={-1}>
        {!result && <StepIndicator step={step} />}
        {step === 1 && (
          <MoveForm
            city={city}
            origin={origin}
            draft={draft}
            disabled={busy}
            onCity={(value) => {
              setCity(value);
              resetMatches();
            }}
            onOrigin={setOrigin}
            onDraft={(values) => {
              setDraft(values);
              setConceptSeeds(
                values.filter((v) =>
                  /cuisine|coffee|bookstores|culture/i.test(v),
                ),
              );
              resetMatches();
            }}
            onSubmit={resolve}
          />
        )}
        {step === 2 && resolution && (
          <TasteConfirmation
            items={activeItems}
            chosen={chosen}
            disabled={busy}
            complete={complete}
            mode={initialMode}
            onMode={setInitialMode}
            onChoose={choose}
            onRemove={(index) => {
              setChosen((c) => {
                const next = { ...c };
                delete next[index];
                return next;
              });
              setRemoved((r) => [...r, index]);
            }}
            onReplace={() => setEditing(true)}
            onBack={() => setEditing(true)}
            onSubmit={generate}
          />
        )}
        {error && (
          <div className="error-message progressive-error" role="alert">
            <strong>Let’s try that again.</strong>
            <p>{error}</p>
            {!result && (
              <button
                className="text-button"
                onClick={() =>
                  void (resolution && complete ? generate() : resolve())
                }
                disabled={busy}
              >
                Try again
              </button>
            )}
          </div>
        )}
        {busy && <JourneyLoading phase={phase} detail={progress} />}
        {result && (
          <section
            className="living-passport"
            aria-labelledby="passport-title"
            aria-busy={busy}
          >
            <PassportCover
              passport={result}
              origin={origin}
              onConnections={() => {
                selectWorkspaceView("connections");
              }}
            />
            <div className="passport-toolbar">
              <div
                className="discovery-view-tabs"
                role="group"
                aria-label="Passport view"
              >
                <button
                  aria-pressed={workspaceView === "discover" && !showSaved}
                  onClick={() => {
                    selectWorkspaceView("discover");
                    setShowSaved(false);
                  }}
                >
                  Discover
                </button>
                <button
                  aria-pressed={workspaceView === "discover" && showSaved}
                  onClick={() => {
                    selectWorkspaceView("discover");
                    setShowSaved(true);
                  }}
                >
                  My Vibe <span>{result.session?.savedCards.length ?? 0}</span>
                </button>
                <button
                  aria-pressed={workspaceView === "plan"}
                  onClick={() => selectWorkspaceView("plan")}
                >
                  Plan a day
                </button>
                <button
                  aria-pressed={workspaceView === "preferences"}
                  onClick={() => selectWorkspaceView("preferences")}
                >
                  Preferences &amp; Together
                </button>
                <button
                  aria-pressed={workspaceView === "connections"}
                  onClick={() => selectWorkspaceView("connections")}
                >
                  Your connections
                </button>
              </div>
              <button
                className="assistant-launch"
                onClick={() => setAssistantOpen(true)}
                aria-expanded={assistantOpen}
                aria-controls="taste-concierge"
              >
                <Icon name="star" size={18} />
                Ask TastePassport
              </button>
            </div>
            {adaptation && (
              <div className="adaptation-notice" role="status">
                <Icon name="check" size={16} />
                <span>{adaptation}</span>
                <button
                  className="icon-button"
                  aria-label="Dismiss update"
                  onClick={() => setAdaptation("")}
                >
                  <Icon name="close" size={13} />
                </button>
              </div>
            )}
            <div
              id="view-discover"
              className="workspace-view-anchor"
              hidden={workspaceView !== "discover"}
            >
              {result.session && (
                <FamiliarityControl
                  session={result.session}
                  disabled={busy}
                  onChange={(input) => void refine(input)}
                />
              )}
            </div>
            {result.agent?.pending && (
              <div className="pending-concept">
                <strong>A little clarity for your next discovery</strong>
                <p>
                  Choose the meaning you had in mind for “
                  {result.agent.pending.query}”.
                </p>
                <button
                  className="quiet-button"
                  disabled={busy}
                  onClick={(e) => {
                    matchOpener.current = e.currentTarget;
                    setConceptDialog(true);
                  }}
                >
                  Choose a match <Icon name="arrow" />
                </button>
              </div>
            )}
            {result.session && (
              <RefinementRecovery
                session={result.session}
                disabled={busy}
                onApply={(input) => void refine(input)}
              />
            )}
            {result.session?.hiddenCategories.length ? (
              <p className="passport-mode">
                Hidden chapters: {result.session.hiddenCategories.join(", ")}.
                You can bring them back with manual refinement.
              </p>
            ) : null}
            <div hidden={workspaceView !== "discover"}>
              {showSaved ? (
                <SavedDiscoveries
                  cards={result.session?.savedCards ?? []}
                  feedback={feedback}
                  onFeedback={recordFeedback}
                  disabled={busy}
                />
              ) : (
                <>
                  <PassportSections
                    result={{
                      ...result,
                      cards: result.cards.filter(
                        (c) =>
                          !result.session?.hiddenCategories.includes(c.section),
                      ),
                    }}
                    feedback={feedback}
                    onFeedback={recordFeedback}
                    updates={updates}
                    updating={updating}
                  />
                </>
              )}
            </div>
            <div
              id="view-plan"
              className="workspace-panel"
              hidden={workspaceView !== "plan"}
            >
              <DayOutPlan
                key={`day-out:${result.session?.id ?? result.city}`}
                expanded={workspaceView === "plan"}
                passport={result}
                disabled={busy}
                signedIn={accountSignedIn}
              />
            </div>
            <div
              className="workspace-panel"
              id="view-preferences"
              hidden={workspaceView !== "preferences"}
            >
              <TasteIntelligence
                key={`intelligence:${result.session?.id ?? result.city}`}
                expanded={workspaceView === "preferences"}
                passport={result}
                busy={busy}
                onRefine={(input) => void refine(input)}
              />
            </div>
            <div
              className="workspace-panel"
              id="view-connections"
              hidden={workspaceView !== "connections"}
            >
              <details
                className="secondary-reveal cultural-reveal"
                open={workspaceView === "connections"}
              >
                <summary>
                  Why these suggestions? <Icon name="arrow" size={16} />
                </summary>
                <ConnectionExplorer
                  passport={result}
                  onExplore={(section) => {
                    setWorkspaceView("discover");
                    setShowSaved(false);
                    requestAnimationFrame(() =>
                      document
                        .getElementById(`section-${section}`)
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        }),
                    );
                  }}
                />
                {process.env.NODE_ENV === "development" && (
                  <details className="all-query-routes">
                    <summary>Technical recommendation details</summary>
                    <TranslationMap signals={signals} result={result} />
                  </details>
                )}
                <TasteDNA
                  signals={signals}
                  onRemove={removeSignal}
                  disabled={busy}
                />
              </details>
            </div>
            {result.session &&
              process.env.NODE_ENV === "development" &&
              conciergeAvailable &&
              result.session.comparison && (
                <details className="secondary-reveal comparison-reveal">
                  <summary>
                    Compare recommendation approaches{" "}
                    <Icon name="arrow" size={16} />
                  </summary>
                  <ModelComparison
                    key={result.session.id}
                    session={result.session}
                    available={conciergeAvailable}
                  />
                </details>
              )}
          </section>
        )}
      </div>
      <footer className="workspace-footer">
        <span>Move anywhere. Keep your vibe.</span>
        <nav aria-label="About TastePassport">
          <a href="/about">About us</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </footer>
      {result && (
        <ConciergeDrawer
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
        >
          <div
            className="concierge-tabs"
            role="tablist"
            aria-label="Refinement method"
          >
            <button
              role="tab"
              id="ask-tab"
              aria-controls="ask-panel"
              aria-selected={assistantTab === "ask"}
              onClick={() => setAssistantTab("ask")}
            >
              Ask
            </button>
            <button
              role="tab"
              id="manual-tab"
              aria-controls="manual-panel"
              aria-selected={assistantTab === "manual"}
              onClick={() => setAssistantTab("manual")}
            >
              Adjust filters
            </button>
          </div>
          <div className="concierge-body" ref={agentScroll}>
            {result.agent?.pending && (
              <div className="pending-concept">
                <strong>Choose what you meant</strong>
                <p>{result.agent.pending.query}</p>
                <div className="pending-match-options" aria-label="Matching interests">
                  {result.session?.pending?.candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      disabled={busy}
                      onClick={() => void refine({ tagChoice: candidate.id })}
                    >
                      {candidate.name}
                    </button>
                  ))}
                </div>
                <button
                  className="quiet-button"
                  disabled={busy}
                  onClick={(e) => {
                    matchOpener.current = e.currentTarget;
                    setConceptDialog(true);
                  }}
                >
                  Choose a match
                </button>
              </div>
            )}
            {assistantTab === "ask" ? (
              <div id="ask-panel" role="tabpanel" aria-labelledby="ask-tab">
                <p className="concierge-intro">
                  Tell us what you’d like to change.
                </p>
                {!conciergeAvailable && (
                  <p className="helper">
                    Live chat is unavailable. Use Adjust filters to keep
                    exploring.
                  </p>
                )}
                {!visibleMessages.length && (
                  <div
                    className="concierge-starters"
                    aria-label="Suggested requests"
                  >
                    <span className="micro-label">TRY A REQUEST</span>
                    {[
                      "Find somewhere quieter to eat",
                      "Show me something cultural",
                      "Help me explore a little further",
                    ].map((text) => (
                      <button
                        key={text}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setComposer(text);
                          document
                            .querySelector<HTMLTextAreaElement>(
                              "#conversation-input",
                            )
                            ?.focus();
                        }}
                      >
                        {text} <Icon name="arrow" size={15} />
                      </button>
                    ))}
                  </div>
                )}
                <div
                  className="conversation"
                  aria-label="Conversation history"
                  role="log"
                  aria-live="polite"
                >
                  {visibleMessages.map((m, i) => (
                    <div className={`message ${m.role}`} key={i}>
                      <span className="message-label">
                        {m.role === "agent" ? "TASTEPASSPORT" : "YOU"}
                      </span>
                      <p>{m.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                id="manual-panel"
                role="tabpanel"
                aria-labelledby="manual-tab"
              >
                {result.session && (
                  <GuidedRefinement
                    session={result.session}
                    disabled={busy}
                    onApply={(input) => void refine(input)}
                  />
                )}
              </div>
            )}
          </div>
          {assistantTab === "ask" && (
            <>
              {phase === "refining" && (
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => activeTurn.current?.abort()}
                >
                  Cancel refinement
                </button>
              )}
              {error && <p role="alert">{error}</p>}
              {retryInput && !busy && (
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => void refine(retryInput)}
                >
                  Retry last refinement
                </button>
              )}
              <form className="composer" onSubmit={submitConversation}>
                <label htmlFor="conversation-input" className="sr-only">
                  Ask TastePassport
                </label>
                <textarea
                  id="conversation-input"
                  placeholder="Show me something quieter…"
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  disabled={busy}
                  maxLength={1000}
                  rows={2}
                />
                <div className="composer-footer">
                  <span>Updates your current suggestions</span>
                  <button
                    type="submit"
                    aria-label="Send message"
                    disabled={busy || !composer.trim()}
                  >
                    <Icon name="send" size={17} />
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
          {visibleMessages.length > 0 && (
            <button
              className="text-button reset-conversation"
              disabled={busy}
              onClick={() => void refine({ reset: "conversation" })}
            >
              Reset conversation
            </button>
          )}
        </ConciergeDrawer>
      )}
      {rejectionId &&
        [...(result?.cards ?? []), ...(result?.session?.savedCards ?? [])].find(
          (c) => c.id === rejectionId,
        ) && (
          <FeedbackDialog
            card={
              [
                ...(result?.cards ?? []),
                ...(result?.session?.savedCards ?? []),
              ].find((c) => c.id === rejectionId)!
            }
            onClose={closeFeedback}
            onSubmit={(reason, detail) => {
              setRejectionId(undefined);
              void refine({
                feedback: { id: rejectionId, accepted: false, reason, detail },
              });
            }}
          />
        )}
      {conceptDialog && result?.agent?.pending && (
        <Disambiguation
          item={result.agent.pending}
          onClose={() => {
            setConceptDialog(false);
            requestAnimationFrame(() => matchOpener.current?.focus());
          }}
          onConfirm={(id) => {
            setConceptDialog(false);
            void refine({ tagChoice: id });
          }}
        />
      )}
      {dialog !== undefined && resolution && (
        <Disambiguation
          key={dialog}
          item={resolution.items[dialog]}
          current={chosen[dialog]}
          onConfirm={(id) => choose(dialog, id)}
          onClose={closeDialog}
        />
      )}
    </main>
  );
}
