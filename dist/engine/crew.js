import {CATALOG} from '../data/catalog.js';
import {ROLES, ROLE_ORDER} from '../data/scenarios.js';

// Crew mode: 1–4 players share one mission. Roles own subsystems, judge readiness through their own lens,
// give competing advice during crises, and decide together. Pure logic; the UI keeps the session state.

export const FIELD_OWNER = {
  fuel: 'engineer', altitude: 'science', inclination: 'science', duty: 'science',
  arrayScale: 'power', batteryScale: 'power', distance: 'commander', destination: 'commander', scenario: 'commander', difficulty: 'commander'
};
const CATEGORY_OWNER = Object.fromEntries(ROLE_ORDER.flatMap(r => ROLES[r].owns.map(k => [k, r])));
export const ownerOf = kind => CATEGORY_OWNER[kind] || FIELD_OWNER[kind] || 'commander';

// Players share roles when fewer than four are present, so every role is always staffed.
export function assignRoles(count, names = []) {
  const n = Math.min(4, Math.max(1, Math.floor(Number(count)) || 1));
  const groups = {1: [ROLE_ORDER], 2: [['commander', 'engineer'], ['science', 'power']], 3: [['commander'], ['engineer', 'science'], ['power']], 4: ROLE_ORDER.map(r => [r])}[n];
  const clean = v => String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 24);
  return groups.map((roles, i) => ({name: clean(names[i]) || `Player ${i + 1}`, roles}));
}

export const rolesOf = (team, index) => team?.players?.[index]?.roles || [];
export function canEdit(team, kind) {
  if (!team || team.mode !== 'crew') return true;
  const owner = ownerOf(kind), active = team.players[team.active];
  return !!active && active.roles.includes(owner);
}
export const staffedBy = (team, role) => team.players.findIndex(p => p.roles.includes(role));

// Each role looks at readiness through its own lens: a failure is NO-GO, a warning is GO with a concern.
export function roleVerdicts(checks) {
  return ROLE_ORDER.map(id => {
    const mine = checks.filter(c => ROLES[id].lens.includes(c.id));
    const fails = mine.filter(c => c.status === 'fail'), warns = mine.filter(c => c.status === 'warn');
    return {role: id, label: ROLES[id].label, status: fails.length ? 'nogo' : warns.length ? 'concern' : 'go', issues: [...fails, ...warns]};
  });
}

export function signoffAllowed(verdicts) { return !verdicts.some(v => v.status === 'nogo'); }

// Majority wins; a tie goes to the Commander's vote; no majority and no Commander vote means undecided.
export function tallyVotes(votes, roles = ROLE_ORDER) {
  const counts = {};
  for (const r of roles) if (votes[r]) counts[votes[r]] = (counts[votes[r]] || 0) + 1;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  if (entries.length === 1 || entries[0][1] > entries[1][1]) return entries[0][0];
  return votes.commander && counts[votes.commander] === entries[0][1] ? votes.commander : null;
}

export const EXPERT_FOR = {propulsion: 'engineer', eclipse: 'power', storage: 'power', link: 'power', weather: 'science'};

export function summarizeCrew(team) {
  if (!team || team.mode !== 'crew') return null;
  return {
    roles: ROLE_ORDER.filter(r => team.players.some(p => p.roles.includes(r))),
    players: team.players.map(p => ({name: p.name, roles: p.roles})),
    contributions: [...(team.contributions || [])],
    goNoGo: team.goNoGoSummary || {raised: 0, resolved: 0},
    crises: (team.crises || []).map(c => ({id: c.id, consulted: c.consulted, followedExpert: !!c.followedExpert}))
  };
}

export const categoryName = kind => ({bus: 'Spacecraft bus', payload: 'Science payload', power: 'Power system', propulsion: 'Propulsion', comms: 'Communications', storage: 'Recorder', launch: 'Launch provider'}[kind] || kind);
export const partName = (kind, id) => CATALOG[kind]?.find(c => c.id === id)?.name || id;
