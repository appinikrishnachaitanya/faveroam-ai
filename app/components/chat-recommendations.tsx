"use client";
import { memo } from "react";
import { sectionLabel } from "../../src/passport/labels";

import type { Card } from "../../src/passport/model";
import { isPlaceSection } from "../../src/passport/model";
import { formatReturnedRating } from "../../src/passport/rating-display";
import { chatBroadening, chatReason, chatTasteEvidence } from "../../src/agent/chat-shortlist";
import { Icon } from "./passport";

export default memo(function ChatRecommendations({cards,confirmedIds,city,busy,savedIds,onAsk,onSave}:{
  cards:Card[];
  confirmedIds:string[];
  city:string;
  busy:boolean;
  savedIds:string[];
  onAsk:(question:string)=>void;
  onSave:(id:string)=>void;
}) {
  if(!cards.length)return null;
  return <div className="chat-recommendations" aria-label="Choices from your Passport">
    {cards.map((card,index)=>{
      const rating=formatReturnedRating(card.intelligence?.quality?.businessRating);
      const place=isPlaceSection(card.section);
      const location=card.address ?? card.intelligence?.location?.address;
      const saved=savedIds.includes(card.id);
      const taste=chatTasteEvidence(card,confirmedIds);const broader=chatBroadening(card);
      return <article key={card.id}>
        <span className="chat-choice-category">{index+1} · {card.section==="Music"?"Artist discovery":sectionLabel(card.section)}</span>
        <h3>{card.name}</h3>
        {broader&&<span className="chat-broader-badge">{broader.label}</span>}
        {(location || rating) && <p className="chat-choice-details">{location}{location && rating?" · ":""}{rating?`★ ${rating}/5`:""}</p>}
        {(taste.names.length>0||taste.requestNames.length>0) && <div className="chat-taste-path" aria-label="Taste connection">
          {taste.names.length>0&&<span><small>Your confirmed tastes</small><strong>{taste.names.join(' + ')}</strong></span>}
          {taste.names.length>0&&(taste.associated ? <><span className="chat-taste-link"><Icon name="arrow" size={14}/>Returned audience association</span><span><small>Your discovery</small><strong>{card.name}</strong></span><small>An audience connection, rather than proof of shared style or food preferences.</small></>
            : <small>Used in this search. No individual audience connection was returned for this result.</small>)}
          {taste.requestNames.length>0&&<small className="chat-request-inputs">Additional search signal, not a confirmed taste: {taste.requestNames.join(', ')}.</small>}
        </div>}
        <p className="chat-choice-reason">{chatReason(card,confirmedIds)}</p>
        <div className="chat-choice-actions">
          <button type="button" disabled={busy} onClick={()=>onAsk(`Why did you recommend ${card.name}?`)}>Why this one?</button>
          <button type="button" disabled={busy || saved} onClick={()=>onSave(card.id)}><Icon name="heart" size={14}/>{saved?"In My Vibe":"Save to My Vibe"}</button>
          <a href={place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([card.name,location,city].filter(Boolean).join(', '))}` : `https://www.google.com/search?q=${encodeURIComponent(card.name+' '+card.section)}`} target="_blank" rel="noreferrer">{place?"View place ↗":"Explore this ↗"}</a>
        </div>
      </article>;
    })}
    {cards.some(card=>chatBroadening(card))&&<small className="chat-recommendation-note">Within each activity, direct matches come first when available. Broader or unverified choices are labelled so you can decide whether to explore them.</small>}
    <small className="chat-recommendation-note">From your returned Passport discoveries. Check current prices, hours and availability before going.</small>
  </div>;
}, (previous,next)=>previous.city===next.city && previous.busy===next.busy &&
  previous.onAsk===next.onAsk && previous.onSave===next.onSave &&
  previous.confirmedIds.join()===next.confirmedIds.join() && previous.cards.length===next.cards.length && previous.cards.every((card,index)=>card===next.cards[index]) &&
  previous.savedIds.length===next.savedIds.length && previous.savedIds.every((id,index)=>id===next.savedIds[index]));
