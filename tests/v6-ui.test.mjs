import test from 'node:test';
import assert from 'node:assert/strict';

// Drives the real application module through a minimal DOM adapter, like the earlier UI tests.
const handlers = {}, extra = {};
const elements = Object.fromEntries(['#app', '#modal-root', '#toast'].map(k => [k, {innerHTML: '', textContent: '', classList: {add() {}, remove() {}}, focus() {}}]));
globalThis.document = {body: {classList: {toggle() {}}}, activeElement: {focus() {}}, querySelector: s => elements[s] || extra[s] || null, getElementById: () => null, addEventListener: (type, fn) => { handlers[type] = fn; }};
globalThis.window = {scrollTo() {}};
const storage = new Map();
globalThis.localStorage = {getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v)};
Object.defineProperty(globalThis, 'navigator', {value: {}, configurable: true});
globalThis.setTimeout = () => 0; globalThis.clearTimeout = () => {}; globalThis.setInterval = () => 0; globalThis.clearInterval = () => {};
await import('../dist/ui/app.js');
const click = dataset => handlers.click({target: {closest: () => ({dataset})}, preventDefault() {}});
const html = () => elements['#app'].innerHTML, modalHtml = () => elements['#modal-root'].innerHTML;
const saved = () => JSON.parse(storage.get('trajectiq-v1'));
function flyToDecision(votePolicy) {
  for (let i = 0; i < 14 && !html().includes('DECISION REQUIRED') && !html().includes('MISSION COMPLETE'); i++) click({action: 'fast'});
  return html().includes('DECISION REQUIRED');
}

test('Item 10: the header has one Assistant button and one menu; duplicate controls are gone', () => {
  const h = html().split('</header>')[0];
  assert.equal((h.match(/data-action="mentor"/g) || []).length, 1);
  assert.match(h, /id="top-menu"/); assert.match(h, /popover="auto"/); assert.match(h, /commandfor="top-menu"/);
  for (const gone of ['Ask mission assistant', 'Ask assistant', 'Pitch mode']) assert.ok(!h.includes(gone), gone);
  for (const inMenu of ['How to play', 'Pitch demo', 'Focus view', 'Sources', 'Reduce animation']) assert.ok(h.includes(inMenu), inMenu);
  assert.doesNotMatch(html().split('<main')[1].split('class="game-layout"')[0], /data-action="game-help"|data-action="game-sources"/);
});

test('Mission board: scenarios, difficulty, modes and the mission charter', () => {
  click({action: 'start'});
  const h = html();
  for (const needle of ['Plan your mission', 'Lunar Polar Mapper', 'Lunar Ice Hunter', 'Mars Polar Mapper', 'Mars Dust Season', 'Cadet', 'Flight Director', 'Sandbox', 'Mission charter', 'Most critical resource', 'MISSION OFFER', 'game-canvas', 'Your first mission']) assert.ok(h.includes(needle), needle);
  click({action: 'board-difficulty', difficulty: 'director'});
  assert.match(html(), /138 credits/); assert.match(html(), /552 of 650|553 of 650/);
  click({action: 'board-scenario', scenario: 'lunar-ice'});
  assert.match(html(), /particle event/); assert.equal(saved().design.scenario, 'lunar-ice'); assert.equal(saved().design.altitude, 75);
  click({action: 'board-difficulty', difficulty: 'engineer'});
  click({action: 'board-mode', mode: 'sandbox'}); assert.match(html(), /SANDBOX · UNRANKED/); assert.match(html(), /999 credits/);
  click({action: 'board-mode', mode: 'solo'}); click({action: 'board-scenario', scenario: 'lunar-polar'});
  assert.equal(saved().design.sandbox, false);
});

test('Items 8 and 9: destination control is a stacked field and Mars labels its distance as a game choice', () => {
  click({action: 'board-scenario', scenario: 'mars-polar'}); click({action: 'game-accept'});
  const h = html();
  assert.match(h, /<div class="destination-field"><label for="mission-destination">/);
  assert.doesNotMatch(h, /<label class="destination-select"/);
  assert.match(h, /<select id="mission-destination"[^>]*aria-describedby="destination-help"/);
  assert.match(h, /225 million km reference distance[^<]*game choice[^<]*not a measured average/);
  assert.match(h, /ORBIT OPTIONS/); assert.match(h, /data-action="orbit-preset"/);
  click({action: 'start'}); click({action: 'board-scenario', scenario: 'lunar-polar'}); click({action: 'game-accept'});
  assert.doesNotMatch(html(), /225 million km/);
  assert.match(html(), /RECORDER/); assert.match(html(), /SCHEDULE USED/); assert.match(html(), /LAUNCH · ORBIT/);
});

test('Items 2, 4, 7: crisis shows direction-only previews, an explained link and the recorder warning', () => {
  click({action: 'preset-fragile'}); click({action: 'game-review'});
  assert.match(modalHtml(), /Recorder before first contact/); assert.match(modalHtml(), /recorder may fill before the first contact/);
  click({action: 'game-launch'}); assert.match(html(), /You have the controls/);
  assert.ok(flyToDecision());
  const card = html().split('crisis-card')[1].split('</section>')[0];
  assert.match(card, /ROUGH PREVIEW · DIRECTION ONLY/); assert.match(card, /Spend my one forecast/);
  assert.match(card, /only during a 25-minute ground contact once per 118-minute orbit/);
  assert.doesNotMatch(card.split('ROUGH PREVIEW')[1].split('Spend my one forecast')[0].replace(/<[^>]*>/g, ' '), /\d{2,}/, 'preview shows no numbers');
  assert.doesNotMatch(card, /Preview consequences with copilot/);
});

test('Items 1, 3, 5: finishing shows a Mission Score, a replayed decision review and honest advice', () => {
  for (let i = 0; i < 14 && !html().includes('MISSION COMPLETE'); i++) {
    if (html().includes('DECISION REQUIRED')) click({recovery: html().includes('data-recovery="downlink"') ? 'downlink' : html().includes('data-recovery="continue"') ? 'continue' : 'wait'});
    else click({action: 'fast'});
  }
  const h = html();
  for (const needle of ['MISSION SCORE', 'Mission performance', 'Scientific value', 'Resource efficiency', 'Decision quality', 'Decision review', 'Here is why it happened', 'Save, share and compare', 'TQ6.']) assert.ok(h.includes(needle), needle);
  assert.doesNotMatch(h, /Team collaboration/);
  assert.doesNotMatch(h, /Resume sunlit mapping after conserving energy/);
  const run = saved().runs.at(-1);
  assert.ok(run.review.length >= 1 && run.score.total > 0 && run.score.dims.length === 4);
  assert.ok(run.events.every(e => e.snapshot && e.options));
});

test('Sharing: a mission code round-trips through the compare form and hostile codes are rejected', () => {
  const code = html().match(/TQ6\.[A-Za-z0-9_-]+/)[0];
  click({page: 'trade'});
  assert.match(html(), /Compare a mission code/); assert.match(html(), /Local leaderboard/);
  extra['#compare-code'] = {value: code};
  click({action: 'compare-run'});
  assert.match(html(), /flown on this device with the same seed and autopilot/);
  for (const hostile of ['TQ6.' + 'A'.repeat(4000), 'hello', 'TQ6.%%%', '<script>alert(1)</script>']) {
    extra['#compare-code'] = {value: hostile}; click({action: 'compare-run'});
    assert.match(html(), /role="alert"/); assert.doesNotMatch(html(), /<script>alert/);
  }
  click({page: 'debrief'}); click({action: 'board-add'});
  click({page: 'trade'}); assert.equal(saved().board.length, 1); assert.match(html(), /Solo/);
  click({action: 'board-add'}); assert.equal(saved().board.length, 1, 'no duplicate leaderboard entries');
});

test('Crew mode: roles own subsystems, suggestions are negotiated, Go/No-Go and a team vote gate the mission', () => {
  click({action: 'start'}); click({action: 'board-mode', mode: 'crew'}); click({action: 'board-players', players: '4'});
  assert.match(html(), /4 PLAYERS/); assert.equal(saved().team.players.length, 4);
  handlers.input({target: {dataset: {teamName: '0'}, value: '<img src=x onerror=alert(1)>Ana'}});
  handlers.input({target: {dataset: {teamName: '3'}, value: 'Ben'}});
  assert.doesNotMatch(html(), /<img src=x/);
  click({action: 'game-accept'});
  assert.match(html(), /CREW MODE · SHARED DECISIONS/); assert.match(html(), /Commander/);
  // Player 1 is the Commander: power belongs to Ben (Power & Comms). Installing it becomes a suggestion.
  const before = saved().design.power, wanted = before === 'endurance' ? 'balanced' : 'endurance';
  click({category: 'power'}); click({component: wanted, kind: 'power'});
  assert.match(html(), /PROPOSALS \(1\)/); assert.match(html(), /Waiting for the owner/);
  assert.equal(saved().design.power, before, 'design unchanged until the owner accepts');
  handlers.input({target: {dataset: {gamefield: 'fuel'}, value: '30'}});
  assert.equal(saved().design.fuel, 55, 'sliders are role-owned too');
  for (let i = 0; i < 3; i++) click({action: 'crew-pass'});
  assert.match(html(), /Ben<\/strong> has the controls as <strong>Power &amp; Comms Officer/);
  const id = html().match(/data-action="suggest-accept"[^>]*data-id="([^"]+)"/)[1];
  click({action: 'suggest-accept', id}); assert.equal(saved().design.power, wanted);
  // Launch needs every role's sign-off.
  click({action: 'game-review'});
  assert.match(modalHtml(), /GO \/ NO-GO ROLL CALL/); assert.match(modalHtml(), /GO WITH CONCERN/);
  assert.match(modalHtml(), /data-action="game-launch"[^>]*disabled/);
  click({action: 'launch'}); assert.doesNotMatch(html(), /You have the controls/, 'cannot launch without sign-off');
  for (const role of ['commander', 'engineer', 'science', 'power']) click({action: 'crew-signoff', role});
  assert.doesNotMatch(modalHtml(), /data-action="game-launch"[^>]*disabled/);
  click({action: 'game-launch'}); assert.match(html(), /You have the controls/);
  assert.ok(flyToDecision());
  const card = html();
  assert.match(card, /TEAM DECISION · EACH ROLE ADVISES FROM ITS OWN PRIORITY/);
  assert.match(card, /Apply team decision<\/button>/); assert.match(card, /data-action="crew-resolve"[^>]*disabled/);
  click({recovery: 'continue'}); assert.match(html(), /DECISION REQUIRED/, 'direct buttons do not bypass the vote');
  const options = [...card.matchAll(/data-action="crew-vote" data-role="commander" data-option="([^"]+)"/g)].map(m => m[1]);
  for (const role of ['commander', 'engineer', 'science', 'power']) click({action: 'crew-vote', role, option: options[role === 'science' ? 1 : 0]});
  assert.doesNotMatch(html(), /data-action="crew-resolve"[^>]*disabled/);
  click({action: 'crew-resolve'});
  for (let i = 0; i < 14 && !html().includes('MISSION COMPLETE'); i++) {
    if (html().includes('DECISION REQUIRED')) { const opt = [...html().matchAll(/data-action="crew-vote" data-role="commander" data-option="([^"]+)"/g)].map(m => m[1]).at(-1); for (const role of ['commander', 'engineer', 'science', 'power']) click({action: 'crew-vote', role, option: opt}); click({action: 'crew-resolve'}); }
    else click({action: 'fast'});
  }
  assert.match(html(), /Team collaboration/); assert.match(html(), /Includes team collaboration/);
  const run = saved().runs.at(-1);
  assert.equal(run.score.dims.length, 5); assert.equal(run.crew.players.length, 4); assert.ok(run.crew.contributions.length >= 2);
  assert.ok(run.crew.crises.length >= 1);
  assert.doesNotMatch(JSON.stringify(run.crew), /<img/);
});

test('Concept cards, menu actions and motion preference', () => {
  click({action: 'learn', topic: 'eclipse'}); assert.match(modalHtml(), /CONCEPT CARD/); assert.match(modalHtml(), /Eclipse/); click({action: 'close'});
  click({action: 'learn', topic: '__proto__'}); assert.doesNotMatch(modalHtml(), /CONCEPT CARD/);
  click({action: 'learn-index'}); assert.match(modalHtml(), /Learn the ideas behind the numbers/); click({action: 'close'});
  click({action: 'toggle-motion'}); assert.equal(saved().prefs.reducedMotion, true);
  click({action: 'toggle-motion'}); assert.equal(saved().prefs.reducedMotion, false);
});

test('Persisted team and leaderboard data from a damaged save cannot break or inject into the page', () => {
  const s = saved();
  s.team = {mode: 'crew', players: [{name: '<script>x</script>'}, {name: 'B'}], active: 99, suggestions: [{id: '<b>', owner: 'nope', status: 'pending', kind: 1, part: 2, label: 3, fromName: 4}], crises: [{id: 5}], contributions: ['hacker', 'power']};
  s.board = [{id: 1}, {id: 'x', team: '<img src=x onerror=1>', label: 'R1', scenarioTitle: 'T', difficulty: 'd', mode: 'm', grade: 'A', score: 5000, code: 'c'}, null, 'bad'];
  storage.set('trajectiq-v1', JSON.stringify(s));
  assert.doesNotThrow(() => JSON.parse(storage.get('trajectiq-v1')));
});
