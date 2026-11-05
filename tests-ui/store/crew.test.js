// Crew mode: ownerGuard / canEdit, suggestions, sign-off gating, voting (port of the v6-ui crew tests, store half).
import {describe, it, expect} from 'vitest';
import {ROLE_ORDER} from '@data/scenarios.js';
import {selectLaunchCheck, selectCrisis, selectCrew} from '@/store/selectors.js';
import {makeStore} from './harness.js';

function crewStore(players = 4) {
  const h = makeStore(); h.a.init(); h.a['board-mode']({mode: 'crew'}); h.a['board-players']({players}); h.a['game-accept']();
  return h;
}

describe('crew mode', () => {
  it('board-mode crew gives 2-4 players that share every role; solo and sandbox reset to one player', () => {
    const h = makeStore(); h.a.init();
    h.a['board-mode']({mode: 'crew'}); expect(h.get().team.mode).toBe('crew'); expect(h.get().team.players).toHaveLength(2);
    h.a['board-players']({players: '4'}); expect(h.get().team.players).toHaveLength(4);
    h.a['board-players']({players: '7'}); expect(h.get().team.players).toHaveLength(4);
    h.a['board-mode']({mode: 'solo'}); expect(h.get().team.mode).toBe('solo'); expect(h.get().team.players).toHaveLength(1);
    h.a['board-mode']({mode: 'sandbox'}); expect(h.get().design.sandbox).toBe(true);
    h.a['board-mode']({mode: 'solo'}); expect(h.get().design.sandbox).toBe(false);
  });

  it('only the owner installs; others create a suggestion the owner can accept or decline', () => {
    const h = crewStore(4);
    expect(h.get().team.active).toBe(0); // commander owns launch only
    expect(h.a.install('power', 'compact')).toBe('suggested');
    expect(h.get().design.power).not.toBe('compact');
    const sug = h.get().team.suggestions; expect(sug).toHaveLength(1); expect(sug[0]).toMatchObject({owner: 'power', status: 'pending', kind: 'power', part: 'compact'});
    h.a.install('power', 'compact'); expect(h.get().team.suggestions).toHaveLength(1); expect(h.get().toasts.at(-1).text).toMatch(/already waiting/);
    h.a['suggest-accept']({id: sug[0].id}); expect(h.get().team.suggestions[0].status).toBe('pending'); expect(h.get().toasts.at(-1).text).toMatch(/Only the owner/);
    h.a['crew-pass'](); h.a['crew-pass'](); h.a['crew-pass'](); expect(h.get().team.active).toBe(3);
    h.a['suggest-accept']({id: sug[0].id}); expect(h.get().design.power).toBe('compact'); expect(h.get().team.suggestions[0].status).toBe('accepted');
    expect(h.get().team.contributions).toContain('power');
    h.a['crew-pass'](); h.a.install('payload', 'hires'); const s2 = h.get().team.suggestions.find(x => x.kind === 'payload');
    h.a['crew-pass'](); h.a['crew-pass'](); h.a['suggest-decline']({id: s2.id}); expect(h.get().team.suggestions.find(x => x.id === s2.id).status).toBe('declined');
  });

  it('ownerGuard blocks fields owned by another role but allows name and livery', () => {
    const h = crewStore(4);
    const fuel = h.get().design.fuel; h.a.setField('fuel', 10); expect(h.get().design.fuel).toBe(fuel); expect(h.get().toasts.at(-1).text).toMatch(/Only the Spacecraft Engineer/);
    h.a.setField('name', 'Everyone can rename'); expect(h.get().design.name).toBe('Everyone can rename');
    h.a['board-scenario']({scenario: 'lunar-ice'}); expect(h.get().design.scenario).toBe('lunar-ice'); // commander owns scenario
  });

  it('launch needs every role to sign off and refuses when a role says NO-GO', () => {
    const h = crewStore(4);
    h.a.launch(); expect(h.get().run).toBeNull(); expect(h.get().sheet.id).toBe('launch-check');
    let lc = selectLaunchCheck(h.get()); expect(lc.crew).toBe(true); expect(lc.ready).toBe(false); expect(lc.canLaunch).toBe(false); expect(lc.blockReason).toMatch(/sign off/);
    expect(h.get().team.concerns0).toBeTruthy();
    for (const role of ROLE_ORDER) h.a['crew-signoff']({role});
    lc = selectLaunchCheck(h.get()); expect(lc.ready).toBe(true); expect(lc.canLaunch).toBe(true);
    h.a['game-launch'](); expect(h.get().run).toBeTruthy(); expect(h.get().team.goNoGoSummary).toBeTruthy();
  });

  it('changing the design clears the sign-offs', () => {
    const h = crewStore(1 + 3); h.a['game-review']();
    for (const role of ROLE_ORDER) h.a['crew-signoff']({role});
    expect(selectLaunchCheck(h.get()).ready).toBe(true);
    h.a['crew-pass'](); h.a['crew-pass'](); h.a['crew-pass'](); h.a.install('power', 'compact');
    expect(selectLaunchCheck(h.get()).ready).toBe(false);
  });

  it('crew-vote ignores unknown roles and disabled options; crew-resolve needs a decision; resolve() redirects to voting', () => {
    const h = crewStore(4);
    h.a['crew-pass'](); h.a['crew-pass'](); h.a.install('payload', 'hires'); h.a['crew-pass'](); h.a.install('power', 'compact'); h.a.install('comms', 'compact');
    for (const role of ROLE_ORDER) h.a['crew-signoff']({role});
    expect(selectLaunchCheck(h.get()).canLaunch).toBe(true);
    h.a['game-launch']();
    for (let i = 0; i < 20 && !h.get().run.crisis && !h.get().run.done; i++) h.a.fast();
    const run = h.get().run; expect(run.crisis).toBeTruthy();
    h.a.resolve(run.crisis.actions[0].id); expect(h.get().run.crisis).toBeTruthy(); expect(h.get().toasts.at(-1).text).toMatch(/team votes/);
    h.a['crew-vote']({role: 'hacker', option: run.crisis.actions[0].id}); expect(h.get().team.votes).toEqual({});
    h.a['crew-vote']({role: 'commander', option: 'not-an-option'}); expect(h.get().team.votes).toEqual({});
    h.a['crew-resolve'](); expect(h.get().run.crisis).toBeTruthy(); expect(h.get().toasts.at(-1).text).toMatch(/No decision yet/);
    const opt = run.crisis.actions.find(a => !a.disabled);
    for (const role of ROLE_ORDER) h.a['crew-vote']({role, option: opt.id});
    expect(selectCrisis(h.get()).decided).toBe(opt.id);
    h.a['crew-resolve'](); expect(h.get().team.crises.at(-1).id).toBe(run.crisis.id); expect(h.get().team.votes).toEqual({});
  });

  it('team names are cleaned and persisted; the crew view selector is stable', () => {
    const h = crewStore(2);
    h.a.setTeamName(0, '<b>Ada</b>'); expect(h.get().team.players[0].name).toBe('bAda/b');
    h.a.setTeamName(1, '   '); expect(h.get().team.players[1].name).toBe('Player 2');
    h.a.setTeamName(9, 'x');
    expect(h.stored().team.players[0].name).toBe('bAda/b');
    expect(selectCrew(h.get())).toBe(selectCrew(h.get()));
  });
});
