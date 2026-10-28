import type { PassportDestination } from "./passport-navigation";

/** Small, decorative companions to the text labels; navigation never depends on colour alone. */
export function FlowNavIcon({ flow }: { flow: PassportDestination }) {
  const art = {
    discover: <><path d="M4 18q8-5 16 0" fill="none" stroke="#427f79" strokeWidth="2" strokeLinecap="round"/><path d="M12 3a6 6 0 0 0-6 6c0 4 6 10 6 10s6-6 6-10a6 6 0 0 0-6-6Z" fill="#edaa42" stroke="#bb7724" strokeWidth=".8"/><circle cx="12" cy="9" r="2" fill="#fff9e9"/></>,
    saved: <><path d="M12 20S3 14 3 8a4.7 4.7 0 0 1 9-1.4A4.7 4.7 0 0 1 21 8c0 6-9 12-9 12Z" fill="#e47c58" stroke="#b05b42" strokeWidth=".8"/><path d="m18.5 2 .5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5Z" fill="#edaa42"/></>,
    day: <><circle cx="12" cy="12" r="9" fill="#fff8e8" stroke="#427f79" strokeWidth="1.5"/><path d="M12 7v5l3 2" fill="none" stroke="#427f79" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="12" r="1" fill="#edaa42"/></>,
    plan: <><rect x="3" y="5" width="18" height="16" rx="3" fill="#fff8e8" stroke="#427f79" strokeWidth="1.5"/><path d="M3 9h18" stroke="#427f79" strokeWidth="1.5"/><path d="M7 3v4m10-4v4" stroke="#427f79" strokeWidth="2" strokeLinecap="round"/><rect x="7" y="12" width="4" height="4" rx="1" fill="#edaa42"/></>,
    preferences: <><path d="M3 6h18M3 12h18M3 18h18" stroke="#427f79" strokeWidth="1.7" strokeLinecap="round"/><circle cx="9" cy="6" r="2.5" fill="#edaa42" stroke="#b97829" strokeWidth=".7"/><circle cx="16" cy="12" r="2.5" fill="#edaa42" stroke="#b97829" strokeWidth=".7"/><circle cx="10" cy="18" r="2.5" fill="#edaa42" stroke="#b97829" strokeWidth=".7"/></>,
    together: <><circle cx="8" cy="7" r="3.3" fill="#427f79"/><circle cx="16" cy="7" r="3.3" fill="#edaa42"/><path d="M2.5 20v-2.5a5.5 5.5 0 0 1 9-4.3 5.5 5.5 0 0 1 10 4.3V20Z" fill="#427f79"/><path d="M12 14.5a5.5 5.5 0 0 1 9.5 3V20H12Z" fill="#edaa42"/></>,
    connections: <><path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2Z" fill="#edaa42" stroke="#b97829" strokeWidth=".8"/><circle cx="18.5" cy="5" r="1.5" fill="#427f79"/><circle cx="5" cy="18.5" r="1.5" fill="#427f79"/></>,
    shares: <><path d="M7 12 17 6M7 12l10 6" stroke="#427f79" strokeWidth="2" strokeLinecap="round"/><circle cx="5" cy="12" r="3" fill="#edaa42"/><circle cx="19" cy="5" r="3" fill="#427f79"/><circle cx="19" cy="19" r="3" fill="#e47c58"/></>,
  }[flow];
  return <span className="flow-nav-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" focusable="false">{art}</svg></span>;
}
