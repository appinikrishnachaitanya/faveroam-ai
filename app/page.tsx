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
  destinations,
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
  const [city, setCity] = useState("");
  const [composer, setComposer] = useState("");
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [draft, setDraft] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [resolution, setResolution] = useState<Resolution>();
  const [chosen, setChosen] = useState<Record<number, string>>({});
  const [removed, setRemoved] = useState<number[]>([]);
  const [result, setResult] = useState<Passport>();

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
  const chatRef = useRef<HTMLDivElement>(null);
  const agentScroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (result?.session && !["healthy", "configured"].includes(providerHealth))
      agentScroll.current?.scrollTo({ top: 0 });
  }, [result?.agent?.sessionId, providerHealth]);
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
  const visibleMessages = result?.session?.history ?? messages;
  const conciergeAvailable =
    providerHealth === "healthy" || providerHealth === "configured";
  const operationLabel =
    phase === "interpreting"
      ? "Understanding your request…"
      : phase === "resolving"
        ? "Resolving cultural signals…"
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
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, result?.session?.history]);
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
      !/\b(?:i love|my tastes|i'm moving|i’m moving)\b/i.test(text)
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
        city: interpreted.intent.destination ?? city,
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
          text: `I’ve prepared an editable taste draft for ${parsed.city}. Check the phrases below before I look for Qloo entity or concept matches.`,
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
    if (!result?.agent || busy) return;
    setError("");
    setPhase("refining");
    setAgentEvents([]);
    setUpdating(
      input.feedback
        ? [
            result.cards.find((c) => c.id === input.feedback!.id)?.section,
          ].filter((s): s is Section => Boolean(s))
        : [],
    );
    try {
      const reply = await sendAgentTurn(result.agent, input, (event) => {
        setAgentEvents((events) => [...events, event]);
        const match = event.label.match(
          /(?:Updating|Ranking) your (Eat|Coffee|Music|Culture|Lifestyle) passport/,
        );
        if (match && event.status === "active")
          setUpdating((sections) => [
            ...new Set([...sections, match[1] as Section]),
          ]);
      });
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
      setError(
        e instanceof Error
          ? e.message
          : "Refinement is unavailable. Your passport is preserved.",
      );
      setPhase("ready");
      say(
        "Refinement is temporarily unavailable. Your existing TastePassport is still available. Try the guided controls.",
      );
    } finally {
      setUpdating([]);
    }
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
    if (!entry) return;
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
        history: messages,
      });
      setResult(r);
      setPhase("ready");
      say(
        r.cards.length
          ? `Your passport is ready: ${r.cards.length} discoveries${r.notices.length ? ", with a few query gaps" : ""}. Explore what feels like you.`
          : "No suitable discoveries were returned this time. Try editing your tastes or retry the query.",
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
    if (result?.agent)
      void fetch("/api/agent/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: result.agent.sessionId }),
      });
    setCity("");
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
  return (
    <main className="app-shell">
      <header className="workspace-topbar">
        <a className="brand" href="/">
          <span className="brand-symbol">
            <Icon name="star" size={22} />
          </span>
          <span>
            TastePassport <small>AI</small>
          </span>
        </a>
        <span className="topbar-caption">Move anywhere. Keep your vibe.</span>
        <button className="quiet-button" onClick={fresh} disabled={busy}>
          <Icon name="plus" size={14} />
          New Passport
        </button>
      </header>
      <div className="split-workspace">
        <aside className="agent-pane" aria-labelledby="agent-title">
          <div className="agent-heading">
            <span className="agent-avatar">
              <Icon name="star" size={22} />
            </span>
            <div>
              <h1 id="agent-title">Taste Concierge</h1>
              <p>
                <span className="live-dot" />
                Familiar culture. A new beginning.
              </p>
            </div>
          </div>
          <div className="destination-control">
            <Icon name="pin" size={16} />
            <label htmlFor="destination" className="sr-only">
              Destination city
            </label>
            <select
              id="destination"
              value={city}
              disabled={busy}
              onChange={(e) => {
                setCity(e.target.value);
                setResult(undefined);
                if (resolution) setPhase("confirming");
              }}
            >
              <option value="" disabled>
                Choose destination
              </option>
              {destinations.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <span>DESTINATION</span>
          </div>
          {busy && (
            <div className="agent-current-operation" role="status">
              <span className="activity-pulse" />
              {operationLabel}
            </div>
          )}
          <div className="agent-scroll" ref={agentScroll}>
            <p className="agent-mode" role="status">
              {conciergeAvailable
                ? "Taste Concierge · conversation and guided controls"
                : "Taste Concierge is temporarily unavailable. You can still refine your Passport."}
            </p>
            {result?.agent && (
              <button
                className="text-button reset-conversation"
                disabled={busy}
                onClick={() => void refine({ reset: "conversation" })}
              >
                Reset conversation
              </button>
            )}
            {result?.session && (
              <GuidedRefinement
                session={result.session}
                disabled={busy}
                onApply={(input) => void refine(input)}
              />
            )}
            {result?.session && (
              <RefinementRecovery
                session={result.session}
                disabled={busy}
                onApply={(input) => void refine(input)}
              />
            )}
            <div
              className="conversation"
              ref={chatRef}
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
            {phase === "idle" && (
              <div className="suggestion-prompts">
                <span className="micro-label">THE DEMO JOURNEY</span>
                <div className="persona-story">
                  <span>
                    BENGALURU <b>→</b> TORONTO
                  </span>
                  <p>
                    A software engineer starting a new chapter. Rahman on
                    repeat, Interstellar after work, Indian food and a good
                    coffee ritual.
                  </p>
                  <small>
                    Sample story — your Passport uses only the tastes you
                    choose.
                  </small>
                </div>
                <button
                  className="persona-start"
                  onClick={() => {
                    setCity("Toronto");
                    setDraft([
                      "A.R. Rahman",
                      "Interstellar",
                      "Indian cuisine",
                      "specialty coffee",
                      "independent culture",
                    ]);
                    setConceptSeeds([
                      "Indian cuisine",
                      "specialty coffee",
                      "independent culture",
                    ]);
                    setEditing(true);
                    resetMatches();
                  }}
                >
                  Start the Bengaluru → Toronto sample{" "}
                  <Icon name="arrow" size={16} />
                </button>
                <button
                  onClick={() => {
                    setDraft(["", "", ""]);
                    setEditing(true);
                    setPhase("review");
                  }}
                >
                  Enter tastes without conversation
                </button>
                <button
                  onClick={() =>
                    setComposer(
                      "I’m relocating from Bengaluru to Toronto. I love A.R. Rahman, Interstellar and Indian cuisine.",
                    )
                  }
                >
                  <Icon name="Music" size={15} />
                  Bring my music & film tastes
                </button>
                <button
                  onClick={() =>
                    setComposer(
                      "I’m moving to New York. I love Blue Tokai, The Strand and Interstellar.",
                    )
                  }
                >
                  <Icon name="Coffee" size={15} />
                  Find a familiar daily rhythm
                </button>
              </div>
            )}
            {draft.length > 0 && (
              <section className="draft-panel">
                <div className="small-heading">
                  <h2>Taste draft</h2>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => setEditing(!editing)}
                  >
                    {editing ? "Collapse" : "Edit / add"}
                  </button>
                </div>
                {editing ? (
                  <div className="draft-inputs">
                    {draft.map((s, i) => (
                      <div className="draft-row" key={i}>
                        <label className="sr-only" htmlFor={`taste-${i}`}>
                          Taste {i + 1}
                        </label>
                        <input
                          id={`taste-${i}`}
                          value={s}
                          maxLength={100}
                          disabled={busy}
                          onChange={(e) => updateDraft(i, e.target.value)}
                        />
                        <button
                          className="icon-button"
                          disabled={busy}
                          aria-label={`Remove taste ${i + 1}`}
                          onClick={() => {
                            setDraft((d) => d.filter((_, n) => i !== n));
                            resetMatches();
                          }}
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      className="text-button add-taste"
                      disabled={busy || draft.length >= 5}
                      onClick={() => {
                        setDraft((d) => [...d, ""]);
                        resetMatches();
                      }}
                    >
                      <Icon name="plus" size={14} />
                      Add a taste
                    </button>
                    <p className="helper">
                      Three to five named tastes. Edit phrases that split
                      incorrectly; broad interests may need a specific entity.
                    </p>
                  </div>
                ) : (
                  <div className="draft-tags">
                    {draft.map((s, i) => (
                      <span key={i}>{s}</span>
                    ))}
                  </div>
                )}
                {(!resolution || editing) && (
                  <button
                    className="primary-button"
                    disabled={
                      busy ||
                      draft.length < 3 ||
                      draft.length > 5 ||
                      draft.some((s) => !s.trim())
                    }
                    onClick={resolve}
                  >
                    {phase === "resolving"
                      ? "Resolving cultural signals…"
                      : "Resolve my tastes"}
                    <Icon name="arrow" />
                  </button>
                )}
              </section>
            )}
            {resolution && !editing && (
              <section
                className="resolution-panel"
                aria-labelledby="resolution-title"
              >
                <div className="small-heading">
                  <h2 id="resolution-title">Confirm your signals</h2>
                  <span>
                    {signals.length}/{activeItems.length}
                  </span>
                </div>
                {activeItems.map(({ item, index }) => {
                  const c = item.candidates.find(
                    (candidate) => candidate.id === chosen[index],
                  );
                  return (
                    <div
                      className={`resolution-row ${c ? "resolved" : ""}`}
                      key={index}
                    >
                      <span className="resolution-status">
                        {c ? (
                          <Icon name="check" size={14} />
                        ) : item.candidates.length ? (
                          "?"
                        ) : (
                          "!"
                        )}
                      </span>
                      <div>
                        <strong>{c?.name ?? item.query}</strong>
                        <small>
                          {c
                            ? typeLabel(c)
                            : item.candidates.length
                              ? `${item.candidates.length} matches · choose yours`
                              : "No match returned"}
                        </small>
                      </div>
                      {item.candidates.length ? (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={(e) => {
                            matchOpener.current = e.currentTarget;
                            setDialog(index);
                          }}
                        >
                          {c ? "Change" : "Choose"}
                        </button>
                      ) : (
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() => setEditing(true)}
                        >
                          Edit
                        </button>
                      )}
                      {!c && (
                        <button
                          className="icon-button"
                          disabled={busy}
                          aria-label={`Remove ${item.query} from selection`}
                          onClick={() => setRemoved((r) => [...r, index])}
                        >
                          <Icon name="close" size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {removed.length > 0 && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => setRemoved([])}
                  >
                    Restore removed tastes
                  </button>
                )}
                <button
                  className="primary-button"
                  disabled={!complete || busy || !city}
                  onClick={generate}
                >
                  {phase === "exploring"
                    ? "Exploring your new city…"
                    : result
                      ? "Refresh my passport"
                      : "Build your cultural bridge"}
                  <Icon name="arrow" />
                </button>
                {!complete && (
                  <p className="helper">
                    Confirm three to five distinct entities. Every remaining
                    taste needs your choice.
                  </p>
                )}
              </section>
            )}
            <ActivityFeed
              phase={phase}
              city={city}
              resolution={resolution}
              signals={signals}
              result={result}
              events={agentEvents}
            />
            {result?.agent?.pending && (
              <div className="pending-concept">
                <strong>Confirm a cultural concept</strong>
                <p>{result.agent.pending.query}</p>
                <button
                  className="primary-button"
                  onClick={(e) => {
                    matchOpener.current = e.currentTarget;
                    setConceptDialog(true);
                  }}
                  disabled={busy}
                >
                  Choose concept match <Icon name="arrow" />
                </button>
              </div>
            )}
            {result?.agent && (
              <p className="helper">
                Try “Tonight I want Indian food”, “rank my dining shortlist”, or
                “give me quieter cafés”. Refinements preserve other sections.
              </p>
            )}
            {error && (
              <div className="error-message" role="alert">
                <strong>Let’s try that again.</strong>
                <p>{error}</p>
                {resolution && complete ? (
                  <button className="text-button" onClick={generate}>
                    Retry exploration
                  </button>
                ) : (
                  draft.length >= 3 && (
                    <button className="text-button" onClick={resolve}>
                      Retry resolution
                    </button>
                  )
                )}
              </div>
            )}
          </div>
          <form className="composer" onSubmit={submitConversation}>
            <label htmlFor="conversation-input" className="sr-only">
              Tell me where you’re going and a few things you love
            </label>
            <textarea
              id="conversation-input"
              placeholder={
                result?.agent
                  ? "What would make this city feel more like you?"
                  : "Tell me where you’re going and a few things you love…"
              }
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              disabled={busy}
              maxLength={1000}
              rows={3}
            />
            <div className="composer-footer">
              <span>
                {result?.agent
                  ? "Taste Concierge · refine your current passport"
                  : "New message prepares an editable draft"}
              </span>
              <button
                type="submit"
                aria-label="Prepare taste draft"
                disabled={busy || !composer.trim()}
              >
                <Icon name="send" size={17} />
              </button>
            </div>
            <p>No account. Session profile · Qloo-backed discoveries.</p>
          </form>
        </aside>
        <section
          className="living-passport"
          aria-labelledby="passport-title"
          aria-busy={busy}
        >
          <div className="destination-banner">
            <div className="city-illustration" aria-hidden="true">
              <svg viewBox="0 0 360 160">
                <path d="M0 150h360M10 150V95h30v55M50 150V64h30v86M95 150V36h35v114M110 36V10M142 150V86h30v64M185 150V52h38v98M240 150V72h26v78M281 150V22h34v128M298 22V4M327 150V102h22v48" />
                <path
                  className="skyline-detail"
                  d="M57 78h16M57 90h16M57 102h16M101 54h21M101 67h21M101 80h21M192 67h24M192 80h24M287 40h22M287 52h22M287 64h22"
                />
              </svg>
            </div>
            <div className="destination-eyebrow">
              <Icon name="pin" size={14} />
              {city === "New York City"
                ? "YOUR NEXT CHAPTER"
                : "CULTURAL ONBOARDING"}
            </div>
            <div className="destination-title-row">
              <div>
                <h2 id="passport-title">
                  {city
                    ? `Your ${city} TastePassport`
                    : "Your culture. A new city."}
                </h2>
                <p>Your next chapter. Still unmistakably you.</p>
              </div>
              <span className={`workspace-status ${busy ? "working" : ""}`}>
                <span className="live-dot" />
                {phase === "ready"
                  ? "Passport ready"
                  : busy
                    ? "In progress"
                    : "Living passport"}
              </span>
            </div>
            <div className="destination-meta">
              <span>CULTURAL ONBOARDING</span>
              <span>Powered by Qloo</span>
            </div>
          </div>
          <TasteDNA signals={signals} onRemove={removeSignal} disabled={busy} />
          {result?.session && (
            <FamiliarityControl
              session={result.session}
              disabled={busy}
              onChange={(input) => void refine(input)}
            />
          )}
          <TranslationMap signals={signals} result={result} />
          {result?.session && (
            <ModelComparison
              key={result.session.id}
              session={result.session}
              cards={result.cards}
              available={conciergeAvailable}
            />
          )}

          {result?.session &&
            (result.session.hiddenCategories.length > 0 ||
              result.session.explorationMode === "shortlist") && (
              <p className="passport-mode">
                {result.session.explorationMode === "shortlist"
                  ? "Your cultural shortlist. "
                  : ""}
                {result.session.hiddenCategories.length > 0
                  ? `Hidden chapters · ${result.session.hiddenCategories.join(", ")}`
                  : ""}
              </p>
            )}

          {busy && phase !== "refining" && (
            <section
              className="exploration-state"
              role="status"
              aria-live="polite"
            >
              <div className="progress-track">
                <span />
              </div>
              <div>
                <span className="micro-label">
                  {phase === "interpreting"
                    ? "UNDERSTANDING YOUR REQUEST"
                    : phase === "resolving"
                      ? "LOOKING UP CULTURAL SIGNALS"
                      : "EXPLORING YOUR NEW CITY"}
                </span>
                <h3>
                  {phase === "interpreting"
                    ? "Preparing your cultural taste draft."
                    : phase === "resolving"
                      ? "Finding the entities behind your tastes."
                      : `Exploring ${city}…`}
                </h3>
                <p>
                  {phase === "interpreting"
                    ? "You’ll review the extracted tastes before any Qloo lookup."
                    : phase === "resolving"
                      ? "Matches appear after Qloo responds. You’ll confirm the intended entities."
                      : "Requesting local places and music suggestions. Categories appear only after results return."}
                </p>
              </div>
              <div className="skeleton-grid" aria-hidden="true">
                {[0, 1, 2].map((n) => (
                  <div key={n}>
                    <i />
                    <i />
                    <i />
                  </div>
                ))}
              </div>
            </section>
          )}
          {result ? (
            <PassportSections
              result={{
                ...result,
                cards: result.cards.filter(
                  (c) => !result.session?.hiddenCategories?.includes(c.section),
                ),
              }}
              feedback={feedback}
              onFeedback={recordFeedback}
              updates={updates}
              updating={updating}
            />
          ) : (
            !busy && (
              <section className="passport-empty">
                <span className="empty-symbol">
                  <Icon name="globe" size={28} />
                </span>
                <div>
                  <span className="micro-label">A CITY, THROUGH YOUR LENS</span>
                  <h3>
                    {signals.length
                      ? "Your taste DNA is taking shape."
                      : "Make a new city feel more like you."}
                  </h3>
                  <p>
                    {signals.length
                      ? "Confirm your remaining signals, then build your cultural passport."
                      : "Enter your tastes or start a conversation on the left. Your confirmed tastes will become a passport of real discoveries here."}
                  </p>
                </div>
                <span className="empty-ticket" aria-hidden="true">
                  TASTE
                  <br />
                  IS YOUR
                  <br />
                  <b>PASSPORT</b>
                </span>
              </section>
            )
          )}
          <details className="product-story">
            <summary>Why TastePassport?</summary>
            <p>
              Relocating means rebuilding familiar routines, culture, and
              discovery from scratch. TastePassport helps newcomers carry their
              existing tastes into a new city while gradually exploring beyond
              them.
            </p>
          </details>
          <footer className="workspace-footer">
            <span>
              <Icon name="star" size={12} />
              Move anywhere. Keep your vibe.
            </span>
            <span>Real signals. Room for discovery.</span>
          </footer>
        </section>
      </div>
      {rejectionId && result?.cards.find((c) => c.id === rejectionId) && (
        <FeedbackDialog
          card={result.cards.find((c) => c.id === rejectionId)!}
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
