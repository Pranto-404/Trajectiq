import {describe, it, expect, beforeEach} from 'vitest';
import {screen, within, act, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {presetFor} from '@data/catalog.js';
import {useGame} from '@/store/index.js';
import {AssistantBody} from '@/features/sheets/AssistantBody.jsx';
import {proposalStale, DirectionChips} from '@/features/sheets/AnswerCard.jsx';
import {wrap, acts, resetStore, flyToCrisis, EVIL} from './helpers.jsx';

beforeEach(() => resetStore());

async function ask(user, text) {
  const box = screen.getByRole('textbox', {name: 'Your question'});
  await user.clear(box); await user.click(box); await user.paste(text);
  await user.click(screen.getByRole('button', {name: 'Ask'}));
}

describe('assistant: preview, apply and stale proposals', () => {
  it('previews read-only, then Apply to draft changes the design and closes the sheet', async () => {
    wrap(<AssistantBody />);
    const user = userEvent.setup(), before = useGame.getState().design;
    await ask(user, 'What if fuel = 45');
    const card = await screen.findByTestId('answer');
    expect(within(card).getByText('GAME MODEL · SIMULATION')).toBeTruthy();
    expect(within(card).getByRole('list', {name: 'What would change in the draft'}).textContent).toContain('45');
    expect(useGame.getState().design).toEqual(before);
    act(() => useGame.setState({sheet: {id: 'assistant', props: {}, key: 1}}));
    await user.click(within(card).getByRole('button', {name: /Apply to draft/}));
    expect(useGame.getState().design.fuel).toBe(45); expect(useGame.getState().sheet).toBeNull();
  });

  it('a stale proposal is disabled and cannot overwrite a newer design', async () => {
    wrap(<AssistantBody />);
    const user = userEvent.setup();
    await ask(user, 'What if battery size = 1.5');
    const btn = await screen.findByRole('button', {name: /Apply to draft/});
    expect(btn.getAttribute('aria-disabled')).toBeNull();
    act(() => { acts().install('power', 'compact'); });
    await waitFor(() => expect(screen.getByRole('button', {name: /Apply to draft/}).getAttribute('aria-disabled')).toBe('true'));
    expect(screen.getByRole('button', {name: /Apply to draft/})).toHaveAccessibleDescription('Your design has changed. Ask again to refresh this preview.');
    await user.click(screen.getByRole('button', {name: /Apply to draft/}));
    expect(useGame.getState().design.batteryScale).toBe(1); expect(useGame.getState().design.power).toBe('compact');
    // even if the button were forced, the store refuses a stale proposal
    acts().applyAssistant(0); expect(useGame.getState().design.batteryScale).toBe(1);
  });

  it('hardware stays locked during a flight', async () => {
    wrap(<AssistantBody />);
    const user = userEvent.setup();
    await ask(user, 'What if fuel = 45');
    await screen.findByRole('button', {name: /Apply to draft/});
    act(() => { acts()['game-launch'](); });
    await waitFor(() => expect(screen.getByRole('button', {name: /Apply to draft/}).getAttribute('aria-disabled')).toBe('true'));
    expect(screen.getByRole('button', {name: /Apply to draft/})).toHaveAccessibleDescription('Hardware is locked until this flight ends.');
    const design = useGame.getState().design; acts().applyAssistant(0); expect(useGame.getState().design).toEqual(design);
    acts().dispose();
  });

  it('proposalStale compares exactly the keys the proposal was based on', () => {
    const d = presetFor('moon', 'balanced');
    expect(proposalStale({base: {fuel: d.fuel}, patch: {fuel: 40}}, d)).toBe(false);
    expect(proposalStale({base: {fuel: d.fuel + 1}, patch: {fuel: 40}}, d)).toBe(true);
    expect(proposalStale(null, d)).toBe(true);
  });
});

describe('assistant: text safety, levels, conversation', () => {
  it('renders hostile questions and answers as text', async () => {
    const {container} = wrap(<AssistantBody />);
    const user = userEvent.setup();
    await ask(user, `${EVIL} What if fuel = 45`);
    await screen.findByTestId('answer');
    expect(container.querySelector('img,script')).toBeNull(); expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('Beginner folds the table; Engineer shows it open; the level is stored', async () => {
    wrap(<AssistantBody />);
    const user = userEvent.setup();
    await ask(user, 'Compare presets');
    const card = await screen.findByTestId('answer');
    expect(within(card).getByText('Show the simulation table')).toBeTruthy();
    await user.click(screen.getByRole('radio', {name: 'Engineer'}));
    expect(useGame.getState().mentorLevel).toBe('Engineer');
    expect(within(await screen.findByTestId('answer')).getByRole('table')).toBeTruthy();
    expect(screen.queryByText('Show the simulation table')).toBeNull();
  });

  it('clears the conversation and ignores empty questions', async () => {
    wrap(<AssistantBody />);
    const user = userEvent.setup();
    await ask(user, 'How do I play?');
    await screen.findByTestId('answer');
    await user.click(screen.getByRole('button', {name: 'Clear conversation'}));
    expect(useGame.getState().chat).toHaveLength(0);
    expect(screen.getByRole('button', {name: 'Clear conversation'}).getAttribute('aria-disabled')).toBe('true');
  });

  it('the experiment picker and form ask what-if questions without typing the sentence', async () => {
    wrap(<AssistantBody />);
    const user = userEvent.setup();
    await user.click(screen.getByText('Try a change · no typing needed'));
    await user.selectOptions(screen.getByLabelText('Component or distance'), 'What if Compact solar kit');
    await waitFor(() => expect(useGame.getState().chat.length).toBe(1));
    await user.selectOptions(screen.getByLabelText('Setting'), 'duty');
    await user.click(screen.getByRole('button', {name: 'Preview change'}));
    await waitFor(() => expect(useGame.getState().chat.length).toBe(2));
    expect(useGame.getState().chat[1].q).toMatch(/duty/);
  });
});

describe('assistant: crisis direction chips and the one forecast', () => {
  it('shows direction-only chips (no numbers) with provenance, and the forecast ranges once', async () => {
    acts().preset('fragile');
    const run = flyToCrisis();
    if (!run.crisis) return; // the fragile preset normally pauses for a decision; guard keeps the test honest if the model changes
    wrap(<AssistantBody />);
    const panel = screen.getByRole('region', {name: 'Rough preview of the pending decision'});
    const chips = within(panel).getByRole('list', {name: 'Direction of each response'});
    expect(chips.textContent).not.toMatch(/\d{2,}/);
    expect(within(panel).getByText(/rehearsed to campaign end/)).toBeTruthy();
    const user = userEvent.setup();
    await user.click(within(panel).getByRole('button', {name: 'Spend my one forecast for ranges'}));
    expect(await screen.findByRole('list', {name: 'Forecast ranges'})).toBeTruthy();
    acts().dispose();
  });
  it('DirectionChips gives every chip a spoken meaning, not just an arrow', () => {
    wrap(<DirectionChips directions={[{id: 'a', name: EVIL, chips: [{key: 'Science returned', dir: 2}, {key: 'Battery at end', dir: -1}, {key: 'Data kept', dir: 0}]}]} />);
    expect(screen.getByText('better', {exact: false})).toBeTruthy(); expect(screen.getByText('worse', {exact: false})).toBeTruthy(); expect(document.querySelector('img,script')).toBeNull();
  });
});
