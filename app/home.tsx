"use client";
import { refinementErrorMessage } from "../src/agent/customer-error";
import {generatePassport} from '../src/workspace/generation-browser';
import GenerationPreview from './components/generation-preview';
import { sectionLabel } from "../src/passport/labels";
import { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { validDestination } from "../src/workspace/location";
import { createLatestRequest } from "../src/workspace/latest-request";
import { AgentTurnError, sendAgentTurn } from "../src/agent/browser";
import type { Intent } from "../src/agent/types";
import type { AgentInput, Constraint } from "../src/agent/types";
import { FamiliarityControl, ModelComparison } from "./components/cultural";
import GuidedRefinement, { RefinementRecovery } from "./components/guided";
import FeedbackDialog from "./components/feedback";
import type { Section } from "../src/passport/model";
import type { Candidate } from "../src/passport/model";
import {
  confirmed,
  extractDraft,
  typeLabel,
  onboardingTastes,
  passportView,
} from "../src/workspace/state";
import type { Passport, Phase, Resolution } from "../src/workspace/state";
import {
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
import ChatRecommendations from "./components/chat-recommendations";
import ChatComparison from "./components/chat-comparison";
import ChatReply from "./components/chat-reply";
import VibeDial from './components/vibe-dial';
import ChatComposer from "./components/chat-composer";
import ConceptClarification from "./components/concept-clarification";
import DiscoveryConcierge from "./components/discovery-concierge";
import PassportNavigation from "./components/passport-navigation";
import { reviewMatches } from "../src/passport/matching";
import AccountControl from "./components/account";
import ReusableTastes from "./components/taste-profile";
import DayOutPlan from "./components/day-out";
import {dayOutOptions} from '../src/passport/day-out';
import TasteIntelligence from "./components/intelligence";
import { JourneyLoading, ToastNotice } from "./components/status";
import {
  PassportCover,
  SavedDiscoveries,
} from "./components/passport-overview";
import { sectionOrder } from "../src/workspace/state";
import TasteAnalysis from "./components/taste-analysis";
import {clusterPlaces} from '../src/passport/place-clusters';
import Rituals from "./components/rituals";
import PassportMap, {mappedPlaces} from './components/passport-map';
import FirstWeek from './components/first-week';
import ShareTasteCard from './components/share-taste-card';
import ShareManagement from './components/share-management';
import { rememberGuestPassport, restoreGuestPassport, clearGuestPassport } from "../src/workspace/guest-recovery";
import { rememberActiveSession, restoreActiveSession, clearActiveSession, rememberSavedSession, restoreSavedSession, clearSavedSession } from "../src/workspace/active-session";
import { accountRequest, showNotice } from "../src/account/browser";
import { saveOnboardingDraft, restoreOnboardingDraft, clearOnboardingDraft } from "../src/workspace/draft-recovery";
import type { Familiarity } from "../src/passport/evidence";
import type { SavedPlan } from "../src/account/plans";
import type { SavedFirstWeek } from "../src/account/first-weeks";
interface Message {
  role: "agent" | "user";
  text: string;
  recommendationIds?: string[];
  comparisonIds?: string[];
  checks?: {route:string;model:string;qlooOperations:number;validation:string;kept:Section[]};
}
const welcome: Message = {
  role: "agent",
  text: "From what you love to where you belong. Tell me your new city and one to five cultural tastes you love. We’ll build a bridge between your world and your next chapter.",
};
const verifyShareToken=(value:string)=>/^[a-zA-Z0-9_-]{32}$/.test(value);
async function post<T>(path: string, body: unknown, cancellation?: AbortSignal): Promise<T> {
  const signal = cancellation
    ? AbortSignal.any([cancellation, AbortSignal.timeout(95_000)])
    : AbortSignal.timeout(95_000);
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}
export default function Home({cartoKey=''}:{cartoKey?:string}) {
  const [chatProgress,setChatProgress]=useState('');
  const [chatNotice,setChatNotice]=useState('');
  const [generationPreviews,setGenerationPreviews]=useState<Partial<Record<Section,import('../src/passport/model').Card[]>>>({});
  const generationRequest=useRef<AbortController|null>(null);
  useEffect(()=>()=>generationRequest.current?.abort(),[]);
  const [tasteDraftVersion,setTasteDraftVersion]=useState(0);
  const [saveTastePrompt,setSaveTastePrompt]=useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [adaptation, setAdaptation] = useState("");
  const [recoveryStatus, setRecoveryStatus] = useState<"checking" | "expired" | "unavailable">();
  const [city, setCity] = useState("");
  const [origin, setOrigin] = useState("");
  const [initialMode, setInitialMode] = useState<Familiarity>("familiar");
  const [requestedActivities, setRequestedActivities] = useState<Section[]>([]);
  const [sharedPartnerTastes,setSharedPartnerTastes]=useState<string[]>([]);
  const sharedOfferShown=useRef(false);
  useEffect(()=>{
    const token=new URLSearchParams(window.location.search).get('together');
    if(!token||!verifyShareToken(token))return;
    const controller=new AbortController();
    void fetch(`/api/share?token=${encodeURIComponent(token)}`,{signal:controller.signal,cache:'no-store'}).then(response=>response.ok?response.json():undefined).then(data=>{
      if(!controller.signal.aborted&&Array.isArray(data?.snapshot?.interests))setSharedPartnerTastes(data.snapshot.interests.slice(0,3).map((interest:{name:string})=>interest.name));
    }).catch(()=>{});
    return ()=>controller.abort();
  },[]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantVisited, setAssistantVisited] = useState(false);
  useEffect(() => { if (assistantOpen) setAssistantVisited(true); }, [assistantOpen]);
  const [visitedViews, setVisitedViews] = useState<Set<string>>(() => new Set(["discover"]));
  const [planMode,setPlanMode]=useState<"week"|"day">("week");
  const [visitedPlanModes,setVisitedPlanModes]=useState<Set<"week"|"day">>(()=>new Set());
  const choosePlanMode=useCallback((mode:"week"|"day")=>{
    setVisitedPlanModes(current=>current.has(mode)?current:new Set([...current,mode]));
    setPlanMode(mode);
  },[]);
  const [planFrom,setPlanFrom]=useState<{cardId:string;sessionId?:string;nonce:number}>();
  const [ritualCardId,setRitualCardId]=useState<string>();
  const ritualInitialHandled=useCallback(()=>setRitualCardId(undefined),[]);
  const [selectedCluster,setSelectedCluster]=useState<string>();
  const [showMap,setShowMap]=useState(true);
  const [assistantTab, setAssistantTab] = useState<"ask" | "manual">("ask");
  const [composerPrompt, setComposerPrompt] = useState({text:"",version:0});
  const composerDraft = useRef("");
  const [showEarlierConversation, setShowEarlierConversation] = useState(false);
  const setComposer = (text:string) => {composerDraft.current=text;setComposerPrompt(previous=>({text,version:previous.version+1}));};
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [draft, setDraft] = useState<string[]>([]);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [passportRestoreComplete,setPassportRestoreComplete]=useState(false);
  const [editingPlan, setEditingPlan] = useState<{plan:SavedPlan;nonce:number}>();
  const [editingFirstWeek,setEditingFirstWeek]=useState<{week:SavedFirstWeek;nonce:number}>();
  // Keep editingPlan in sync after a save so the DayOut component never
  // re-populates from a stale plan (the root cause of the time-revert bug).
  useEffect(() => {
    const onPlansUpdated = (event: Event) => {
      const saved = (event as CustomEvent<{plan:SavedPlan}>).detail?.plan;
      if (!saved) return;
      setEditingPlan(current => {
        if (!current) return current;
        // Only update if this is the same plan (same city + same date or same id).
        const sameplan =
          current.plan.id === saved.id ||
          (current.plan.city === saved.city && current.plan.scheduled_date === saved.scheduled_date);
        if (!sameplan) return current;
        // Bump nonce so DayOut's useEffect re-fires with the fresh plan.
        return { plan: saved, nonce: (current.nonce) + 1 };
      });
    };
    window.addEventListener("tastepassport:plans-updated", onPlansUpdated);
    return () => window.removeEventListener("tastepassport:plans-updated", onPlansUpdated);
  }, []);
  const [phase, setPhase] = useState<Phase>("idle");
  const draftRequests = useRef<ReturnType<typeof createLatestRequest> | null>(null);
  if (!draftRequests.current) draftRequests.current = createLatestRequest();
  useEffect(() => () => draftRequests.current?.cancel(), []);
  useEffect(()=>{
    if(phase==='exploring')document.getElementById('generation-heading')?.focus();
  },[phase]);
  const [resolution, setResolution] = useState<Resolution>();
  const [chosen, setChosen] = useState<Record<number, string>>({});
  const [removed, setRemoved] = useState<number[]>([]);
  const [result, setResult] = useState<Passport>();
  useEffect(()=>{
    if(!result)return;
    const sessionId=result.agent?.sessionId??result.session?.id;
    if(!sessionId)return;
    const key=`tastepassport:assistant-welcomed:${sessionId}`;
    try{if(window.sessionStorage.getItem(key))return;window.sessionStorage.setItem(key,'1');}catch{}
    document.querySelector<HTMLButtonElement>('.assistant-launch')?.focus();
    setAssistantTab('ask');
    setAssistantOpen(true);
  },[result?.agent?.sessionId,result?.session?.id]);
  useEffect(()=>{if(result&&sharedPartnerTastes.length&&!sharedOfferShown.current){sharedOfferShown.current=true;setShowSaved(false);setWorkspaceView('together');}},[result,sharedPartnerTastes]);
  const [workspaceView, setWorkspaceView] = useState<
    "discover" | "plan" | "preferences" | "together" | "connections" | "shares"
  >("discover");
  const [vibeDialOpen,setVibeDialOpen]=useState(false);
  const [accountSignedIn, setAccountSignedIn] = useState(false);
  const [accountFirstName, setAccountFirstName] = useState("");
  const [savePlanRequest, setSavePlanRequest] = useState(0);
  const [savedSessionId, setSavedSessionId] = useState<string>();
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  const recoveryRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    setSavedSessionId(restoreSavedSession(window.sessionStorage));
    if (!restoreGuestPassport(window.sessionStorage)) {
      const saved = restoreOnboardingDraft(window.sessionStorage);
      if (saved) {
        setCity(saved.city);
        setOrigin(saved.origin);
        setDraft(saved.tastes);
        setRequestedActivities(saved.activities);
        setAdaptation("Your unfinished taste draft was restored in this tab. Check it before finding matches.");
      }
    }
    setDraftHydrated(true);
  }, []);
  useEffect(() => {
    if (!draftHydrated || result) return;
    saveOnboardingDraft(window.sessionStorage, {city,origin,tastes:draft,activities:requestedActivities});
  }, [draftHydrated,result,city,origin,draft,requestedActivities]);

  // Browser-tab fallback for unexpected React view failures. This is NOT a
  // substitute for shared Supabase session persistence; the server still
  // checks the session revision before any subsequent edit or save.
  useEffect(() => {
    const recovered=restoreGuestPassport(window.sessionStorage);
    if (!recovered) {
      const sessionId=restoreActiveSession(window.sessionStorage);
      if (!sessionId) {setPassportRestoreComplete(true);return;}
      const controller=new AbortController();
      void fetch("/api/agent/session", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId}),signal:controller.signal})
        .then(async response=>{
          if (!response.ok) { if(response.status===410)clearActiveSession(window.sessionStorage); return; }
          const data=await response.json();
          if (!controller.signal.aborted && data.passport?.agent?.sessionId===sessionId) {
            setResult(data.passport);setCity(data.passport.city);setDraft(data.passport.selected.map((taste:{name:string})=>taste.name));
            setRequestedActivities((data.passport.session?.activeCategories ?? []).filter((section:Section)=>!data.passport.session?.hiddenCategories.includes(section)));
            setInitialMode(data.passport.session?.discoveryMode ?? "familiar");
            setConstraints(data.passport.session?.constraints ?? []);
            setPhase("ready");setRecoveryStatus(undefined);
          }
        }).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setPassportRestoreComplete(true);});
      return ()=>controller.abort();
    }
    setResult(current => current ?? recovered);
    setCity(current => current || recovered.city);
    setDraft(recovered.selected.map(taste => taste.name));
    setConceptSeeds(recovered.selected.filter(taste => taste.id.startsWith("urn:tag:")).map(taste => taste.name));
    setRequestedActivities((recovered.session?.activeCategories ?? []).filter(section=>!recovered.session?.hiddenCategories.includes(section)));
    setInitialMode(recovered.session?.discoveryMode ?? "familiar");
    setConstraints(recovered.session?.constraints ?? []);
    setPhase("ready");
    setPassportRestoreComplete(true);
    const controller = new AbortController();
    void reconnectPassport(recovered, controller.signal);
    return () => controller.abort();
  }, []);
  async function reconnectPassport(passport: Passport, signal?: AbortSignal) {
    if (!passport.agent) return;
    recoveryRequest.current?.abort();
    const controller = new AbortController();
    recoveryRequest.current = controller;
    const requestSignal = AbortSignal.any([controller.signal, AbortSignal.timeout(20_000), ...(signal ? [signal] : [])]);
    setRecoveryStatus("checking");
    try {
      const response = await fetch("/api/agent/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: passport.agent.sessionId }),
        signal: requestSignal,
      });
      if (signal?.aborted || controller.signal.aborted || recoveryRequest.current !== controller) return;
      if (!response.ok) { setRecoveryStatus(response.status === 410 ? "expired" : "unavailable"); return; }
      const data = await response.json();
      if (signal?.aborted || controller.signal.aborted || recoveryRequest.current !== controller) return;
      if (!data.passport?.agent || data.passport.agent.sessionId !== passport.agent.sessionId) throw Error();
      setResult(current => current?.agent?.sessionId === passport.agent?.sessionId &&
        data.passport.agent.revision >= (current?.agent?.revision ?? -1) ? data.passport : current);
      setRecoveryStatus(undefined);
    } catch { if (!signal?.aborted && !controller.signal.aborted && recoveryRequest.current === controller) setRecoveryStatus("unavailable"); }
  }
  // Effects run only after a successful commit. If new results crash a render,
  // the last successfully rendered guest Passport remains recoverable.
  useEffect(() => {
    if (accountSignedIn) {
      if (result?.agent) rememberActiveSession(window.sessionStorage, result.agent.sessionId);
      clearGuestPassport(window.sessionStorage);
      return;
    }
    if (result) rememberGuestPassport(window.sessionStorage, result);
  }, [result, accountSignedIn]);
  useEffect(() => {
    if (!accountSignedIn || !result?.agent || savedSessionId !== result.agent.sessionId) return;
    const { sessionId, revision } = result.agent;
    const timer = window.setTimeout(() => {
      saveQueue.current = saveQueue.current.catch(()=>{}).then(async () => {
        const response = await fetch("/api/account/passports", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",sessionId,revision})});
        if (!response.ok && response.status !== 409) showNotice("Your latest Passport changes could not be saved. Use Save Passport to try again.","error");
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [accountSignedIn, result, savedSessionId]);

  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<number>();
  const [editing, setEditing] = useState(false);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [conceptSeeds, setConceptSeeds] = useState<string[]>([]);
  const [providerHealth, setProviderHealth] = useState("unconfigured");
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
  const stopAgentRequest = useCallback(()=>activeTurn.current?.abort(),[]);
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
  // Prepare local-only panels between interactions, never on the first click.
  // Account data and provider searches remain user-triggered. Transition priority
  // lets typing/navigation interrupt this work, unlike eager mounting everything.
  useEffect(() => {
    if (!result || busy) return;
    let cancelled = false;
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Prepare the planner shell first. Its day/week editors remain unmounted
    // until selected; heavier insight panels can be prepared afterward.
    const queue = ["plan", "preferences", "connections"];
    const prepare = () => {
      if (cancelled) return;
      const next = queue.shift();
      if (!next) return;
      startTransition(() => setVisitedViews(current => current.has(next) ? current : new Set([...current, next])));
      schedule();
    };
    const schedule = () => {
      if (!queue.length || cancelled) return;
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(prepare);
      else timer = setTimeout(prepare, 250);
    };
    schedule();
    return () => {
      cancelled = true;
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [result?.agent?.sessionId, result?.city, busy]);
  const signals = result?.session?.selected ?? confirmed(resolution, chosen);
  const feedback: Record<string, Feedback> = useMemo(()=>Object.fromEntries(
    (result?.session?.feedback ?? []).map((f) => [
      f.id,
      f.accepted ? "like" : "dislike",
    ]),
  ),[result?.session?.feedback]);
  const sessionHistory = result?.session?.history ?? [];
  const conversationStart = sessionHistory.findIndex(
    (message) => message.role === "user",
  );
  const committedMessages = result
    ? conversationStart < 0
      ? [{role:'agent' as const,text:`Welcome to ${result.city}. I can help you choose from your discoveries, change a preference, or plan an outing. What would you like to do first?`}]
      : sessionHistory.slice(conversationStart)
    : messages;
  const missingSections = (result?.session?.activeCategories ?? []).filter(section =>
    !result?.session?.hiddenCategories?.includes(section) && !result?.cards.some(card => card.section === section));
  const visibleMessages = retryInput?.message
    ? [
        ...committedMessages,
        { role: "user" as const, text: retryInput.message },
      ]
    : committedMessages;
  const displayedMessages = showEarlierConversation || visibleMessages.length <= 24
    ? visibleMessages
    : visibleMessages.slice(-24);
  const conciergeAvailable =
    providerHealth === "healthy" || providerHealth === "configured";
  const activeItems =
    resolution?.items
      .map((item, index) => ({ item, index }))
      .filter(({ index }) => !removed.includes(index)) ?? [];
  const complete =
    activeItems.length >= 1 &&
    activeItems.every(({ index }) => chosen[index]) &&
    new Set(signals.map((s) => s.id)).size === signals.length;
  useEffect(() => {
    const body = agentScroll.current;
    if (!assistantOpen || !body) return;
    body.scrollTop =
      assistantTab === "ask" ? body.scrollHeight : 0;
  }, [
    assistantOpen,
    assistantTab,
    messages,
    result?.session?.history,
    result?.agent?.pending,
  ]);
  useEffect(() => {
    setVisitedViews(new Set(["discover"]));
    setVisitedPlanModes(new Set());
    setShowEarlierConversation(false);
  }, [result?.session?.id]);
  function say(text: string) {
    setMessages((m) => [...m, { role: "agent", text }]);
  }
  function resetMatches(nextPhase: Phase = "review") {
    draftRequests.current?.cancel();
    setResolution(undefined);
    setChosen({});
    setRemoved([]);
    setResult(undefined);
    setPhase(nextPhase);
    setError("");
    setUpdating([]);
  }
  async function submitConversation(text: string) {
    if (!text.trim() || busy || recoveryStatus === "checking") return;
    text = text.trim();
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
    const request = draftRequests.current!.start();
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
      }, request.signal);
      if (!draftRequests.current?.isCurrent(request)) return;
      const combined = onboardingTastes(interpreted.intent);
      const parsed = {
        city: validDestination(interpreted.intent.destination ?? city) ? (interpreted.intent.destination ?? city) : "",
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
      if (!draftRequests.current?.isCurrent(request)) return;
      setError(
        e instanceof Error ? e.message : "Could not interpret the request.",
      );
      setPhase("error");
    } finally {
      if (draftRequests.current?.isCurrent(request)) draftRequests.current.cancel();
    }
  }
  const submitConversationHandler = useRef(submitConversation);
  useLayoutEffect(() => {
    submitConversationHandler.current = submitConversation;
  });
  const sendComposerMessage = useCallback((text: string) => {
    void submitConversationHandler.current(text);
  }, []);
  async function refine(input: AgentInput) {
    if (!result?.agent || busy || activeTurn.current || recoveryStatus === "checking") return;
    const controller = new AbortController();
    activeTurn.current = controller;
    setChatNotice("");
    setRetryInput(input);
    setError("");
    setPhase("refining");
    setChatProgress('Looking at your request…');
    setUpdating(
      input.feedback && !input.feedback.accepted
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
          setChatProgress(event.label);
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
      if (reply.action === "plan-day" || reply.action === "save-plan") {
        choosePlanMode("day");
        setAssistantOpen(false);
        selectWorkspaceView("plan");
        if(reply.action === "save-plan")setSavePlanRequest(current=>current+1);
      }
      if(reply.action === "open-preferences" || reply.action === "open-vibe" || reply.action === "open-discover" || reply.action === "open-together" || reply.action === "open-insights") {
        setAssistantOpen(false);
        setShowSaved(reply.action === "open-vibe");
        if(reply.action === "open-vibe")setVisitedViews(current=>new Set([...current,"saved"]));
        selectWorkspaceView(reply.action === "open-preferences"?"preferences":reply.action === "open-together"?"together":reply.action === "open-insights"?"connections":"discover");
      }
      if (reply.action === "save-passport") {
        if (!accountSignedIn) {
          window.dispatchEvent(new Event("tastepassport:save-passport"));
        } else {
          try {
            await accountRequest("/api/account/passports",{action:"save",sessionId:reply.state.id,revision:reply.state.revision});
            rememberSavedSession(window.sessionStorage,reply.state.id);
            setSavedSessionId(reply.state.id);
            showNotice("Your Passport is saved to your account.");
          } catch (saveError) {
            showNotice(saveError instanceof Error?saveError.message:"Your Passport could not be saved. Please try again.","error");
          }
        }
      }
      if (input.reset) {
        setMessages([welcome]);
        setComposer("");
        setConstraints([]);
        setConceptSeeds([]);
        setConceptDialog(false);
        setRejectionId(undefined);
        setUpdates({});
      }
      setPhase("ready");
      if (input.feedback && !input.feedback.accepted)
        requestAnimationFrame(() =>
          document
            .getElementById(`section-${reply.state.feedback.at(-1)?.section}`)
            ?.focus(),
        );
      return true;
    } catch (e) {
      if (activeTurn.current !== controller) return;
      if (controller.signal.aborted) {
        setError("");
        setRetryInput(undefined);
        setChatNotice("Stopped waiting for this request. You can keep exploring or ask something else.");
        return;
      }
      setError(refinementErrorMessage(e));
      if ((e instanceof AgentTurnError && ["SESSION_EXPIRED", "SESSION_MISSING"].includes(e.code)) || (e instanceof Error && /session.*expired/i.test(e.message))) {
        setRecoveryStatus("expired");
        setRetryInput(undefined);
      } else if (e instanceof AgentTurnError && e.code === "SESSION_CHANGED") {
        void reconnectPassport(result);
      }
      setPhase("ready");
      say(
        "Your discoveries are still here. You can try your request again or keep exploring.",
      );
      return false;
    } finally {
      if (activeTurn.current === controller) {
        activeTurn.current = null;
        setPhase("ready");
        setUpdating([]);
      }
    }
  }

  function selectWorkspaceView(next: typeof workspaceView) {
    setVisitedViews(current => current.has(next) ? current : new Set([...current, next]));
    setWorkspaceView(next);
    requestAnimationFrame(() =>
      document.getElementById(`view-${next === "together" ? "preferences" : next}`)?.scrollIntoView({
        behavior: "instant",
        block: "start",
      }),
    );
  }
  async function resolve(sample?:string[]) {
    const queries = (sample??draft).map((s) => s.trim()).filter(Boolean);
    if (
      queries.length < 1 ||
      queries.length > 5 ||
      new Set(queries.map((s) => s.toLowerCase())).size !== queries.length
    ) {
      setError("Keep one to five different tastes in your draft.");
      return;
    }
    resetMatches("resolving");
    const request = draftRequests.current!.start();
    setEditing(false);
    say(
      "I’m looking up your cultural signals. You’ll choose the intended match for each taste.",
    );
    try {
      const r = await post<Resolution>("/api/agent/resolve", {
        seeds: queries,
        concepts: sample ? ["Indian cuisine"] : conceptSeeds,
      }, request.signal);
      if (!draftRequests.current?.isCurrent(request)) return;
      setResolution(r);
      setChosen(reviewMatches(r.items));
      setPhase("confirming");
      say(
        r.items.some((i) => !i.candidates.length)
          ? "Some tastes didn’t return matches. Edit them or remove them, keeping at least one. The available matches are ready to confirm."
          : "Your matches are ready. Confirm each intended entity to bring your taste DNA into focus.",
      );
    } catch (e) {
      if (!draftRequests.current?.isCurrent(request)) return;
      setError(
        e instanceof Error ? e.message : "Could not resolve your tastes.",
      );
      setPhase("error");
      say(
        "The taste lookup couldn’t complete. Your draft is still here; you can retry.",
      );
    } finally {
      if (draftRequests.current?.isCurrent(request)) draftRequests.current.cancel();
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
        "Taste draft updated. Confirm at least one tastes to rebuild your Passport.",
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
      `Removed ${name ?? "that taste"} from the current selection. Keep at least one confirmed tastes to continue.`,
    );
  }
  async function generate() {
    if (!resolution || !complete || busy || !city || generationRequest.current) return;
    const controller=new AbortController();generationRequest.current=controller;
    setError("");
    setResult(undefined);
    setGenerationPreviews({});
    setUpdating([]);
    setPhase("exploring");
    say(
      `I’m exploring ${city} using your confirmed tastes and chosen activities.`,
    );
    try {
      const r = await generatePassport({
        city,
        token: resolution.token,
        ids: signals.map((s) => s.id),
        constraints,
        activities: requestedActivities,
        mode: initialMode,
        // Onboarding progress is not assistant chat history.
        history: [],
      },(section,cards)=>{if(generationRequest.current===controller&&!controller.signal.aborted)setGenerationPreviews(current=>({...current,[section]:cards}));},controller.signal);
      if(generationRequest.current!==controller||controller.signal.aborted)return;
      const passport = r;
      setResult(passport);
      setPhase("ready");
      say(
        r.cards.length
          ? `Your passport is ready: ${r.cards.length} discoveries${r.notices.length ? ", with a few categories unavailable" : ""}. Explore what feels like you.`
          : "No suitable discoveries were returned this time. Try editing your tastes or try again.",
      );
    } catch (e) {
      if(generationRequest.current!==controller||controller.signal.aborted)return;
      setError(
        e instanceof Error ? e.message : "Could not build your passport.",
      );
      setPhase("error");
      say(
        "Exploration couldn’t complete. Your confirmed tastes are preserved for a retry.",
      );
    } finally {
      if(generationRequest.current===controller)generationRequest.current=null;
    }
  }
  async function recordFeedback(id: string, value: Feedback) {
    if (busy) return;
    if (value === "dislike") {
      feedbackOpener.current = document.activeElement as HTMLElement;
      setRejectionId(id);
    } else
      {
        const prior=result;
        const wasSaved=feedback[id]==="like"||Boolean(prior?.session?.savedCards.some(item=>item.id===id));
        if(prior){
          const nextFeedback={...feedback,[id]:wasSaved?undefined:"like"};
          const card=prior.cards.find(item=>item.id===id);
          const saved=new Map((prior.session?.savedCards??[]).map(item=>[item.id,item]));
          if(wasSaved)saved.delete(id);else if(card)saved.set(id,card);
          setResult({...prior,session:prior.session?{...prior.session,feedback:[...prior.session.feedback.filter(item=>item.id!==id),...(nextFeedback[id]==="like"?[{id,section:card?.section??"Eat",accepted:true}]:[])],savedCards:[...saved.values()]}:prior.session});
        }
        const saved=await refine({feedback:{id,accepted:true,clear:wasSaved}});
        if(saved===false&&prior)setResult(prior);
      }
  }
  const feedbackHandler = useRef(recordFeedback);
  useLayoutEffect(()=>{feedbackHandler.current=recordFeedback;});
  const stableFeedback = useCallback((id:string,value:Feedback)=>feedbackHandler.current(id,value),[]);
  const visibleCards = useMemo(
    () => result?.cards.filter(card => !result.session?.hiddenCategories.includes(card.section)) ?? [],
    [result?.cards, result?.session?.hiddenCategories],
  );
  const visibleResult = useMemo(
    () => result ? { ...result, cards: visibleCards } : undefined,
    [result, visibleCards],
  );
  const mappedPlaceCount = useMemo(()=>mappedPlaces(visibleCards).length,[visibleCards]);
  const plannableCards=useMemo(()=>result?dayOutOptions(result.cards,result.city):[],[result?.cards,result?.city]);
  const plannableIds=useMemo(()=>new Set(plannableCards.map(card=>card.id)),[plannableCards]);
  const placeClusters=useMemo(()=>clusterPlaces(visibleCards),[visibleCards]);
  const activeCluster=placeClusters.find(cluster=>cluster.id===selectedCluster);
  const clusteredResult=useMemo(()=>visibleResult&&activeCluster?{...visibleResult,cards:activeCluster.cards}:visibleResult,[visibleResult,activeCluster]);
  const openMappedCard = useCallback((card:import('../src/passport/model').Card)=>{
    setSelectedCluster(undefined);
    window.setTimeout(()=>[...document.querySelectorAll<HTMLElement>('[data-entity-id]')].find(element=>element.dataset.entityId===card.id)?.scrollIntoView({behavior:'smooth',block:'center'}),50);
  },[]);
  const panelActions = useRef({refine,selectWorkspaceView});
  useLayoutEffect(()=>{panelActions.current={refine,selectWorkspaceView};});
  const planFromMap=useCallback((card:import('../src/passport/model').Card)=>{setEditingPlan(undefined);setPlanFrom(current=>({cardId:card.id,sessionId:result?.session?.id,nonce:(current?.nonce??0)+1}));choosePlanMode('day');panelActions.current.selectWorkspaceView('plan');},[result?.session?.id]);
  const askFromChat = useCallback((message:string)=>{void panelActions.current.refine({message});},[]);
  const saveFromChat = useCallback((id:string)=>feedbackHandler.current(id,"like"),[]);
  const stableRefine = useCallback((input:AgentInput)=>{void panelActions.current.refine(input);},[]);
  const refineFromPanel = useCallback((input:AgentInput)=>{setShowSaved(false);panelActions.current.selectWorkspaceView('discover');void panelActions.current.refine(input);},[]);
  const stableSelectWorkspaceView=useCallback((next:typeof workspaceView)=>panelActions.current.selectWorkspaceView(next),[]);
  const openPreferences = useCallback(()=>panelActions.current.selectWorkspaceView('preferences'),[]);
  const planSaveHandled = useCallback(()=>setSavePlanRequest(0),[]);
  const editWeekHandled=useCallback(()=>setEditingFirstWeek(undefined),[]);
  const freshHandler=useRef(fresh);
  useLayoutEffect(()=>{freshHandler.current=fresh;});
  const stableFresh=useCallback(()=>freshHandler.current(),[]);
  const accountChangedHandler=useCallback((signedIn:boolean,firstName?:string)=>{setAccountSignedIn(signedIn);setAccountFirstName(signedIn?firstName?.trim().replace(/^\p{L}/u,letter=>letter.toLocaleUpperCase())??'':'');},[]);
  const passportSavedHandler=useCallback((sessionId?:string)=>{if(sessionId)rememberSavedSession(window.sessionStorage,sessionId);else clearSavedSession(window.sessionStorage);setSavedSessionId(sessionId);},[]);
  const editPlanHandler=useCallback((plan:SavedPlan)=>{choosePlanMode("day");setEditingPlan(current=>({plan,nonce:(current?.nonce??0)+1}));panelActions.current.selectWorkspaceView('plan');},[]);
  const editWeekHandler=useCallback((week:SavedFirstWeek)=>{choosePlanMode("week");setEditingFirstWeek(current=>({week,nonce:(current?.nonce??0)+1}));panelActions.current.selectWorkspaceView('plan');},[]);
  const restoreAccountPassport=useCallback((passport:Passport)=>{
    freshHandler.current();setResult(passport);setCity(passport.city);setDraft(passport.selected.map(seed=>seed.name));
    setRequestedActivities((passport.session?.activeCategories??[]).filter(section=>!passport.session?.hiddenCategories.includes(section)));
    setInitialMode(passport.session?.discoveryMode??'familiar');setConstraints(passport.session?.constraints??[]);setPhase('ready');setProviderHealth('unconfigured');
    void fetch('/api/agent/capabilities').then(response=>response.json()).then(value=>setProviderHealth(value.health)).catch(()=>{});
    setAdaptation('Your saved Passport is back. Refine a chapter for fresh suggestions.');
  },[]);
  const openAssistantFromDiscover=useCallback((request?:string)=>{if(request)setComposer(request);setAssistantTab('ask');setAssistantOpen(true);},[]);
  const shareFromDiscover=useCallback(()=>stableSelectWorkspaceView('shares'),[stableSelectWorkspaceView]);
  const openVibeDial=useCallback(()=>{setShowSaved(false);setWorkspaceView('discover');setVisitedViews(current=>new Set([...current,'discover']));setVibeDialOpen(true);requestAnimationFrame(()=>document.querySelector<HTMLElement>('.vibe-dial')?.scrollIntoView({behavior:'smooth',block:'center'}));},[]);
  const openAssistant=useCallback(()=>setAssistantOpen(true),[]);
  const navigateWorkspace=useCallback((destination:'discover'|'saved'|'day'|'plan'|'preferences'|'together'|'connections'|'shares')=>{
    if(destination==='day'||destination==='plan')choosePlanMode(destination==='day'?'day':'week');
    setShowSaved(destination==='saved');
    if(destination==='saved')setVisitedViews(current=>new Set([...current,'saved']));
    stableSelectWorkspaceView(destination==='saved'?'discover':destination==='day'?'plan':destination);
    requestAnimationFrame(()=>document.getElementById('passport-workspace-content')?.focus({preventScroll:true}));
  },[stableSelectWorkspaceView,choosePlanMode]);
  const openConnections=useCallback(()=>stableSelectWorkspaceView('connections'),[stableSelectWorkspaceView]);
  const findPlanActivity = useCallback((id:string)=>{
    const target=id==='Cinema'?'cinemas':id==='Nightlife'?'nightclubs':id==='Coffee'?'coffee shops':id==='Eat'?'restaurants':'museums';
    const kept=id==='Coffee'?'dining, music and movies':id==='Eat'?'coffee, music and movies':'dining, coffee, music and movies';
    void panelActions.current.refine({message:`Find local ${target} for this outing. Keep my ${kept} unchanged.`});
  },[]);
  function closeFeedback() {
    setRejectionId(undefined);
    requestAnimationFrame(() => feedbackOpener.current?.focus());
  }
  function requestNewPassport() {
    if(result?.agent)setSaveTastePrompt(true);
    else fresh();
  }
  function fresh() {
    generationRequest.current?.abort();generationRequest.current=null;setGenerationPreviews({});
    recoveryRequest.current?.abort();
    clearGuestPassport(window.sessionStorage);
    clearActiveSession(window.sessionStorage);
    setSavedSessionId(undefined);
    clearOnboardingDraft(window.sessionStorage);
    setSaveTastePrompt(false);
    setTasteDraftVersion(value=>value+1);
    activeTurn.current?.abort();
    activeTurn.current = null;
    setChatNotice("");
    setRetryInput(undefined);
    if (result?.agent)
      void fetch("/api/agent/session", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: result.agent.sessionId }),
      });
    setRecoveryStatus(undefined);
    setShowSaved(false);
    setShowMap(true);
    setWorkspaceView("discover");
    setVisitedViews(new Set(["discover"]));
    setVisitedPlanModes(new Set());
    setShowEarlierConversation(false);
    setEditingPlan(undefined);
    setSavePlanRequest(0);
    setAdaptation("");
    setCity("");
    setOrigin("");
    setInitialMode("familiar");
    setRequestedActivities([]);
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
  const step = result || phase==='exploring' ? 3 : resolution && !editing ? 2 : 1;
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
        <a className="brand" href="/" aria-label="FaveRoam home" onClick={event=>{if(result){event.preventDefault();requestNewPassport();}}}>
          <span className="brand-symbol">
            <img src="/brand/faveroam-mark.svg" width="28" height="28" alt="" />
          </span>
          <span>
            FaveRoam
          </span>
        </a>
        <nav className="header-controls" aria-label="Passport actions">
          {accountSignedIn&&<span className="header-greeting" aria-label={accountFirstName?"Signed in as "+accountFirstName:"Signed in"}>{accountFirstName?"Hi, "+accountFirstName:"Welcome back"}</span>}
          {result && (
            <div className="topbar-actions">
              <span className="current-city">
                <Icon name="pin" size={14} />
                {city}
              </span>
              <button
                className="quiet-button"
                aria-label="Start a new Passport"
                onClick={requestNewPassport}
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
          <AccountControl
            onAccountChange={accountChangedHandler}
            onPassportSaved={passportSavedHandler}
            onEditPlan={editPlanHandler}
            onEditWeek={editWeekHandler}
            passport={result}
            disabled={busy}
            onSignOut={stableFresh}
            onRestore={restoreAccountPassport}
          />
        </nav>
      </header>
      <div className="progressive-content" id="passport-content" tabIndex={-1}>
        {!passportRestoreComplete&&!result&&<div className="passport-resume-loading" role="status">Restoring your Passport…</div>}
        {passportRestoreComplete&&<ReusableTastes signedIn={accountSignedIn} passport={result} city={city} draft={draft} disabled={busy} draftVersion={tasteDraftVersion} showLibrary={!result && step === 1}
          saveRequested={saveTastePrompt} onContinue={fresh} onCancel={()=>setSaveTastePrompt(false)}
          onSelect={profile=>{resetMatches("idle");setDraft(profile.selected.map(s=>s.name));setConceptSeeds(profile.selected.filter(s=>s.id.startsWith("urn:tag:")).map(s=>s.name));setInitialMode(profile.discoveryMode);setConstraints(profile.constraints);setRequestedActivities(profile.activeCategories.filter(s=>!profile.hiddenCategories.includes(s)).slice(0,5));setEditing(true);}}
          onBusy={value=>{if(value)setPhase("exploring");else setPhase(current=>current==="exploring"?"idle":current);}}
          onApply={passport=>{setResult(passport);setCity(passport.city);setDraft(passport.selected.map(s=>s.name));setPhase("ready");setAdaptation("Fresh discoveries using your saved tastes.");}}
        />}
        {passportRestoreComplete&&!result && <StepIndicator step={step} />}
        {passportRestoreComplete&&step === 1 && (
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
            onSubmit={()=>void resolve()}
            onSample={sampleCity=>{
              const tastes=['A.R. Rahman','Interstellar','Indian cuisine'];
              setCity(sampleCity);setOrigin('');setDraft(tastes);
              setConceptSeeds(['Indian cuisine']);setRequestedActivities(['Eat','Music','Movies']);
              void resolve(tastes);
            }}
            activities={requestedActivities}
            onActivities={setRequestedActivities}
          />
        )}
        {passportRestoreComplete&&step === 2 && resolution && (
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
        {busy && phase!=='exploring' && <JourneyLoading phase={phase} detail={progress} />}
        {phase==='exploring'&&<GenerationPreview city={city} previews={generationPreviews} onCancel={()=>{generationRequest.current?.abort();generationRequest.current=null;setGenerationPreviews({});setPhase('confirming');}}/>}
        {result && (
          <section
            className="living-passport"
            aria-labelledby="passport-title"
            aria-busy={busy}
          >
            <PassportCover
              passport={result}
              onConnections={openConnections}
            />
            <div className="passport-workspace">
              <PassportNavigation active={workspaceView === "discover" && showSaved ? "saved" : workspaceView === "plan" && planMode === "day" ? "day" : workspaceView}
                savedCount={result.session?.savedCards.length ?? 0}
                onNavigate={navigateWorkspace}/>
              <div id="passport-workspace-content" className="passport-workspace-content" tabIndex={-1}>
              <button
                className="assistant-launch"
                onClick={openAssistant}
                aria-expanded={assistantOpen}
                aria-controls="taste-concierge"
              >
                <Icon name="star" size={18} />
                Ask FaveRoam
              </button>
            {recoveryStatus && (
              <section className="passport-recovery" aria-label="Continue your Passport" role="status">
                <Icon name={recoveryStatus === "checking" ? "star" : "refresh"} size={22} />
                <div><strong>{recoveryStatus === "checking" ? "Picking up where you left off…" : recoveryStatus === "expired" ? "Ready for fresh discoveries?" : "Your discoveries are still here."}</strong>
                <p>{recoveryStatus === "checking" ? "You can browse while we reconnect." : recoveryStatus === "expired" ? "Use the same tastes to build a fresh Passport and make changes again, or keep browsing these discoveries." : "We couldn't reconnect right now. Try again to keep refining and saving."}</p></div>
                {recoveryStatus === "expired" && <button className="primary-button" disabled={busy} onClick={()=>{setRecoveryStatus(undefined);void resolve();}}>Refresh with my tastes <Icon name="arrow" size={15}/></button>}
                {recoveryStatus === "unavailable" && <button className="quiet-button" disabled={busy} onClick={()=>void reconnectPassport(result)}>Try reconnecting</button>}
              </section>
            )}
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
              {visitedViews.has("discover") && <>
              {!showSaved && <DiscoveryConcierge city={result.city} firstName={accountSignedIn?accountFirstName:undefined} busy={busy} onAsk={openAssistantFromDiscover} onNavigate={stableSelectWorkspaceView} onShare={shareFromDiscover} onVibe={openVibeDial}/>}
              {result.session && !showSaved && (
                <details className="vibe-tuning-disclosure familiarity-disclosure"><summary>Fine-tune discoveries <span>Optional · familiar, balanced or explore</span></summary><FamiliarityControl
                  session={result.session}
                  disabled={busy}
                  onChange={(input) => {setShowSaved(false);setWorkspaceView("discover");void refine(input);}}
                /></details>
              )}
              {!showSaved&&<VibeDial key={`vibe:${result.agent?.sessionId??result.city}`} passport={result} busy={busy} open={vibeDialOpen} onClose={()=>setVibeDialOpen(false)} onApply={stableRefine}/>}
              </>}
            </div>
            {workspaceView === "discover" && !showSaved && missingSections.length > 0 && (
              <section className="missing-discoveries" aria-label="Find more discoveries">
                <h3>Still looking for a few matches</h3>
                <p>We haven’t found matches for {missingSections.map(sectionLabel).join(", ")} yet. Try again, or adjust your preferences. Your other discoveries stay as they are.</p>
                <div>
                  {missingSections.map(section => (
                    <button key={section} className="quiet-button" disabled={busy}
                      onClick={() => void refine({guided:{section,constraints:result.session?.categoryConstraints[section] ?? []}})}>
                      {busy ? "Finding matches…" : `Try ${sectionLabel(section)} again`}
                    </button>
                  ))}
                  <button className="quiet-button" disabled={busy} onClick={() => selectWorkspaceView("preferences")}>Adjust preferences</button>
                </div>
              </section>
            )}
             {result.session && !showSaved && (
              <RefinementRecovery
                session={result.session}
                disabled={busy}
                onApply={stableRefine}
              />
            )}
            {result.session?.hiddenCategories.length ? (
              <p className="passport-mode">
                Hidden chapters: {result.session.hiddenCategories.map(sectionLabel).join(", ")}.
                You can bring them back with manual refinement.
              </p>
            ) : null}
            <div hidden={workspaceView !== "discover"}>
              <div hidden={!showSaved}>{visitedViews.has('saved') && <><Rituals passport={result} signedIn={accountSignedIn} initialCardId={ritualCardId} onInitialHandled={ritualInitialHandled}/><SavedDiscoveries
                  cards={result.session?.savedCards ?? []}
                  selected={result.selected}
                  feedback={feedback}
                  onFeedback={stableFeedback}
                  disabled={busy}
                /></>}</div>
                <div className="discover-results-layout" hidden={showSaved}>
                  {mappedPlaceCount>0&&<div className="map-section-heading">
                    <div className="map-section-title"><span className="map-section-icon" aria-hidden="true"><Icon name="pin" size={20}/></span><div><span className="micro-label">DISCOVER THE CITY</span><h3>Places on a map</h3><p>See where {mappedPlaceCount} returned places sit, then pick one to explore.</p></div></div>
                    <button className="quiet-button map-toggle" type="button" aria-expanded={showMap} onClick={()=>setShowMap(value=>!value)}>{showMap?'Collapse map':'Explore map'} <span aria-hidden="true">{showMap?'−':'↗'}</span></button>
                  </div>}
                  {visibleResult&&mappedPlaceCount>0&&<div className="discover-map-wrap" hidden={!showMap}><PassportMap cards={visibleResult.cards} cartoKey={cartoKey} active={workspaceView==='discover'&&!showSaved&&showMap} selectedCluster={activeCluster?.id} onClusterSelect={setSelectedCluster} onSelect={openMappedCard} onFavorite={card=>stableFeedback(card.id,"like")} favoriteIds={new Set(result.session?.savedCards.map(card=>card.id)??[])} favoriteDisabled={busy} onPlanFrom={planFromMap} plannableIds={plannableIds}/></div>}
                  {visibleResult&&<PassportSections disabled={busy} result={clusteredResult!} feedback={feedback} onFeedback={stableFeedback} updates={updates} updating={updating}/>}
                </div>
            </div>
            <div
              id="view-plan"
              className="workspace-panel"
              hidden={workspaceView !== "plan"}
            >
              {visitedViews.has("plan") && <>
              <div className="planner-mode-switch" role="group" aria-label="Choose your plan"><button type="button" aria-pressed={planMode==='week'} onClick={()=>choosePlanMode('week')}>First Week</button><button type="button" aria-pressed={planMode==='day'} onClick={()=>choosePlanMode('day')}>A day out</button></div>
              <div hidden={planMode!=='day'}>{visitedPlanModes.has('day')&&<DayOutPlan
                key={`day-out:${result.session?.id ?? result.city}`}
                editPlan={editingPlan}
                startFrom={planFrom}
                onFindActivity={findPlanActivity}
                passport={result}
                disabled={busy}
                signedIn={accountSignedIn}
                saveRequest={savePlanRequest}
                onSaveRequestHandled={planSaveHandled}
              />}</div>
              <div hidden={planMode!=='week'}>{visitedPlanModes.has('week')&&<FirstWeek key={`first-week:${result.session?.id??result.city}`} passport={result} options={plannableCards} cartoKey={cartoKey} isActive={workspaceView==='plan'&&planMode==='week'} signedIn={accountSignedIn} editWeek={editingFirstWeek} onEditWeekHandled={editWeekHandled}/>}</div>
              </>}
            </div>
            <div
              className="workspace-panel"
              id="view-preferences"
              hidden={workspaceView !== "preferences" && workspaceView !== "together"}
            >
              {(visitedViews.has("preferences") || visitedViews.has("together")) && <TasteIntelligence
                key={`intelligence:${result.session?.id ?? result.city}`}
                cartoKey={cartoKey}
                view={workspaceView === "together" ? "together" : "preferences"}
                onPreferences={openPreferences}
                partnerSample={sharedPartnerTastes}
                passport={result}
                busy={busy}
                onRefine={refineFromPanel}
              />}

            </div>
            <div
              className="workspace-panel"
              id="view-connections"
              hidden={workspaceView !== "connections"}
            >
              {visitedViews.has("connections") && <details
                className="secondary-reveal cultural-reveal"
                open={workspaceView === "connections"}
              >
                <summary>
                  Explore your taste patterns <Icon name="arrow" size={16} />
                </summary>
                <TasteAnalysis key={`analysis:${result.session?.id ?? result.city}`} passport={result} busy={busy} onRefine={refineFromPanel}/>
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
              </details>}
            </div>
            <div className="workspace-panel" id="view-shares" hidden={workspaceView!=="shares"}>
              {visitedViews.has("shares")&&<><ShareTasteCard key={`share:${result.agent?.sessionId??result.city}`} passport={result} ownerName={accountSignedIn?accountFirstName:undefined}/><ShareManagement key={`share-management:${result.city}:${accountSignedIn?'signed-in':'guest'}`} signedIn={accountSignedIn} city={result.city}/></>}
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
              </div>
            </div>
          </section>
        )}
      </div>
      <footer className="workspace-footer">
        <span>© 2026 FaveRoam · From what you love to where you belong.</span>
        <nav aria-label="About FaveRoam">
          <a href="/about">About us</a>
          <a href="/privacy">Privacy policy</a>
        </nav>
      </footer>
      {result && (assistantOpen || assistantVisited) && (
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

            {assistantTab === "ask" ? (
              <div id="ask-panel" role="tabpanel" aria-labelledby="ask-tab">
                <p className="concierge-intro">
                  Ask a follow-up, refine one category, or get help choosing your next stop.
                </p>
                {!conciergeAvailable && (
                  <p className="helper">
                    You can also use Adjust filters to choose your category,
                    budget and atmosphere.
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
                  {visibleMessages.length > displayedMessages.length && !showEarlierConversation && <button type="button" className="text-button" onClick={() => setShowEarlierConversation(true)}>Show earlier messages ({visibleMessages.length - displayedMessages.length})</button>}
                  {displayedMessages.map((m, i) => (
                    <div className={`message ${m.role}`} key={i}>
                      <span className="message-label">
                        {m.role === "agent" ? "FAVEROAM" : "YOU"}
                      </span>
                      {m.role === "agent" ? <ChatReply text={m.text} hasCards={Boolean(m.recommendationIds?.some(id=>result.cards.some(card=>card.id===id && !result.session?.hiddenCategories?.includes(card.section))))}/> : <p>{m.text}</p>}
                      {m.role==='agent'&&m.checks&&<details className="chat-checks"><summary>What I checked</summary><ul><li>Request route: {m.checks.route}</li><li>{m.checks.model}</li><li>{m.checks.qlooOperations} Qloo retrieval or tool operation{m.checks.qlooOperations===1?'':'s'} in this turn; each may use more than one network request.</li><li>{m.checks.validation}</li><li>{m.checks.kept.length?`Kept unchanged: ${m.checks.kept.map(sectionLabel).join(', ')}.`:'No sections were explicitly protected in this request.'}</li></ul></details>}
                      {m.role === "agent" && m.comparisonIds?.length ? <ChatComparison cards={m.comparisonIds.flatMap(id=>result.cards.find(card=>card.id===id && !result.session?.hiddenCategories?.includes(card.section)) ?? [])} /> : null}
                      {m.role === "agent" && !m.comparisonIds?.length && Array.isArray(m.recommendationIds) && m.recommendationIds.length ? <ChatRecommendations city={result.city} confirmedIds={result.selected.map(taste=>taste.id)}
                        cards={m.recommendationIds.flatMap(id=>result.cards.find(card=>card.id===id && !result.session?.hiddenCategories?.includes(card.section)) ?? [])}
                        busy={busy} savedIds={result.session?.savedCards?.map(card=>card.id) ?? []}
                        onAsk={askFromChat}
                        onSave={saveFromChat}/> : null}
                      {m.role === "agent" && i === displayedMessages.findLastIndex(message => message.role === "agent") && <>
                        {result.session?.pending && <ConceptClarification pending={result.session.pending} disabled={busy}
                          onChoose={id=>void refine({tagChoice:id})} onSkip={()=>void refine({message:"Skip this concept"})}/>}
                        {!result.agent?.pending && Boolean(result.session?.recovery?.length) && result.session && <>
                          <RefinementRecovery session={result.session} disabled={busy} onApply={stableRefine}/>
                          <button className="quiet-button" disabled={busy} onClick={()=>{setAssistantOpen(false);selectWorkspaceView("preferences");}}>Adjust preferences</button>
                        </>}
                      </>}
                    </div>
                  ))}
                </div>
                {visibleMessages.length>0 && !busy && !result.agent?.pending && <div className="chat-next-actions" aria-label="Continue your conversation">
                  {["Pick three things across my interests","Compare the first and second visible discoveries","What filters are saved?"].map(question=><button type="button" key={question} onClick={()=>{setComposer(question);document.querySelector<HTMLTextAreaElement>("#conversation-input")?.focus();}}>{question}</button>)}
                </div>}
              </div>
            ) : (
              <div
                id="manual-panel"
                role="tabpanel"
                aria-labelledby="manual-tab"
              >
                        {result.session?.pending && <ConceptClarification pending={result.session.pending} disabled={busy}
                          onChoose={id=>void refine({tagChoice:id})} onSkip={()=>void refine({message:"Skip this concept"})}/>}
                {result.session && (
                  <GuidedRefinement
                    session={result.session}
                    disabled={busy}
                    onApply={stableRefine}
                  />
                )}
              </div>
            )}
          </div>
          {assistantTab === "ask" && (
            <>
              {error && !busy && <div className="conversation-recovery" role="alert">
                <p>{error}</p>
                <div>
                  {retryInput && <button type="button" className="primary-button" disabled={recoveryStatus === "checking"} onClick={()=>void refine(retryInput)}>{recoveryStatus === "checking" ? "Reconnecting…" : "Try my request again"}</button>}
                  {recoveryStatus === "expired" && <button type="button" className="primary-button" onClick={()=>{setAssistantOpen(false);setRecoveryStatus(undefined);void resolve();}}>Refresh with my tastes</button>}
                  <button type="button" className="quiet-button" onClick={()=>{setError("");setRetryInput(undefined);setAssistantOpen(false);}}>Keep exploring</button>
                </div>
              </div>}
              {chatNotice && <p className="chat-stop-notice" role="status">{chatNotice}</p>}
              {phase==='refining'&&<div className="chat-progress" role="status" aria-live="polite"><span aria-hidden="true">•••</span><p>{chatProgress || "Checking your request…"}</p></div>}
              <ChatComposer processing={phase === "refining"} onStop={stopAgentRequest} prompt={composerPrompt} draftRef={composerDraft} disabled={busy || recoveryStatus === "checking"} onSend={sendComposerMessage}/>
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
