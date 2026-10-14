import type { Card } from "../../src/passport/model";
export default function EvidenceDetails({ card }: { card: Card }) {
  const e = card.evidence;
  if (!e || e.result.id !== card.id)
    return (
      <p className="evidence-missing">
        Query evidence is unavailable for this saved card. Rebuild your Passport
        to audit it.
      </p>
    );
  return (
    <details className="qloo-evidence">
      <summary>
        Qloo evidence <span>Inspect the receipt ↗</span>
      </summary>
      {e.strategyNote && <p className="mode-caption">{e.strategyNote}</p>}
      <dl>
        <dt>Source / operation</dt>
        <dd>Qloo · {e.operation}</dd>
        <dt>Discovery strategy</dt>
        <dd>
          {e.mode} · {e.pool} query pool
        </dd>
        <dt>Destination</dt>
        <dd>
          {e.destination} ·{" "}
          {e.locality === "physical-city"
            ? "physical place filter"
            : "audience taste context; not a local event"}
        </dd>
        <dt>Returned entity</dt>
        <dd>
          <code>{e.result.id}</code>
          <small>{e.result.type}</small>
        </dd>
        {e.result.geocode && (
          <>
            <dt>Returned locality</dt>
            <dd>{[...new Set(Object.values(e.result.geocode))].join(" · ")}</dd>
          </>
        )}
        {e.result.affinity && (
          <>
            <dt>Actual relevance field</dt>
            <dd>
              {e.result.affinity.field}: {e.result.affinity.value}
              <small>Raw Qloo value, not a probability.</small>
            </dd>
          </>
        )}
      </dl>
      <h5>Inputs actually sent</h5>
      <ul>
        {e.inputs.map((input, i) => (
          <li key={`${input.role}:${input.id}:${i}`}>
            <strong>{input.name}</strong>
            <small>
              {input.role} · {input.types.join(" · ")}
            </small>
            <code>{input.id}</code>
          </li>
        ))}
      </ul>
      {e.result.tags.length > 0 && (
        <>
          <h5>Returned category / tag metadata</h5>
          <ul className="evidence-tags">
            {e.result.tags.map((tag, i) => (
              <li key={`${tag.id}:${i}`}>
                <strong>{tag.name}</strong>
                <code>{tag.id}</code>
                {tag.type && <small>{tag.type}</small>}
              </li>
            ))}
          </ul>
        </>
      )}
      <details className="query-receipt">
        <summary>Query parameters</summary>
        <pre>{JSON.stringify(e.params, null, 2)}</pre>
        <small>
          Receipt {e.queryId} · {e.recordedAt}
        </small>
      </details>
      {e.ranking && (
        <details className="query-receipt">
          <summary>Subsequent Qloo shortlist ranking</summary>
          <pre>{JSON.stringify(e.ranking, null, 2)}</pre>
        </details>
      )}
    </details>
  );
}
