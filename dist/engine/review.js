import {calculate,clone,advance,resolve,clamp} from './model.js';
import {neededScience} from '../data/catalog.js';

// Decision review, qualitative forecasts and the five-part Mission Score.
// Everything here replays the real engine: no number is invented.

const DEFAULT_POLICY = {propulsion: 'nominal', eclipse: 'continue', storage: 'continue', link: 'wait', weather: 'ride'};

function finishFrom(state, policy) {
  let r = clone(state);
  for (let i = 0; i < 600 && !r.done; i++) {
    if (r.crisis) {
      const open = r.crisis.actions.filter(x => !x.disabled);
      const pick = open.find(x => x.id === policy[r.crisis.id]) || open[0];
      if (!pick) throw new Error('No valid recovery option');
      r = resolve(r, pick.id);
    } else r = advance(r);
  }
  if (!r.done) throw new Error('Replay did not finish');
  return r;
}

// Later crises are answered the way the player answered them; anything else gets the no-intervention default.
function policyFor(run) {
  const p = {...DEFAULT_POLICY};
  for (const e of run.events || []) if (e.actionId) p[e.id] = e.actionId;
  return p;
}

// The same objective the final score uses, without the decision-quality term, so options are compared fairly.
export function scoreParts(r) {
  const a = calculate(r.design), M = a.m, o = r.outcome, need = neededScience(M);
  const fraction = clamp(r.science / M.scienceTarget, 0, 1);
  const performance = 260 * fraction + (o.achieved ? 40 : 0);
  const quality = clamp(a.c.payload.value * a.pointingFactor * a.polarFactor * a.altitudeFactor * (r.qualityHit ?? 1), 0, 1);
  const value = 200 * quality;
  const dataReturn = clamp(r.science / Math.max(1, r.generatedScience), 0, 1);
  const budget = clamp((M.budget - o.cost) / Math.max(1, M.budget) / 0.5, 0, 1);
  const safeMin = r.safeSteps * M.step;
  const energy = clamp(1 - safeMin / 240 - Math.max(0, 30 - o.finalBattery) / 60, 0, 1);
  const slack = clamp((M.deadline - a.months) / M.deadline / 0.25, 0, 1);
  const efficiency = 200 * (0.35 * dataReturn + 0.25 * budget + 0.25 * energy + 0.15 * slack);
  return {performance, value, efficiency, need, quality, dataReturn, budget, energy, slack, total: performance + value + efficiency};
}

function outcomeMetrics(r) {
  const a = calculate(r.design), parts = scoreParts(r), o = r.outcome;
  return {
    science: r.science, completion: o.rawCompletion, battery: o.finalBattery, lostMB: r.lostMB, returned: r.returned,
    safeMin: r.safeSteps * a.m.step, pausedMin: r.pausedMin, idleMin: r.contactIdleMin, util: o.linkUtilization,
    achieved: o.achieved, score: parts.total, rate: a.c.payload.value * a.pointingFactor * a.polarFactor * a.altitudeFactor * 10 * r.design.duty
  };
}

export function reviewDecisions(run) {
  if (!run?.done || !Array.isArray(run.events)) return [];
  const policy = policyFor(run), out = [];
  for (const e of run.events) {
    if (!e.snapshot || !Array.isArray(e.options)) continue;
    const opts = [];
    for (const opt of e.options) {
      if (opt.disabled) { opts.push({id: opt.id, name: opt.name, disabled: true}); continue; }
      try {
        const start = clone(e.snapshot), after = resolve(start, opt.id);
        opts.push({id: opt.id, name: opt.name, ...outcomeMetrics(finishFrom(after, policy))});
      } catch { opts.push({id: opt.id, name: opt.name, disabled: true}); }
    }
    const live = opts.filter(o => !o.disabled), chosen = live.find(o => o.id === e.actionId);
    if (!chosen || live.length < 2) continue;
    const best = live.reduce((m, o) => o.score > m.score ? o : m, live[0]), worst = live.reduce((m, o) => o.score < m.score ? o : m, live[0]);
    const spread = best.score - worst.score;
    const material = spread >= 12;
    const quality = material ? clamp((chosen.score - worst.score) / spread, 0, 1) : 1;
    for (const o of live) o.rank = 1 + live.filter(x => x.score > o.score + 1e-9).length;
    const entry = {id: e.id, title: e.title, minute: e.minute, chosenId: chosen.id, chosenName: chosen.name, bestId: best.id, bestName: best.name, options: opts, material, quality, regret: best.score - chosen.score, spread};
    entry.explanation = explainDecision(entry, chosen, best, live);
    out.push(entry);
  }
  return out;
}

const n0 = v => Math.round(v);
function explainDecision(entry, chosen, best, live) {
  if (!entry.material) {
    return `The responses to “${entry.title}” ended within ${n0(entry.spread)} Mission Score points of each other, so this was a low-stakes decision for this design. Better design margins made the choice forgiving.`;
  }
  if (chosen.id === best.id) {
    const worst = live.reduce((m, o) => o.score < m.score ? o : m, live[0]);
    return `“${chosen.name}” was the strongest tested response: about ${n0(chosen.science - worst.science)} more returned science units than “${worst.name}” (isolated test, later choices held equal), with ${n0(chosen.battery)}% battery at the end.`;
  }
  const reasons = [], dSci = best.science - chosen.science;
  if (chosen.pausedMin - best.pausedMin > 8) reasons.push(`It kept new collection paused for ${n0(chosen.pausedMin - best.pausedMin)} more minutes of sunlight, so the next contacts found a lighter recorder and less to send.`);
  if (chosen.idleMin - best.idleMin > 4) reasons.push(`The antenna sat idle for ${n0(chosen.idleMin - best.idleMin)} more minutes of contact because the recorder was already empty, so link capacity went unused.`);
  if (best.lostMB - chosen.lostMB > 15 && best.util >= 70) reasons.push(`Discarding ${n0(best.lostMB - chosen.lostMB)} MB more data cost nothing: the link, not the recorder, limited what could reach Earth (it ran at ${n0(best.util)}% of contact capacity).`);
  if (chosen.battery - best.battery > 6) reasons.push(`It did protect the battery (${n0(chosen.battery)}% against ${n0(best.battery)}% at the end), which is worth something but not as much as the science.`);
  if (best.battery - chosen.battery > 6) reasons.push(`It left ${n0(best.battery - chosen.battery)} more battery percentage points at the end.`);
  if (chosen.safeMin - best.safeMin > 5) reasons.push(`It added ${n0(chosen.safeMin - best.safeMin)} minutes in safe mode.`);
  if (!reasons.length) reasons.push('The difference came from small shifts in collection timing and contact usage.');
  return `“${chosen.name}” returned ${n0(chosen.science)} science units; “${best.name}” would have returned about ${n0(best.science)} (${dSci >= 0 ? '+' : ''}${n0(dSci)}, isolated test with later choices held equal). ${reasons.join(' ')}`;
}

// Free, rough preview: direction only. Numbers stay hidden so the decision remains yours.
export function forecastDirections(run) {
  if (!run?.crisis) return [];
  const rows = [];
  for (const act of run.crisis.actions.filter(x => !x.disabled)) {
    try { const end = finishFrom(resolve(clone(run), act.id), DEFAULT_POLICY); rows.push({id: act.id, name: act.name, m: outcomeMetrics(end)}); } catch { /* option cannot be rehearsed */ }
  }
  if (rows.length < 2) return rows.map(r => ({id: r.id, name: r.name, chips: [], note: 'Only one response is available.'}));
  const mean = k => rows.reduce((s, r) => s + r.m[k], 0) / rows.length;
  const target = calculate(run.design).m.scienceTarget;
  const level = (delta, small, mid, big) => { const x = Math.abs(delta); return x < small ? 0 : (delta > 0 ? 1 : -1) * (x < mid ? 1 : x < big ? 2 : 3); };
  return rows.map(r => {
    const sci = level((r.m.science - mean('science')) / target * 100, 1.5, 6, 14);
    const bat = level(r.m.battery - mean('battery'), 4, 12, 25);
    const lost = level(-(r.m.lostMB - mean('lostMB')), 25, 120, 350);
    const safe = level(-(r.m.safeMin - mean('safeMin')), 4, 15, 40);
    const chips = [{key: 'Science returned', dir: sci}, {key: 'Battery at end', dir: bat}, {key: 'Data kept', dir: lost}];
    if (r.m.safeMin > 0 || mean('safeMin') > 0) chips.push({key: 'Safe-mode risk', dir: safe});
    return {id: r.id, name: r.name, chips};
  });
}

// Each crew role advises from its own priority, so roles can honestly disagree and have to negotiate.
const ROLE_PRIORITY = {
  commander: {why: 'gives the best overall Mission Score', value: m => m.score},
  engineer: {why: 'keeps the platform out of safe mode and protects margins', value: m => m.battery - m.safeMin * 3},
  science: {why: 'returns the most science', value: m => m.science},
  power: {why: 'keeps the battery healthy and the recorder from overflowing', value: m => m.battery - m.lostMB / 12 - m.safeMin * 2}
};
export function roleAdvice(run) {
  if (!run?.crisis) return [];
  const rows = [];
  for (const act of run.crisis.actions.filter(x => !x.disabled)) {
    try { rows.push({id: act.id, name: act.name, m: outcomeMetrics(finishFrom(resolve(clone(run), act.id), DEFAULT_POLICY))}); } catch { /* skip */ }
  }
  return Object.entries(ROLE_PRIORITY).map(([role, p]) => {
    if (rows.length < 2) return {role, optionId: rows[0]?.id || null, optionName: rows[0]?.name || '', why: 'only one response is available'};
    const ranked = rows.map(r => ({r, v: p.value(r.m)})).sort((a, b) => b.v - a.v);
    if (ranked[0].v - ranked[ranked.length - 1].v < 1.5) return {role, optionId: null, optionName: '', why: 'sees no real difference between the responses for this priority'};
    return {role, optionId: ranked[0].r.id, optionName: ranked[0].r.name, why: p.why};
  });
}

// One exact-looking forecast per mission, shown as ranges across pessimistic, nominal and optimistic conditions.
const SCENARIO_FACTORS = [{solar: 0.85, link: 0.75, isp: 0.97, pointing: 1.2}, {solar: 1, link: 1, isp: 1, pointing: 1}, {solar: 1, link: 1, isp: 1, pointing: 1}];
export function forecastRanges(run) {
  if (!run?.crisis) return [];
  const rows = [];
  for (const act of run.crisis.actions.filter(x => !x.disabled)) {
    const sci = [], bat = [];
    for (const f of SCENARIO_FACTORS) {
      try {
        const start = clone(run);
        for (const k of Object.keys(f)) start.factors[k] = k === 'pointing' ? start.factors[k] * f[k] : start.factors[k] * f[k];
        const end = finishFrom(resolve(start, act.id), DEFAULT_POLICY);
        sci.push(end.science); bat.push(end.outcome.finalBattery);
      } catch { /* skip */ }
    }
    if (!sci.length) continue;
    const r10 = v => Math.round(v / 10) * 10;
    rows.push({id: act.id, name: act.name, science: [r10(Math.min(...sci) * 0.95), r10(Math.max(...sci) * 1.05)], battery: [Math.round(Math.min(...bat)), Math.round(Math.max(...bat))]});
  }
  return rows;
}

// Mission Score out of 1000 across the five things the challenge says to reward.
export function missionScore(run, crew = run?.crew) {
  if (!run?.done || !run.outcome) return null;
  const parts = scoreParts(run), reviews = run.review || reviewDecisions(run);
  const material = reviews.filter(r => r.material);
  const decisions = 200 * (material.length ? material.reduce((s, r) => s + r.quality, 0) / material.length : 1);
  const collab = crew ? crewScore(crew) : null;
  const dims = [
    {id: 'performance', label: 'Mission performance', value: parts.performance, max: 300, note: 'Returned science against the target, plus a bonus for meeting the objective.'},
    {id: 'value', label: 'Scientific value', value: parts.value, max: 200, note: 'Instrument value × pointing × orbit coverage × altitude detail.'},
    {id: 'efficiency', label: 'Resource efficiency', value: parts.efficiency, max: 200, note: 'Data returned vs generated, budget left, energy health and schedule slack.'},
    {id: 'decisions', label: 'Decision quality', value: decisions, max: 200, note: material.length ? `${material.length} high-stakes decision${material.length === 1 ? '' : 's'}, ranked against every alternative by replaying them.` : 'No high-stakes decision arose: good margins are good decisions.'}
  ];
  if (collab) dims.push({id: 'collaboration', label: 'Team collaboration', value: collab.total, max: 100, note: collab.note});
  const max = dims.reduce((s, d) => s + d.max, 0), sum = dims.reduce((s, d) => s + d.value, 0);
  const total = Math.round(sum / max * 1000);
  const grade = total >= 900 ? 'S' : total >= 800 ? 'A' : total >= 700 ? 'B' : total >= 550 ? 'C' : 'D';
  return {total, grade, dims, crew: !!collab, ranked: !run.design.sandbox, material: material.length};
}

// Collaboration: participation, readiness challenges raised, consultation before crises and following domain advice.
export function crewScore(crew) {
  if (!crew || !Array.isArray(crew.roles) || !crew.roles.length) return null;
  const roles = crew.roles.length, active = new Set(crew.contributions || []);
  const participation = roles === 1 ? 1 : clamp(active.size / roles, 0, 1);
  const goNoGo = crew.goNoGo ? clamp((crew.goNoGo.resolved + 1) / (crew.goNoGo.raised + 1), 0, 1) : 1;
  const consulted = (crew.crises || []);
  const consultation = consulted.length ? consulted.reduce((s, c) => s + clamp((c.consulted || 0) / Math.max(1, roles), 0, 1), 0) / consulted.length : 1;
  const advice = consulted.length ? consulted.reduce((s, c) => s + (c.followedExpert ? 1 : 0), 0) / consulted.length : 1;
  const total = 25 * participation + 25 * goNoGo + 25 * consultation + 25 * advice;
  return {total, participation, goNoGo, consultation, advice, note: `Participation ${Math.round(participation * 100)}%, Go/No-Go concerns resolved ${Math.round(goNoGo * 100)}%, crises discussed ${Math.round(consultation * 100)}%, expert advice followed ${Math.round(advice * 100)}%.`};
}

