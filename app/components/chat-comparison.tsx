import type { Card } from "../../src/passport/model";
import { sectionLabel } from "../../src/passport/labels";
import { isPlaceSection } from "../../src/passport/model";
import { formatReturnedRating } from "../../src/passport/rating-display";
import { chatReason } from "../../src/agent/chat-shortlist";

export default function ChatComparison({ cards }: { cards: Card[] }) {
  if (cards.length < 2) return null;
  return <section className="chat-comparison" aria-label="Side-by-side comparison">
    <div className="chat-comparison-heading"><span className="micro-label">SIDE BY SIDE</span><h3>Compare your two picks</h3><p>Only returned details are shown. A missing rating or detail is left open, not guessed.</p></div>
    <div className="chat-comparison-grid">
      {cards.slice(0, 2).map((card, index) => {
        const rating = isPlaceSection(card.section) ? card.intelligence?.quality?.businessRating : card.intelligence?.quality?.qlooRating;
        return <article key={card.id}>
          <span className="chat-choice-category">CHOICE {index + 1} · {sectionLabel(card.section)}</span>
          <h4>{card.name}</h4>
          {card.address && <p><strong>Location</strong><br />{card.address}</p>}
          <p><strong>{isPlaceSection(card.section) ? "Venue rating" : "Rating"}</strong><br />{rating === undefined ? "Not available" : `★ ${formatReturnedRating(rating)} / 5`}</p>
          <div className="chat-comparison-reason"><strong>Why it appeared</strong><p>{chatReason(card)}</p></div>
        </article>;
      })}
    </div>
    <p className="chat-comparison-footnote">These ratings may come from different sources, so compare them as context rather than a universal score.</p>
  </section>;
}
