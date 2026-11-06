// Pure crew helpers (no React). The rules themselves live in dist/engine/crew.js and are used unchanged.
import {ROLES, ROLE_ORDER} from '@data/scenarios.js';
import {tallyVotes} from '@engine/crew.js';

export {ROLES, ROLE_ORDER};

export const ROLE_VAR = {commander: 'var(--role-commander)', engineer: 'var(--role-engineer)', science: 'var(--role-science)', power: 'var(--role-power)'};
export const ROLE_ICON = {commander: 'launch', engineer: 'bus', science: 'payload', power: 'power'};
export const roleInitial = role => (ROLES[role]?.short || role || '?').slice(0, 1).toUpperCase();

/** Who holds a role in this session (first player whose roles include it). */
export const holderOf = (team, role) => team.players.find(p => Array.isArray(p.roles) && p.roles.includes(role));

/**
 * Summary of a crisis vote: counts per option, the leading options, whether the vote is complete, whether it tied and whether the
 * Commander's vote settled the tie. `decided` is tallyVotes(votes): majority, else the Commander's option when it is among the leaders.
 */
export function voteSummary(votes, roles = ROLE_ORDER) {
  const counts = {};
  for (const r of roles) if (votes[r]) counts[votes[r]] = (counts[votes[r]] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  const leaders = Object.keys(counts).filter(k => counts[k] === max);
  const cast = roles.filter(r => votes[r]).length;
  const decided = tallyVotes(votes, roles);
  const tie = leaders.length > 1;
  return {counts, leaders, cast, total: roles.length, complete: cast >= roles.length, tie, decided, tieBroken: tie && decided !== null, deadlock: tie && decided === null && cast > 0};
}
