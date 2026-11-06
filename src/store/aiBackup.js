// Client for the optional AI backup assistant. It only ever talks to THIS site's own server function (/api/assist, same origin, so the
// strict CSP `connect-src 'self'` is unchanged). The browser never sees the provider, the model or any key. Nothing is sent until the
// player presses "Ask the AI backup"; the request is the typed question plus a short, numeric mission summary.

export const AI_ENDPOINT = '/api/assist';

/** A small whitelisted summary of the mission, sent so the answer can refer to the player's real situation. */
export function aiContext({a, run, neededScience}) {
  const m = a.m || {};
  const ctx = {body: m.bodyName, scenario: m.title, difficulty: m.difficultyLabel, phase: run ? (run.done ? 'finished' : run.phase) : 'designing',
    costCredits: a.cost, budgetCredits: m.budget, wetMassKg: a.wet, altitudeKm: a.d?.altitude, inclinationDeg: a.d?.inclination, launchable: !!a.launchable};
  try { ctx.scienceNeeded = neededScience(m); } catch { /* optional */ }
  if (run) {
    ctx.minute = run.minute; ctx.scienceReturned = run.science;
    if (a.c?.power?.battery) ctx.batteryPct = run.battery / a.c.power.battery * 100;
    if (a.c?.storage?.capacity) ctx.recorderPct = run.backlog / a.c.storage.capacity * 100;
  }
  return Object.fromEntries(Object.entries(ctx).filter(([, v]) => v !== undefined && v !== null && !(typeof v === 'number' && !Number.isFinite(v))));
}

/**
 * askAIBackup({question, context, language}, fetchImpl) → {ok: true, text} | {ok: false, error}
 * error: offline (no network or the offline build), not_configured, rate_limited, blocked, upstream, origin, bad_request.
 */
export async function askAIBackup({question, context = {}, language = 'en'}, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') return {ok: false, error: 'offline'};
  let res;
  try {
    res = await fetchImpl(AI_ENDPOINT, {method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({question: String(question).slice(0, 500), context, language: language === 'bn' ? 'bn' : 'en'})});
  } catch { return {ok: false, error: 'offline'}; }
  let data = null;
  try { data = await res.json(); } catch { /* not JSON: a static host answered, so there is no server function here */ }
  if (data?.ok === true && typeof data.text === 'string' && data.text.trim()) return {ok: true, text: data.text.slice(0, 1500)};
  const known = ['not_configured', 'rate_limited', 'blocked', 'upstream', 'origin', 'bad_request', 'too_large', 'type', 'method'];
  if (data && known.includes(data.error)) return {ok: false, error: data.error};
  return {ok: false, error: data ? 'upstream' : 'offline'}; // no JSON at all means a static host or the dev server: there is no server function
}
