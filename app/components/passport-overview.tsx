"use client";
import { useState } from "react";
import type { Passport } from "../../src/workspace/state";
import type { Candidate, Card, Section } from "../../src/passport/model";
import { bridgeRoutes } from "../../src/passport/evidence";
import { evidenceFacts } from "../../src/qloo/explanation";
import { DiscoveryCard, Icon } from "./passport";
import type { Feedback } from "./passport";
export function PassportCover({
  passport,
  origin,
  onConnections,
}: {
  passport: Passport;
  origin: string;
  onConnections: () => void;
}) {
  const count = passport.cards.filter(
    (c) => c.evidence?.source === "Qloo" && c.evidence.result.id === c.id,
  ).length;
  return (
    <header className="passport-cover">
      <div className="cover-copy">
        <span className="micro-label">MOVE ANYWHERE. KEEP YOUR VIBE.</span>
        <div className="cover-journey">
          <span>{origin || "Your interests"}</span>
          <Icon name="arrow" size={16} />
          <span>{passport.city}</span>
        </div>
        <h1 id="passport-title">
          Your {passport.city}
          <br />
          <em>TastePassport</em>
        </h1>
        <p>A new chapter, connected to the things you already love.</p>
        <div className="passport-taste-preview">
          {passport.selected.map((s) => (
            <span key={s.id}>{s.name}</span>
          ))}
        </div>
        <button className="cover-connection" onClick={onConnections}>
          Explore taste insights <Icon name="arrow" size={15} />
        </button>
      </div>
      <div className="cover-art" aria-hidden="true">
        <img className="cover-illustration" src="/illustrations/passport-journey.svg" width="520" height="350" alt="" />
        <div className="cover-stamp">
          <strong>{count}</strong>
          <span>
            discoveries
            <br />
            to explore
          </span>
        </div>
      </div>
    </header>
  );
}
export function SavedDiscoveries({
  cards,
  feedback,
  onFeedback,
  disabled,
}: {
  cards: Card[];
  feedback: Record<string, Feedback>;
  onFeedback: (id: string, value: Feedback) => void;
  disabled: boolean;
}) {
  return (
    <section className="my-vibe" aria-labelledby="saved-title">
      <div className="result-heading">
        <h2 id="saved-title">Your kind of places. Your kind of culture.</h2>
      </div>
      <p className="helper">
        My Vibe keeps discoveries you explicitly liked, even as other
        recommendations change. Save your Passport to keep them across visits.
      </p>
      {cards.length ? (
        <div className="discovery-grid">
          {cards.map((card) => (
            <DiscoveryCard
              key={card.id}
              card={card}
              feedback={feedback[card.id]}
              onFeedback={onFeedback}
              live
              disabled={disabled}
            />
          ))}
        </div>
      ) : (
        <div className="saved-empty">
          <Icon name="heart" size={30} />
          <h3>Something feels like you?</h3>
          <p>
            Choose My vibe on a discovery. It stays here and can guide your next
            refinement.
          </p>
        </div>
      )}
    </section>
  );
}
export function ConnectionExplorer({ passport, onExplore, onAsk }: { passport: Passport; onExplore?: (section: Section) => void; onAsk?: (question: string) => void }) {
  const allRoutes = bridgeRoutes(passport.cards, passport.selected);
  const [interest, setInterest] = useState<string>();
  const routes = allRoutes.filter((route) => !interest || route.inputs.some((input) => input.id === interest));
  const [active, setActive] = useState<string>();
  const route = routes.find((r) => r.id === active) ?? routes[0];
  if (!allRoutes.length) return null;
  if (!route) return <section className="connection-explorer"><h2>No current suggestions use this interest yet.</h2><button className="quiet-button" onClick={() => setInterest(undefined)}>Show all interests</button></section>;
  const cards = passport.cards
    .filter((c) => c.section === route.section && c.evidence?.source === "Qloo" && c.evidence.result.id === c.id)
    .filter((c) => !interest || c.evidence?.inputs.some((input) => input.id === interest))
    .slice(0, 3);
  return (
    <section
      className="connection-explorer"
      aria-labelledby="connections-title"
    >
      <span className="micro-label">YOUR TASTES, NEW POSSIBILITIES</span>
      <h2 id="connections-title">Explore beyond your favorites</h2>
      <p>
        Qloo used your selected cultural interests to return possibilities. Choose a category to see real suggestions, then ask why one appeared or explore the full list.
      </p>
      <div className="connection-interest-picker" role="group" aria-label="Explore connections from an interest">
        <button aria-pressed={!interest} onClick={() => setInterest(undefined)}>All interests</button>
        {passport.selected.filter((selected) => allRoutes.some((r) => r.inputs.some((input) => input.id === selected.id))).map((selected) => <button key={selected.id} aria-pressed={interest === selected.id} onClick={() => setInterest(selected.id)}>{selected.name}</button>)}
      </div>
      <p className="helper">Each category appears once. An interest used in a Qloo search does not prove it individually caused each result.</p>
      <div
        className="connection-routes"
        role="group"
        aria-label="Suggestions by category"
      >
        {routes.map((r) => (
          <button
            key={r.id}
            aria-pressed={r.id === route.id}
            onClick={() => setActive(r.id)}
          >
            {r.section}
            <small>
              {r.count} discoveries · {r.locality === "audience-context" ? "Cultural suggestions" : "Places to consider"}
            </small>
          </button>
        ))}
      </div>
      <div className="connection-path">
        <div>
          {route.inputs.filter((input) => !interest || input.id === interest).map((s: Candidate) => (
            <span key={s.id}>{s.name}</span>
          ))}
        </div>
        <Icon name="arrow" />
        <strong>Used to explore</strong>
        <Icon name="arrow" />
        <div>
          <strong>{route.locality === "audience-context" ? route.section : route.destination}</strong>
           <small>{route.locality === "audience-context" ? "Cultural suggestions, not local events" : "Destination-based place discovery"}</small>
        </div>
      </div>
      <ul className="connected-results">
        {cards.map((card) => (
          <li key={card.id}>
            <strong>{card.name}</strong>
            <span>{card.address || card.section}</span>
            <p className="helper">{card.evidence?.locality === "audience-context" ? "Returned cultural discovery · not a local event or verified individual taste match" : "Qloo-returned venue · confirm current details"}</p>
            <details>
              <summary>What Qloo actually used</summary>
              {(() => {
                const facts=evidenceFacts(card).filter(f=>/helped shape|returned tags include|Associated via cross-domain audience affinity with/.test(f)).slice(0,2);
                return facts.length ? facts.map(f=><p key={f}>{f}</p>) : <p>These interests were considered together. Individual contribution evidence was not returned for this suggestion.</p>;
              })()}
              <small>This search considered the interests above, but may not identify which one influenced the result.</small>
              <small>
                Recorded{" "}
                {card.evidence?.recordedAt
                  ? new Date(card.evidence.recordedAt).toLocaleDateString()
                  : "with this discovery"}
              </small>
            </details>
          {onAsk && <button type="button" className="quiet-button" onClick={() => onAsk(`Tell me about ${card.name}. Why is it in my Passport?`)}>Ask concierge about this <Icon name="arrow" size={14}/></button>}
           </li>
        ))}
      </ul>
      <div className="connection-actions">
        {onExplore && <button type="button" className="quiet-button connection-explore" onClick={() => onExplore(route.section)}>See all {route.section.toLowerCase()} results <Icon name="arrow" size={16}/></button>}
        {onAsk && <button type="button" className="quiet-button" onClick={() => onAsk(`List my current ${route.section === "Eat" ? "dining" : route.section.toLowerCase()} suggestions here`)}>List these in chat <Icon name="arrow" size={16}/></button>}
       </div>
      <p className="connection-honesty">
        These are returned suggestions, not predictions of what you will love. Ask the concierge to explain or refine a result.
      </p>
    </section>
  );
}
