import {describe, it, expect, vi, afterEach} from 'vitest';
import {render, screen, within, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {makeStore} from './harness.js';
import {askAIBackup, aiContext, AI_ENDPOINT} from '@/store/aiBackup.js';
import {AnswerCard} from '@/features/sheets/AnswerCard.jsx';
import {calculate, newRun} from '@engine/model.js';
import {presetFor, neededScience} from '@data/catalog.js';

const reply = (body, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), {status}));
afterEach(() => vi.unstubAllGlobals());

describe('AI backup client', () => {
  it('posts the question to this site only, with no key, provider or model in the request', async () => {
    const fetchImpl = reply({ok: true, text: 'Because of drag.'});
    const r = await askAIBackup({question: 'Why do orbits decay?', context: {body: 'Moon'}, language: 'en'}, fetchImpl);
    expect(r).toEqual({ok: true, text: 'Because of drag.'});
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(AI_ENDPOINT); expect(url.startsWith('/')).toBe(true); expect(url.startsWith('//')).toBe(false);
    expect(init.method).toBe('POST'); expect(init.credentials).toBe('same-origin');
    expect(JSON.stringify(init)).not.toMatch(/key|gemini|google|authorization/i);
    expect(JSON.parse(init.body)).toEqual({question: 'Why do orbits decay?', context: {body: 'Moon'}, language: 'en'});
  });

  it('maps every failure to a calm error code instead of throwing', async () => {
    expect((await askAIBackup({question: 'q'}, reply({ok: false, error: 'not_configured'}, 503))).error).toBe('not_configured');
    expect((await askAIBackup({question: 'q'}, reply({ok: false, error: 'rate_limited'}, 429))).error).toBe('rate_limited');
    expect((await askAIBackup({question: 'q'}, reply({ok: false, error: 'something odd'}, 500))).error).toBe('upstream');
    expect((await askAIBackup({question: 'q'}, vi.fn(async () => { throw new TypeError('Failed to fetch'); }))).error).toBe('offline');
    expect((await askAIBackup({question: 'q'}, vi.fn(async () => new Response('<html>', {status: 404})))).error).toBe('offline');
    expect((await askAIBackup({question: 'q'}, null)).error).toBe('offline');
    expect((await askAIBackup({question: 'q'}, reply({ok: true, text: '   '}))).ok).toBe(false);
  });

  it('sends only a short numeric summary of the mission', () => {
    const design = presetFor('moon', 'balanced'), a = calculate(design), run = {...newRun(design), phase: 'operations', minute: 30, battery: a.c.power.battery / 2, backlog: a.c.storage.capacity / 4, science: 12};
    const ctx = aiContext({a, run, neededScience});
    expect(ctx).toMatchObject({body: 'Moon', phase: 'operations', batteryPct: 50, recorderPct: 25, scienceReturned: 12});
    expect(Object.values(ctx).every(v => ['string', 'number', 'boolean'].includes(typeof v))).toBe(true);
    expect(JSON.stringify(ctx).length).toBeLessThan(600);
    expect(aiContext({a, run: null, neededScience}).phase).toBe('designing');
  });
});

describe('AI backup in the store and card', () => {
  it('stores the AI answer on the refused question only after askAI, and never for a verified answer', async () => {
    const h = makeStore();
    vi.stubGlobal('fetch', reply({ok: true, text: 'A general principle: drag lowers orbits.'}));
    const known = await h.a.ask('How do I play?'); expect(known.known).toBe(true);
    await h.a.askAI(0); expect(fetch).not.toHaveBeenCalled(); expect(h.get().chat[0].ai).toBeUndefined();
    const refused = await h.a.ask('What is the capital of France?'); expect(refused.known).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
    await h.a.askAI(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(h.get().chat[1].ai).toEqual({status: 'done', text: 'A general principle: drag lowers orbits.'});
    expect(JSON.parse(fetch.mock.calls[0][1].body).question).toBe('What is the capital of France?');
    h.a.dispose();
  });

  it('records an error state and lets the player retry', async () => {
    const h = makeStore();
    vi.stubGlobal('fetch', reply({ok: false, error: 'not_configured'}, 503));
    await h.a.ask('What is the capital of France?'); await h.a.askAI(0);
    expect(h.get().chat[0].ai).toEqual({status: 'error', error: 'not_configured'});
    h.a.dispose();
  });

  it('shows the button with a privacy note on a refusal, the loading state, and the labelled answer', async () => {
    const onAI = vi.fn(), refused = {known: false, evidence: 'OUTSIDE VERIFIED KNOWLEDGE', title: 'I can’t answer that reliably.', text: 'x', sources: [], suggestions: []};
    const {rerender} = render(<AnswerCard answer={refused} index={0} design={presetFor('moon', 'balanced')} level="Beginner" onApply={() => {}} onAsk={() => {}} onAI={onAI} language="en" />);
    expect(screen.getByText(/Nothing is sent until you press the button/)).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', {name: /Ask the AI backup/})); expect(onAI).toHaveBeenCalledTimes(1);
    rerender(<AnswerCard answer={refused} index={0} design={presetFor('moon', 'balanced')} level="Beginner" onApply={() => {}} onAsk={() => {}} onAI={onAI} ai={{status: 'loading'}} language="en" />);
    expect(screen.getByTestId('ai-loading')).toBeTruthy();
    rerender(<AnswerCard answer={refused} index={0} design={presetFor('moon', 'balanced')} level="Beginner" onApply={() => {}} onAsk={() => {}} onAI={onAI} ai={{status: 'done', text: '<img src=x onerror=alert(1)> Hello'}} language="en" />);
    const done = screen.getByTestId('ai-answer');
    expect(within(done).getByText(/NOT VERIFIED/)).toBeTruthy(); expect(done.querySelector('img')).toBeNull(); expect(done.textContent).toContain('<img src=x onerror=alert(1)> Hello');
    rerender(<AnswerCard answer={refused} index={0} design={presetFor('moon', 'balanced')} level="Beginner" onApply={() => {}} onAsk={() => {}} onAI={onAI} ai={{status: 'error', error: 'not_configured'}} language="en" />);
    expect(screen.getByRole('alert').textContent).toMatch(/not set up/); expect(screen.getByRole('button', {name: /again/})).toBeTruthy();
  });

  it('never offers the AI backup on a verified answer', () => {
    render(<AnswerCard answer={{known: true, evidence: 'PROJECT KNOWLEDGE', title: 't', text: 'x', sources: [], suggestions: []}} index={0} design={presetFor('moon', 'balanced')} level="Beginner" onApply={() => {}} onAsk={() => {}} onAI={() => {}} language="en" />);
    expect(screen.queryByRole('button', {name: /AI backup/})).toBeNull();
  });
});
