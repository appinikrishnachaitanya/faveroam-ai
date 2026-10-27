import { browserRequestError, readRequestText } from "../../../../src/http/request.ts";
import {jointProfileState,togetherPlanningCards,distinctIntroductions} from "../../../../src/passport/common-ground";
import { themesPerInterest } from "../../../../src/passport/taste-themes";
import { validSessionId } from "../../../../src/agent/session-lifetime.ts";
import { trending } from "../../../../src/qloo/trending";
import { loadSession } from "../../../../src/agent/store";
import { unseal } from "../../../../src/passport/service";
import { compareProfiles } from "../../../../src/qloo/compare";
import { entityDetails, tagTypes } from "../../../../src/qloo/lookups";
import { normalizeEntity } from "../../../../src/qloo/normalizer";
import { queryRecord } from "../../../../src/qloo/diagnostics";
import { sectionOrder } from "../../../../src/workspace/state";
import {sectionTypes,type Section} from "../../../../src/passport/model";
import { configuredProvider } from "../../../../src/agent/provider";
import { evidenceFacts } from "../../../../src/qloo/explanation";
import { debugRequest } from "../../../../src/agent/debug";
import { discoverSection } from "../../../../src/agent/runtime";
import { analyze, selectAnalysisSignals, type AnalysisKind } from "../../../../src/qloo/analysis";
export const runtime = "nodejs";
const running = new Set<string>();
const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
async function handlePOST(request: Request) {
  const rejected = browserRequestError(request);
  if (rejected) return rejected;
  let id = "",
    acquired = false;
  try {
    const raw = await readRequestText(request, 20000);
    if (raw.length > 20000)
      return json({ error: "Request is too large." }, 400);
    const b = JSON.parse(raw);
    if (!validSessionId(b.sessionId) || !Number.isSafeInteger(b.revision) || b.revision < 0)
      return json({ error: "Build a Passport first." }, 400);
    const state = await loadSession(b.sessionId);
    id = state.id;
    if (b.revision !== state.revision)
      return json(
        { error: "Your Passport changed. Retry with the latest version." },
        409,
      );
    const signal = AbortSignal.timeout(60000);
    const selectedCard =
      state.cards.find((c) => c.id === b.entityId) ??
      state.savedCards?.find((c) => c.id === b.entityId);
    if (b.action === "debug") {
      if (
        process.env.NODE_ENV !== "development" ||
        process.env.QLOO_DEBUG_UI !== "1"
      )
        return json({ error: "Not found." }, 404);
      const records = [
        ...new Set(state.cards.map((c) => c.evidence?.queryId).filter(Boolean)),
      ]
        .map((q) => queryRecord(q!))
        .filter(Boolean);
      return json({
        plans: state.queryPreferences,
        records,
        normalized: state.cards.map((c) => c.intelligence),
        tagTypes: await tagTypes(),
      });
    }
    if (running.has(id))
      return json(
        { error: "A taste lookup is already running. Please wait." },
        429,
      );
    running.add(id);
    acquired = true;
    if (b.action === "analysis") {
      if (!["taste","heatmap","demographics"].includes(b.kind)) return json({error:"Choose a supported analysis."},400);
      let interests;
      try { interests=selectAnalysisSignals(state.selected,b.interestIds); }
      catch { return json({error:"Choose one to five confirmed interests to explore."},400); }
      let analysis;
      let themeStatus;
      if(b.kind==='taste'){
        const chosen=state.selected.filter(interest=>b.interestIds.includes(interest.id));
        const grouped=await themesPerInterest(chosen,async interest=>{
          const single=selectAnalysisSignals(state.selected,[interest.id]);
          const result=await analyze('taste',single,state.city,signal);
          if(result.kind!=='taste')throw Error('Unexpected taste analysis result.');
          return result.tags;
        });
        if(!grouped.tags.length)throw Error('No distinct taste connections were returned.');
        themeStatus={unavailable:grouped.unavailable,noConnections:grouped.noConnections};
        analysis={kind:'taste' as const,recordedAt:new Date().toISOString(),tags:grouped.tags};
      }else analysis=await analyze(b.kind as AnalysisKind, interests, state.city, signal);
      return json({analysis,...(themeStatus?{themeStatus}:{})});
    }
    if (b.action === "trends") {
      if (!selectedCard) return json({error:"Choose a current discovery."},400);
      const type=selectedCard.section === "Music" ? "urn:entity:artist" : ["Eat","Coffee","Culture","Lifestyle"].includes(selectedCard.section) ? "urn:entity:place" : undefined;
      if (!type) return json({error:"History is available only for artists and places."},400);
      try { return json({trend:await trending(selectedCard.id,type,signal)}); }
      catch { return json({error:"Historical trends are unavailable for this discovery. Your recommendations are unchanged."},503); }
    }
    if (b.action === "explain") {
      if (!selectedCard)
        return json({ error: "Choose a current discovery." }, 400);
      const facts = evidenceFacts(selectedCard);
      try {
        const provider = configuredProvider();
        if (!provider?.explain) throw Error();
        const indices = await provider.explain(facts);
        return json({
          sentences: indices.length
            ? indices.map((i) => facts[i])
            : facts.slice(0, 3),
          mode: "model-grounded",
        });
      } catch {
        return json({ sentences: facts.slice(0, 3), mode: "guided-evidence" });
      }
    }
    if (b.action === "details") {
      if (!selectedCard)
        return json({ error: "Choose a current discovery." }, 400);
      const entities = await entityDetails([selectedCard.id], signal);
      const entity = entities.find((e) => e.entity_id === selectedCard.id);
      return entity
        ? json({ details: normalizeEntity(entity) })
        : json({ error: "More details are unavailable." }, 404);
    }
    if (
      b.action !== "together" ||
      typeof b.token !== "string" ||
      !Array.isArray(b.ids) ||
      b.ids.length < 1 ||
      b.ids.length > 5 ||
      new Set(b.ids).size !== b.ids.length ||
      !(Array.isArray(b.sections) ? b.sections.length >= 1 && b.sections.length <= 3 && new Set(b.sections).size === b.sections.length && b.sections.every((section: unknown) => typeof section === "string" && sectionOrder.includes(section as Section)) : sectionOrder.includes(b.section))
    )
      return json(
        { error: "Confirm the other person’s interests first." },
        400,
      );
    const choices = unseal(b.token);
    const partner = [...new Map(choices.flatMap((item) =>
      item.candidates.filter(
        (c) => b.ids.includes(c.id) && !c.id.startsWith("urn:tag:"),
      ),
    ).map(candidate=>[candidate.id,candidate])).values()];
    if (partner.length !== b.ids.length)
      return json(
        { error: "Choose returned entity matches for the comparison." },
        400,
      );
    const a = state.selected
      .filter((c) => !c.id.startsWith("urn:tag:"))
      .map((c) => c.id);
    if (!a.length) return json({ error: "Add a named artist, film, book or brand to your Passport before comparing. Cuisine concepts alone cannot form an entity profile." }, 400);
    const comparison = await compareProfiles(
      a,
      partner.map((c) => c.id),
      signal,
    );
    if (!comparison.shared.length)
      return json({
        comparison,
        partner:partner.map(seed=>seed.name),
        partnerSignals:partner.map(({id,name})=>({id,name})),
        cards: [],
        notice:
          "No shared cultural tags were returned. Your existing Passport is preserved.",
      });
    const sections = (Array.isArray(b.sections) ? b.sections : [b.section]) as Section[];
    const rejected = state.feedback.filter((f) => !f.accepted).map((f) => f.id);
    try {
      const cards: Awaited<ReturnType<typeof discoverSection>> = [];
      const failedSections:Section[]=[];
      const jointResults=await Promise.all(sections.map(async section=>{
        const joint=jointProfileState(state,partner,comparison,section);
        try{return (await discoverSection(joint,section,state.categoryConstraints[section]??[],[...a,...partner.map(c=>c.id),...rejected],false,signal)).filter(card=>card.section===section).slice(0,12);}
        catch{failedSections.push(section);return [];}
      }));
      cards.push(...jointResults.flat());
      const placeSections=sections.filter(section=>sectionTypes[section]==='place');
      const exchange=await Promise.all([
        {person:'you',seeds:state.selected.filter(candidate=>a.includes(candidate.id)),themes:comparison.aOnly},
        {person:'them',seeds:partner,themes:comparison.bOnly},
      ].map(async profile=>{
        const personalCards:typeof cards=[];
        const themeCandidates=profile.themes.slice(0,3).map(theme=>({id:theme.id,name:theme.name,types:['urn:tag'],detail:'Returned individual comparison theme'}));
        for(const section of placeSections){
          const solo=structuredClone(state);
          solo.selected=profile.seeds;
          solo.tags=themeCandidates;
          solo.queryPreferences??={};solo.queryPreferences[section]={...solo.queryPreferences[section],inspirationTags:themeCandidates.map(theme=>theme.id)};
          solo.intent={kind:'refine',seeds:[],concepts:[],constraints:state.categoryConstraints[section]??[],sections:[section],strategy:'discover'};
          if(solo.activityGenres)delete solo.activityGenres.Culture;
          try{personalCards.push(...togetherPlanningCards(await discoverSection(solo,section,state.categoryConstraints[section]??[],rejected,false,signal),state.city,8));}catch{failedSections.push(section);}
        }
        return {person:profile.person,theme:profile.themes[0]?.name,card:personalCards[0],cards:personalCards};
      }));
      return json({
        comparison,
        partner: partner.map((p) => p.name),
        partnerSignals:partner.map(({id,name})=>({id,name})),
        failedSections:[...new Set(failedSections)],
        cards,
        exchange:distinctIntroductions(exchange),
        notice: cards.length
          ? "Each category was searched using both confirmed taste profiles with shared themes used as soft taste signals. Explicit category and geographic requirements stayed in place. These are starting ideas, not a compatibility score or a guarantee you will both like every result."
          : "No matches appeared for these shared tastes and current preferences. Your Passport is preserved.",
      });
    } catch {
      return json({
        comparison,
        cards: [],
        notice:
          "Your shared tastes are available, but recommendations are temporarily unavailable. Your Passport is preserved.",
      });
    }
  } catch {
    return json(
      {
        error:
          "This taste lookup is temporarily unavailable. Your Passport is preserved.",
      },
      502,
    );
  } finally {
    if (acquired) running.delete(id);
  }
}
export function POST(request: Request) {
  return debugRequest("agent.intelligence", () => handlePOST(request));
}
