import {it, expect} from 'vitest';
import {makeStore} from './harness.js';
import {newRun, calculate, runToEnd} from '@engine/model.js';
import {presetFor, missionFor, neededScience} from '@data/catalog.js';
import {answerQuestion} from '@engine/assistant.js';

it('uses the active flight rather than a different draft and responds to changed telemetry', async () => {
  const h = makeStore(), design = presetFor('mars', 'balanced'), a = calculate(design);
  const run = {...newRun(design), phase: 'operations', minute: 35, battery: a.c.power.battery * .2, backlog: 0};
  h.store.setState({run, screen: 'flight'});
  const before = JSON.stringify(run);
  const low = await h.a.ask('What should I do now?');
  expect(low.text).toContain('Battery 20%'); expect(low.text).toContain('Conserve energy');
  expect(low.text).toContain(`T+35`); expect(JSON.stringify(h.get().run)).toBe(before);
  h.store.setState({run: {...run, minute: 45, battery: a.c.power.battery * .9, backlog: a.c.storage.capacity * .9}});
  const full = await h.a.ask('Mission status');
  expect(full.text).toContain('recorder 90%'); expect(full.text).toContain('Return priority');
  expect(h.get().chat[0].answer.text).toBe(low.text);
  h.a.dispose();
});

it('reads completed mission on the report but the draft when returning to the board', async () => {
  const h = makeStore(), run = runToEnd(presetFor('mars', 'balanced'));
  h.store.setState({run, screen: 'report'});
  expect((await h.a.ask('Mission status')).text).toContain('causal debrief');
  h.store.setState({screen: 'board'});
  expect((await h.a.ask('Mission status')).evidence).toBe('CURRENT DRAFT');
});

it('uses the scenario success requirement and accepts concise natural questions', () => {
  for (const difficulty of ['cadet', 'engineer', 'director']) {
  const design = {...presetFor('moon', 'balanced'), difficulty}, run = newRun(design);
  for (const q of ['What now?', 'How am I doing?', 'Help me with my mission']) {
    const answer = answerQuestion(q, {run});
    expect(answer.known).toBe(true); expect(answer.topic).toBe('status');
    expect(answer.text).toContain(`${neededScience(missionFor(design))} needed`);
  }
  expect(answerQuestion('What counts as success?', {design}).text).toContain(String(neededScience(missionFor(design))));
  }
});

it('remembers onboarding dismissal and does not interrupt returning saved players', () => {
  const h = makeStore(); expect(h.get().prefs.overviewSeen).toBe(false);
  h.a.setPref('overviewSeen', true);
  expect(makeStore(h.stored()).get().prefs.overviewSeen).toBe(true);
});
