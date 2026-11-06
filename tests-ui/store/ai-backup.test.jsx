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

const waitAI = async (h, i, status) => { for (let n = 0; n < 50 && h.get().chat[i]?.ai?.status !== status; n++) await new Promise(r => setTimeout(r, 5)); };
const design = () => presetFor('moon', 'balanced');
const card = (answer, props = {}) => <AnswerCard answer={answer} index={0} design={design()} level="Beginner" onApply={() => {}} onAsk={() => {}} language="en" {...props} />;
const refused = {known: false, evidence: 'OUTSIDE VERIFIED KNOWLEDGE', title: 'I can’t answer that reliably.', text: 'I cannot answer this reliably', sources: [], suggestions: ['Review my design']};

describe('automatic AI backup in the store', () => {
  it('switches to the backup by itself when the verified assistant refuses, and never for a verified answer', async () => {
    const h = makeStore();
    vi.stubGlobal('fetch', reply({ok: true, text: 'A general principle: drag lowers orbits.'}));
    expect((await h.a.ask('How do I play?')).known).toBe(true);
    expect(fetch).not.toHaveBeenCalled(); expect(h.get().chat[0].ai).toBeUndefined();
    expect((await h.a.ask('What is the capital of France?')).known).toBe(false);
    expect(h.get().chat[1].ai).toEqual({status: 'loading'});
    await waitAI(h, 1, 'done');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(h.get().chat[1].ai).toEqual({status: 'done', text: 'A general principle: drag lowers orbits.'});
    const sent = JSON.parse(fetch.mock.calls[0][1].body);
    expect(sent.question).toBe('What is the capital of France?'); expect(sent.context.recent).toEqual(['How do I play?']);
    h.a.dispose();
  });

  it('asks first when the player turned the automatic switch off, and remembers the choice', async () => {
    const h = makeStore();
    vi.stubGlobal('fetch', reply({ok: true, text: 'Fine.'}));
    h.a.setPref('aiBackup', false); expect(h.get().prefs.aiBackup).toBe(false); expect(h.stored().prefs.aiBackup).toBe(false);
    await h.a.ask('What is the capital of France?');
    await new Promise(r => setTimeout(r, 20));
    expect(fetch).not.toHaveBeenCalled(); expect(h.get().chat[0].ai).toBeUndefined();
    await h.a.askAI(0); expect(fetch).toHaveBeenCalledTimes(1); expect(h.get().chat[0].ai.status).toBe('done');
    h.a.setPref('aiBackup', true); expect(h.stored().prefs.aiBackup).toBeUndefined();
    h.a.dispose();
  });

  it('records an error state when the backup is unavailable', async () => {
    const h = makeStore();
    vi.stubGlobal('fetch', reply({ok: false, error: 'not_configured'}, 503));
    await h.a.ask('What is the capital of France?'); await waitAI(h, 0, 'error');
    expect(h.get().chat[0].ai).toEqual({status: 'error', error: 'not_configured'});
    h.a.dispose();
  });
});

describe('AI backup in the answer card', () => {
  it('shows a thinking bubble instead of the refusal while the backup answers', () => {
    render(card(refused, {ai: {status: 'loading'}, onAI: () => {}}));
    expect(screen.getByTestId('ai-loading')).toBeTruthy(); expect(screen.queryByText(/I can’t answer/)).toBeNull();
  });

  it('shows the AI answer like any other answer, with a small badge and no refusal text', () => {
    render(card(refused, {ai: {status: 'done', text: '<img src=x onerror=alert(1)> Hello'}, onAI: () => {}}));
    const done = screen.getByTestId('ai-answer');
    expect(within(done).getByText(/AI backup · not verified/)).toBeTruthy(); expect(done.querySelector('img')).toBeNull(); expect(done.textContent).toContain('<img src=x onerror=alert(1)> Hello');
    expect(screen.queryByText(/I can’t answer/)).toBeNull(); expect(screen.getByRole('button', {name: 'Review my design'})).toBeTruthy();
  });

  it('keeps the refusal and offers a retry when the backup failed', async () => {
    const onAI = vi.fn();
    render(card(refused, {ai: {status: 'error', error: 'rate_limited'}, onAI}));
    expect(screen.getByText(/I can’t answer/)).toBeTruthy(); expect(screen.getByRole('alert').textContent).toMatch(/Too many AI requests/);
    await userEvent.setup().click(screen.getByRole('button', {name: /again/})); expect(onAI).toHaveBeenCalledTimes(1);
  });

  it('shows the ask-first button with the privacy note when there is no AI state yet, and never on a verified answer', async () => {
    const onAI = vi.fn();
    const {unmount} = render(card(refused, {onAI}));
    expect(screen.getByText(/Nothing is sent until you press the button/)).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', {name: /Ask the AI backup/})); expect(onAI).toHaveBeenCalledTimes(1);
    unmount();
    render(card({known: true, evidence: 'PROJECT KNOWLEDGE', title: 't', text: 'x', sources: [], suggestions: []}, {onAI}));
    expect(screen.queryByRole('button', {name: /AI backup/})).toBeNull();
  });
});
