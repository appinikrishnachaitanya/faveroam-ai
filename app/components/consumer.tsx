"use client";
import { useState } from "react";
import type { Passport } from "../../src/workspace/state";
import type { Candidate, Card } from "../../src/passport/model";
import { bridgeRoutes } from "../../src/passport/evidence";
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
          <span>{origin || "Your cultural world"}</span>
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
          See how your world connects <Icon name="arrow" size={15} />
        </button>
      </div>
      <div className="cover-art" aria-hidden="true">
        <div className="passport-book">
          <Icon name="globe" size={66} />
          <span>TASTE IS YOUR</span>
          <strong>PASSPORT</strong>
          <small>{passport.city}</small>
        </div>
        <div className="cover-stamp">
          <strong>{count}</strong>
          <span>
            Qloo-backed
            <br />
            discoveries
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
              signals={[]}
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
export function ConnectionExplorer({ passport }: { passport: Passport }) {
  const routes = bridgeRoutes(passport.cards, passport.selected);
  const [active, setActive] = useState<string>();
  const route = routes.find((r) => r.id === active) ?? routes[0];
  if (!route) return null;
  const cards = passport.cards
    .filter((c) => `${c.evidence?.queryId}:${c.section}` === route.id)
    .slice(0, 3);
  return (
    <section
      className="connection-explorer"
      aria-labelledby="connections-title"
    >
      <span className="micro-label">THE CONNECTION IS THE STORY</span>
      <h2 id="connections-title">Your world, translated.</h2>
      <p>
        These tastes were used together in a real Qloo query. Follow a route to
        see what came back.
      </p>
      <div
        className="connection-routes"
        role="group"
        aria-label="Cultural query connections"
      >
        {routes.map((r) => (
          <button
            key={r.id}
            aria-pressed={r.id === route.id}
            onClick={() => setActive(r.id)}
          >
            {r.section}
            <small>
              {r.mode === "familiar"
                ? "Close to home"
                : r.mode === "explore"
                  ? "Further afield"
                  : "A little of both"}{" "}
              · {r.count} discoveries
            </small>
          </button>
        ))}
      </div>
      <div className="connection-path">
        <div>
          {route.inputs.map((s: Candidate) => (
            <span key={s.id}>{s.name}</span>
          ))}
        </div>
        <Icon name="arrow" />
        <strong>Qloo</strong>
        <Icon name="arrow" />
        <div>
          <strong>{route.destination}</strong>
          <small>
            {route.locality === "audience-context"
              ? "City audience tastes, not local events"
              : route.section}
          </small>
        </div>
      </div>
      <ul className="connected-results">
        {cards.map((card) => (
          <li key={card.id}>
            <strong>{card.name}</strong>
            <span>{card.address || card.section}</span>
            <details>
              <summary>View this connection’s evidence</summary>
              <p>
                Returned in the same query that used the tastes above.
                Individual taste contribution is not supplied by Qloo.
              </p>
              <code>{card.evidence?.queryId}</code>
              <small>
                Recorded{" "}
                {card.evidence?.recordedAt
                  ? new Date(card.evidence.recordedAt).toLocaleDateString()
                  : "with this discovery"}
              </small>
            </details>
          </li>
        ))}
      </ul>
      <p className="connection-honesty">
        A recorded query-to-result connection—not an invented claim that one
        film or artist caused a particular recommendation.
      </p>
    </section>
  );
}
