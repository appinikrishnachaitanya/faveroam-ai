import type { Candidate, Card, Section } from "../../src/passport/model";
import {
  activities,
  typeLabel,
  visibleSections,
} from "../../src/workspace/state";
import type { AgentEvent } from "../../src/agent/types";
import type { Phase, Resolution, Passport } from "../../src/workspace/state";
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    star: (
      <>
        <path d="m12 2 2.3 6.5L21 11l-6.7 2.5L12 21l-2.3-7.5L3 11l6.7-2.5L12 2Z" />
        <path d="m20 2 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" />
      </>
    ),
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h16M14 6l6 6-6 6" />
      </>
    ),
    send: (
      <>
        <path d="m3 11 18-8-7 18-3-7-8-3Z" />
        <path d="m11 14 10-11" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    Eat: (
      <>
        <path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18M19 3v18M19 3c-4 0-4 10 0 10" />
      </>
    ),
    Coffee: (
      <>
        <path d="M3 8h13v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8ZM16 9h2a3 3 0 0 1 0 6h-2M6 3v2M11 3v2" />
      </>
    ),
    Music: (
      <>
        <path d="M9 17V5l11-2v12M9 8l11-2" />
        <ellipse cx="6" cy="18" rx="3" ry="2" />
        <ellipse cx="17" cy="16" rx="3" ry="2" />
      </>
    ),
    Culture: (
      <>
        <path d="m3 8 9-5 9 5H3ZM5 10v8M10 10v8M15 10v8M20 10v8M3 21h18" />
      </>
    ),
    Lifestyle: (
      <>
        <path d="M5 7h14l2 14H3L5 7ZM8 7V6a4 4 0 0 1 8 0v1" />
      </>
    ),
    heart: (
      <path d="M12 21S2 15 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 7-10 13-10 13Z" />
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.star}
    </svg>
  );
}
export function ActivityFeed({
  phase,
  city,
  resolution,
  signals,
  result,
  events = [],
}: {
  events?: AgentEvent[];
  phase: Phase;
  city: string;
  resolution?: Resolution;
  signals: Candidate[];
  result?: Passport;
}) {
  return (
    <section
      className="activity-feed"
      aria-label="Agent execution activity"
      aria-live="polite"
    >
      <div className="micro-label">
        LIVE ACTIVITY{" "}
        <span
          className={
            phase === "resolving" || phase === "exploring"
              ? "live-dot active"
              : "live-dot"
          }
        />
      </div>
      <ol>
        {activities(phase, city, resolution, signals, result).map((a, i) => (
          <li key={i} className={`activity-row ${a.state}`}>
            <span className="activity-icon">
              {a.state === "complete" ? (
                <Icon name="check" size={12} />
              ) : a.state === "attention" ? (
                "!"
              ) : a.state === "active" ? (
                <span className="activity-pulse" />
              ) : (
                <span className="waiting-dot" />
              )}
            </span>
            <span>{a.label}</span>
            <span className="sr-only">{a.state}</span>
          </li>
        ))}
      </ol>
      {events.length > 0 && (
        <>
          <div className="micro-label refinement-label">CURRENT REFINEMENT</div>
          <ol>
            {events.map((e, i) => (
              <li className={`activity-row ${e.status}`} key={i}>
                <span className="activity-icon">
                  {e.status === "complete" ? (
                    <Icon name="check" size={12} />
                  ) : e.status === "active" ? (
                    <span className="activity-pulse" />
                  ) : (
                    "!"
                  )}
                </span>
                {e.label}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
export function TasteDNA({
  signals,
  onRemove,
  disabled,
}: {
  signals: Candidate[];
  onRemove: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <section className="dna-panel" aria-labelledby="dna-title">
      <div className="panel-heading">
        <div>
          <span className="micro-label">THE CULTURAL THREAD</span>
          <h2 id="dna-title">Your taste DNA</h2>
        </div>
        <span className="count-pill">{signals.length} confirmed</span>
      </div>
      {signals.length ? (
        <div className="dna-cluster">
          {signals.map((s, i) => (
            <div className={`dna-chip tone-${i % 3}`} key={s.id}>
              <span className="signal-dot" />
              <div>
                <strong>{s.name}</strong>
                <small>{typeLabel(s)}</small>
              </div>
              <button
                type="button"
                onClick={() => onRemove(s.id)}
                disabled={disabled}
                aria-label={`Remove ${s.name}`}
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="dna-empty">
          <span className="orbital" aria-hidden="true">
            <i />
            <i />
            <i />
            <b>✳</b>
          </span>
          <p>
            Your world, in a few cultural signals.
            <br />
            <span>Confirmed Qloo matches will appear here.</span>
          </p>
        </div>
      )}
    </section>
  );
}
export function TranslationMap({
  signals,
  result,
}: {
  signals: Candidate[];
  result?: Passport;
}) {
  const sections = visibleSections(result?.cards ?? []);
  return (
    <section className="translation-panel" aria-labelledby="translation-title">
      <div className="panel-heading">
        <div>
          <span className="micro-label">TASTE TRANSLATION</span>
          <h2 id="translation-title">Your world. New possibilities.</h2>
        </div>
        <Icon name="globe" />
      </div>
      <div className="translation-columns">
        <div className="world-column">
          <span className="map-label">YOUR WORLD</span>
          {signals.length ? (
            signals.map((s) => (
              <span className="map-source" key={s.id}>
                {s.name}
              </span>
            ))
          ) : (
            <span className="map-placeholder">Your confirmed tastes</span>
          )}
        </div>
        <div className="map-bridge" aria-hidden="true">
          <svg viewBox="0 0 160 100" preserveAspectRatio="none">
            <path d="M0 15C45 15 30 50 80 50S120 15 160 15M0 50H160M0 85C45 85 30 50 80 50S120 85 160 85" />
          </svg>
          <span>
            <Icon name="star" size={24} />
            <b>Qloo</b>
          </span>
        </div>
        <div className="city-column">
          <span className="map-label">YOUR NEW CITY</span>
          {sections.length ? (
            sections.map((s) => (
              <span className="map-target" key={s}>
                <Icon name={s} size={14} />
                {s}
                <small>
                  {result!.cards.filter((c) => c.section === s).length}
                </small>
              </span>
            ))
          ) : (
            <span className="map-placeholder">Discoveries, when returned</span>
          )}
        </div>
      </div>
      <p className="provenance-note">
        {result
          ? "These sections use queries drawn from your confirmed taste profile. Individual taste-to-place links are not provided."
          : "A shared taste query connects your confirmed signals to returned discovery categories."}
      </p>
    </section>
  );
}
export type Feedback = "like" | "dislike";
export function DiscoveryCard({
  card,
  signals,
  feedback,
  onFeedback,
  live = false,
  disabled = false,
}: {
  live?: boolean;
  disabled?: boolean;
  card: Card;
  signals: Candidate[];
  feedback?: Feedback;
  onFeedback: (id: string, value: Feedback) => void;
}) {
  return (
    <article
      className={`discovery-card ${feedback === "dislike" ? "muted-card" : ""}`}
    >
      <div className="card-header">
        <span className="category-token">
          <Icon name={card.section} size={14} />
          {card.section}
        </span>
        <span className="card-type">{typeLabel(card)}</span>
      </div>
      <h4>{card.name}</h4>
      {card.address && (
        <p className="card-address">
          <Icon name="pin" size={13} />
          {card.address}
        </p>
      )}
      {card.description && (
        <p className="card-description">{card.description}</p>
      )}
      <details className="why-section">
        <summary>
          Why this surfaced <Icon name="plus" size={12} />
        </summary>
        <p>
          Returned by Qloo using the cultural inputs below. These are query
          inputs, not claims of individual contribution.
        </p>
        <div className="why-signals">
          {(card.inputSignals ?? signals.map((s) => s.name)).map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
        {card.affinity !== undefined && (
          <p className="affinity">
            Qloo affinity · {card.affinity.toFixed(3)}
            <small>Relative relevance, not a probability.</small>
          </p>
        )}
      </details>
      <div className="feedback-actions">
        <button
          type="button"
          disabled={disabled}
          aria-pressed={feedback === "like"}
          className={feedback === "like" ? "liked" : ""}
          onClick={() => onFeedback(card.id, "like")}
        >
          <Icon name="heart" size={14} />
          My vibe
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-pressed={feedback === "dislike"}
          className={feedback === "dislike" ? "disliked" : ""}
          onClick={() => onFeedback(card.id, "dislike")}
        >
          <Icon name="close" size={14} />
          Not my vibe
        </button>
      </div>
      {feedback && (
        <small className="feedback-note">
          {live
            ? "Preference recorded for this session. Rejected results are replaced when Qloo returns a suitable match."
            : "Preference saved for this session. Recommendations haven’t been replanned."}
        </small>
      )}
    </article>
  );
}
export function PassportSections({
  result,
  feedback,
  onFeedback,
  updates = {},
  updating = [],
}: {
  updates?: Partial<Record<Section, number>>;
  updating?: Section[];
  result: Passport;
  feedback: Record<string, Feedback>;
  onFeedback: (id: string, value: Feedback) => void;
}) {
  const sections = visibleSections(result.cards);
  return (
    <div className="passport-sections">
      {result.notices.length > 0 && (
        <aside className="partial-notice" role="status">
          <strong>Your passport is ready, with a few gaps.</strong>
          <p>
            Available discoveries are below. Some queries could not complete.
          </p>
          <details>
            <summary>View query notices</summary>
            {result.notices.map((n, i) => (
              <p key={i}>{n}</p>
            ))}
          </details>
        </aside>
      )}
      {!sections.length && (
        <div className="empty-results">
          <Icon name="globe" size={30} />
          <h3>No suitable discoveries yet.</h3>
          <p>
            Try another confirmed taste or retry later. We won’t fill your
            passport with guesses.
          </p>
        </div>
      )}
      {sections.map((s) => (
        <section
          className="result-section"
          key={`${s}:${updates[s] ?? 0}`}
          aria-busy={updating.includes(s)}
          aria-labelledby={`section-${s}`}
        >
          <div className="result-heading">
            <h3 id={`section-${s}`} tabIndex={-1}>
              <Icon name={s} />
              {s}
              <span>{result.cards.filter((c) => c.section === s).length}</span>
            </h3>
            <p>
              {s === "Music"
                ? "Taste suggestions with city context · not local concerts"
                : "Places selected from returned category tags"}
            </p>
          </div>
          {updating.includes(s) && (
            <p className="section-progress" role="status">
              Updating your {s} passport… Your current discoveries stay
              available.
            </p>
          )}
          <div className="discovery-grid">
            {result.cards
              .filter((c) => c.section === s)
              .map((c) => (
                <DiscoveryCard
                  key={c.id}
                  card={c}
                  signals={result.selected}
                  feedback={feedback[c.id]}
                  onFeedback={onFeedback}
                  live={Boolean(result.agent)}
                  disabled={updating.length > 0}
                />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
