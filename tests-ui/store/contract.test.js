// The action contract (plan 5.2): every legacy `actions` key and every data-attribute handler has a store action of the same name.
import {describe, it, expect} from 'vitest';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {makeStore} from './harness.js';

const LEGACY_ACTION_KEYS = ['export-rejected-save', 'discard-rejected-save', 'resume-checkpoint', 'discard-checkpoint', 'confirm-discard', 'confirm-power-fix', 'clear-chat', 'export-nasa', 'customize', 'mentor', 'nasa-data', 'guide-next', 'guide-toggle', 'apply-custom', 'home', 'start', 'brief', 'architect', 'readiness', 'trade', 'pitch', 'exit-pitch', 'launch', 'play', 'step', 'fast', 'robust', 'cancel-robust', 'close', 'export', 'redesign', 'quiz', 'next-question', 'clear-history', 'confirm-clear', 'game-accept', 'game-review', 'game-launch', 'game-help', 'game-sources', 'game-history', 'camera-reset', 'focus', 'game-redesign', 'game-fix', 'game-debrief',
  'board-mode', 'board-scenario', 'board-difficulty', 'board-players', 'crew-pass', 'crew-vote', 'crew-resolve', 'crew-signoff', 'suggest-accept', 'suggest-decline', 'orbit-preset', 'learn', 'learn-index', 'toggle-motion', 'toggle-language', 'board-add', 'copy-code', 'copy-design', 'copy-challenge', 'print', 'compare-run', 'import-design',
  'preset-balanced', 'preset-fragile', 'preset-resilient', 'speed-1', 'speed-3', 'speed-10'];
const NEW_ACTIONS = ['init', 'dispose', 'persist', 'toast', 'dismissToast', 'announce', 'openSheet', 'closeSheet', 'go', 'setCategory', 'setReportTab', 'preset', 'install', 'setField', 'setDestination', 'previewPart', 'previewField', 'clearPreview', 'pause', 'resume', 'setSpeed', 'command', 'resolve', 'suggest', 'setPlayers', 'setTeamName', 'loadRun', 'markScoreSeen', 'ask', 'applyAssistant', 'setMentorLevel', 'answerQuiz', 'setPref', 'toggle-sound', 'toggle-haptics', 'discardThen', 'cancel-import'];

describe('store action contract', () => {
  it('has a function for every legacy action key and every documented new action', () => {
    const h = makeStore();
    for (const k of [...LEGACY_ACTION_KEYS, ...NEW_ACTIONS]) expect(typeof h.a[k], k).toBe('function');
  });

  it('the legacy key list matches the legacy source (nothing was forgotten)', () => {
    const src = readFileSync(path.resolve(process.cwd(), 'dist/ui/app.js'), 'utf8');
    const block = src.slice(src.indexOf('const actions={'), src.indexOf('// ---- Mission board')) + src.slice(src.indexOf('Object.assign(actions,{'), src.indexOf('// ---- Motion'));
    const keys = new Set([...block.matchAll(/(?:^|[,{\s])'?([a-z][a-z-]*)'?\s*(?::|,(?=[a-zA-Z'])|\s*\})/g)].map(m => m[1]));
    const declared = new Set(LEGACY_ACTION_KEYS);
    // every quoted key and every well-known bare key found in the legacy action tables
    for (const k of ['export-rejected-save', 'game-fix', 'board-players', 'compare-run', 'import-design', 'confirm-power-fix', 'toggle-language']) { expect(keys.has(k), `${k} parsed`).toBe(true); expect(declared.has(k)).toBe(true); }
    for (const k of [...block.matchAll(/'([a-z]+(?:-[a-z]+)+)':/g)].map(m => m[1])) expect(declared.has(k), `legacy action "${k}" has a store action`).toBe(true);
  });

  it('state has the documented top-level keys', () => {
    const h = makeStore(); h.a.init();
    for (const k of ['screen', 'category', 'design', 'team', 'board', 'runs', 'prefs', 'compare', 'run', 'playing', 'speed', 'pitch', 'robust', 'robustProgress', 'mentorLevel', 'quiz', 'guide', 'chat', 'game', 'pendingImport', 'scoreSeen', 'reportTab', 'launchCount', 'cameraResets', 'sheet', 'toasts', 'preview', 'hidden', 'saveStatus', 'actions']) expect(h.get(), k).toHaveProperty(k);
    expect(h.get().screen).toBe('board'); expect(Object.keys(h.get().prefs).sort()).toEqual(['guided', 'haptics', 'language', 'reducedMotion', 'sound', 'theme']);
  });

  it('legacy page names route to the new screens and sheets', () => {
    const h = makeStore(); h.a.init();
    h.a.architect(); expect(h.get().screen).toBe('hangar'); expect(h.get().sheet.id).toBe('lab'); h.a.close();
    h.a.readiness(); expect(h.get().sheet.id).toBe('launch-check'); h.a.close();
    h.a.trade(); expect(h.get()).toMatchObject({screen: 'report', reportTab: 'trade'});
    h.a['game-debrief'](); expect(h.get().reportTab).toBe('debrief');
    h.a.brief(); expect(h.get().screen).toBe('board'); h.a.go('sources'); expect(h.get().sheet.id).toBe('sources'); h.a.close();
    h.a.go('nowhere'); expect(h.get().screen).toBe('board');
    h.a.learn({topic: 'eclipse'}); expect(h.get().sheet).toMatchObject({id: 'concept', props: {topic: 'eclipse'}}); h.a.learn({topic: '__proto__'}); expect(h.get().sheet.props.topic).toBe('eclipse');
    h.a['learn-index'](); expect(h.get().sheet.props.index).toBe(true);
    h.a['game-history'](); expect(h.get().sheet).toMatchObject({id: 'history', props: {kind: 'battery'}});
  });

  it('quiz, assistant, board, share and report actions behave', async () => {
    const h = makeStore(); h.a.init();
    h.a.quiz(); expect(h.get().sheet.id).toBe('quiz'); expect(h.get().quiz).toEqual({i: 0, answers: []});
    h.a.answerQuiz(1); h.a.answerQuiz(2); expect(h.get().quiz.answers).toEqual([1]); h.a['next-question'](); expect(h.get().quiz.i).toBe(1);
    await h.a.ask('Mission status'); expect(h.get().chat).toHaveLength(1); expect(h.get().sheet.id).toBe('assistant'); expect(h.get().chat[0].answer.title).toBeTruthy();
    await h.a.ask('   '); expect(h.get().chat).toHaveLength(1); h.a['clear-chat'](); expect(h.get().chat).toEqual([]);
    h.a['board-scenario']({scenario: 'lunar-ice'}); expect(h.get().design.scenario).toBe('lunar-ice'); h.a['board-scenario']({scenario: 'hacker'}); expect(h.get().design.scenario).toBe('lunar-ice');
    h.a['board-difficulty']({difficulty: 'director'}); expect(h.get().design.difficulty).toBe('director'); h.a['board-difficulty']({difficulty: 'god'}); expect(h.get().design.difficulty).toBe('director');
    h.a['orbit-preset']({inc: 60, alt: 100}); expect(h.get().design).toMatchObject({inclination: 60, altitude: 100}); h.a['orbit-preset']({inc: 'x', alt: 1}); expect(h.get().design.inclination).toBe(60);
    h.a['export'](); expect(h.downloads.at(-1).name).toBe('TRAJECTIQ_mission_report.json'); expect(JSON.parse(h.downloads.at(-1).data)).not.toHaveProperty('team');
    h.a['export-nasa'](); expect(h.downloads.at(-1).name).toMatch(/^TRAJECTIQ_NASA_(Moon|Mars)_Data\.csv$/);
    await h.a['copy-design'](); expect(h.copies.at(-1)).toMatch(/^TQ/); await h.a['copy-challenge'](); expect(h.copies.at(-1)).toContain('#challenge=lunar-ice:director');
  });

  it('share codes round-trip through compare-run and import-design; hostile codes are rejected', async () => {
    const a = makeStore(); a.a.init(); a.a.install('power', 'compact'); await a.a['copy-design'](); const code = a.copies.at(-1);
    const b = makeStore(); b.a.init(); b.a['compare-run']({code}); expect(b.get().compare.theirs).toBeTruthy(); expect(b.get().compare.mine).toBeTruthy();
    b.a['compare-run']({code: '<script>alert(1)</script>'}); expect(b.get().compare.error).toBeTruthy(); expect(b.get().compare.theirs).toBeUndefined();
    b.a['compare-run']({code: 'TQ6.' + 'A'.repeat(50)}); expect(b.get().compare.error).toBeTruthy();
  });

  it('the leaderboard keeps one row per run, sorted by score, and refuses sandbox runs', () => {
    const h = makeStore(); h.a.init(); h.a['preset-resilient'](); h.a['game-launch']();
    for (let i = 0; i < 200 && !h.get().run.done; i++) { const r = h.get().run; if (r.crisis) h.a.resolve(r.crisis.actions.find(x => !x.disabled).id); else h.a.fast(); }
    h.a['board-add'](); expect(h.get().board).toHaveLength(1); expect(h.stored().board).toHaveLength(1); h.a['board-add'](); expect(h.get().board).toHaveLength(1); expect(h.get().toasts.at(-1).text).toMatch(/already/);
    expect(h.get().board[0].code.length).toBeGreaterThan(10);
    h.a['clear-history'](); expect(h.get().sheet.id).toBe('confirm-clear'); h.a['confirm-clear'](); expect(h.get().runs).toEqual([]); expect(h.stored().runs).toEqual([]);
    h.a.redesign(); expect(h.get().screen).toBe('hangar');
  });

  it('preferences persist and validate', () => {
    const h = makeStore(); h.a.init(); h.a.setPref('language', 'xx'); expect(h.get().prefs.language).toBe('en'); h.a.setPref('language', 'bn'); h.a.setPref('bogus', true); expect(h.get().prefs).not.toHaveProperty('bogus');
    h.a['guide-toggle'](); expect(h.stored().prefs.guided).toBe(false); h.a['guide-next'](); h.a['guide-next'](); h.a['guide-next'](); h.a['guide-next'](); expect(h.get().guide).toBe(3);
    h.a.focus(); expect(h.get().game.fullscreen).toBe(true); h.a['camera-reset'](); expect(h.get().cameraResets).toBe(1);
  });

  it('previews never change the design and clear on demand', () => {
    const h = makeStore(); h.a.init(); const d = h.get().design;
    h.a.previewPart('power', 'compact'); expect(h.get().preview).toEqual({kind: 'power', id: 'compact'}); expect(h.get().design).toBe(d);
    h.a.previewField('fuel', '80'); expect(h.get().preview).toEqual({field: 'fuel', value: 80}); h.a.previewPart(null, null); expect(h.get().preview).toBeNull();
  });
});
