"use client";

import {memo} from 'react';
import {Icon} from './passport';

function DiscoveryConcierge({city,firstName,busy,onAsk,onNavigate,onShare,onVibe}:{
  city:string;
  firstName?:string;
  busy:boolean;
  onAsk:(request?:string)=>void;
  onNavigate:(view:'plan'|'together')=>void;
  onShare:()=>void;
  onVibe:()=>void;
}) {
  return <section className="discovery-concierge discovery-welcome" aria-labelledby="discovery-concierge-title">
    <div className="discovery-concierge-copy">
      <span className="micro-label">YOUR PASSPORT IS READY</span>
      <h2 id="discovery-concierge-title">{firstName?`Welcome to ${city}, ${firstName}.`:`Welcome to ${city}.`}</h2>
      <p>I can help you choose from these discoveries, change what you see, or shape a day out. Tell me what you feel like doing.</p>
      <div className="discovery-welcome-actions">
        <button type="button" className="primary-button" disabled={busy} onClick={()=>onAsk()}>Ask FaveRoam <Icon name="arrow" size={16}/></button>
      </div>
    </div>
    <div className="discovery-quick-actions" aria-label="Next things to try">
      <button type="button" onClick={()=>onNavigate('plan')}><Icon name="pin" size={18}/><span>Plan my first week</span></button>
      <button type="button" onClick={()=>onNavigate('together')}><Icon name="star" size={18}/><span>Explore together</span></button>
      <button type="button" onClick={onShare}><Icon name="arrow" size={18}/><span>Share my tastes</span></button>
      <button type="button" onClick={onVibe}><Icon name="sparkles" size={18}/><span>Vibe Dial</span></button>
    </div>
  </section>;
}
export default memo(DiscoveryConcierge);
