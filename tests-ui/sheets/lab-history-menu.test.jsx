import {describe, it, expect, beforeEach, vi} from 'vitest';
import {screen, within, act, fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {normalize} from '@engine/model.js';
import {presetFor} from '@data/catalog.js';
import {useGame} from '@/store/index.js';
import {LabSheet, arrayChoices} from '@/features/sheets/LabSheet.jsx';
import {HistorySheet, batteryPoints} from '@/features/sheets/HistorySheet.jsx';
import {MenuSheet} from '@/features/sheets/MenuSheet.jsx';
import {makeRun} from '../report/fixtures.js';
import {wrap, acts, resetStore, EVIL} from './helpers.jsx';

beforeEach(() => resetStore());

describe('engineering lab', () => {
  it('changes save as you make them and the summary updates in a live region', async () => {
    wrap(<LabSheet />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', {name: 'Extra · 125%'}));
    expect(useGame.getState().design.batteryScale).toBe(1.25);
    await user.click(screen.getByRole('radio', {name: '100% · max'}));
    expect(useGame.getState().design.duty).toBe(1);
    await user.click(screen.getByRole('radio', {name: 'Ion cyan'}));
    expect(useGame.getState().design.livery).toBe('cyan');
    expect(document.querySelector('[aria-live="polite"]').textContent).toMatch(/Mass/);
    expect(JSON.parse(localStorage.getItem('trajectiq-v1')).design.batteryScale).toBe(1.25);
  });
  it('the mission name is limited, free text, and rendered as an input value never as markup', async () => {
    const {container} = wrap(<LabSheet />);
    const user = userEvent.setup(), name = screen.getByLabelText(/Mission name/);
    await user.clear(name); await user.click(name); await user.paste(EVIL);
    expect(container.querySelector('img,script')).toBeNull(); expect(name.maxLength).toBe(40);
    expect(useGame.getState().design.name.length).toBeLessThanOrEqual(40);
  });
  it('is read-only with an explanation while a flight is active', () => {
    acts()['game-launch']();
    wrap(<LabSheet />);
    expect(screen.getByRole('status').textContent).toMatch(/locked/);
    const before = useGame.getState().design;
    fireEvent.click(screen.getByRole('radio', {name: 'Extra · 125%'}));
    expect(useGame.getState().design).toEqual(before);
    acts().dispose();
  });
  it('offers larger arrays only where the scenario allows them', () => {
    expect(arrayChoices(1.5).map(c => c[0])).toEqual([0.75, 1, 1.25, 1.5]);
    expect(arrayChoices(4).map(c => c[0])).toContain(4);
    resetStore({design: normalize(presetFor('vesta', 'balanced', 'dawn-vesta'))});
    wrap(<LabSheet />);
    expect(screen.getAllByRole('radio', {name: /Extended · \d{3}%/}).length).toBeGreaterThan(3);
  });
  it('preferences toggles call the store', async () => {
    wrap(<LabSheet />);
    await userEvent.setup().click(screen.getByRole('checkbox', {name: 'Reduce animation'}));
    expect(useGame.getState().prefs.reducedMotion).toBe(false);
  });
});

describe('run history', () => {
  it('lists saved runs, reviews one, and clears through the confirmation sheet', async () => {
    const r1 = makeRun({id: 'a', label: 'R01'}), r2 = makeRun({id: 'b', label: EVIL});
    resetStore({runs: [r1, r2]});
    const load = vi.spyOn(acts(), 'loadRun').mockImplementation(() => {});
    const {container} = wrap(<HistorySheet close={() => {}} />);
    expect(container.querySelector('img,script')).toBeNull();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    await userEvent.setup().click(within(table).getByRole('button', {name: 'Review R01'}));
    expect(load).toHaveBeenCalledWith('a');
    await userEvent.setup().click(screen.getByRole('button', {name: 'Clear run history'}));
    expect(useGame.getState().sheet?.id).toBe('confirm-clear');
  });
  it('battery view (from game-history) draws the battery curve with a labelled threshold', () => {
    const r = makeRun({id: 'a'});
    resetStore({run: r, runs: [r]});
    wrap(<HistorySheet kind="battery" />);
    expect(screen.getByRole('img', {name: /Battery state of charge over the mission; lowest \d+ percent/})).toBeTruthy();
    expect(screen.getByRole('radio', {name: 'Battery history'}).getAttribute('aria-checked')).toBe('true');
    expect(batteryPoints([{minute: 0, battery: 100}, {minute: 240, battery: 0}], 240)).toBe('5.0,10.0 595.0,85.0');
    expect(batteryPoints(null, 240)).toBe('');
  });
});

describe('menu', () => {
  it('preferences are switches with spoken state and persist', async () => {
    wrap(<MenuSheet close={() => {}} />);
    const user = userEvent.setup();
    const sound = screen.getByRole('switch', {name: /Sound/});
    expect(sound.getAttribute('aria-checked')).toBe('false');
    await user.click(sound); expect(useGame.getState().prefs.sound).toBe(true); expect(screen.getByRole('switch', {name: /Sound/}).getAttribute('aria-checked')).toBe('true');
    await user.click(screen.getByRole('switch', {name: /Haptics/})); expect(useGame.getState().prefs.haptics).toBe(true);
    await user.click(screen.getByRole('switch', {name: /Reduce animation/})); expect(useGame.getState().prefs.reducedMotion).toBe(false);
    await user.selectOptions(screen.getByRole('combobox', {name: 'Language'}), 'bn'); expect(useGame.getState().prefs.language).toBe('bn');
    const saved = JSON.parse(localStorage.getItem('trajectiq-v1')).prefs; expect(saved.sound).toBe(true); expect(saved.language).toBe('bn');
  });
  it('tools open their sheets', async () => {
    wrap(<MenuSheet close={() => {}} />);
    const user = userEvent.setup();
    for (const [name, id] of [['Run history', 'history'], ['NASA data & credits', 'nasa'], ['Sources & method', 'sources'], ['Engineering lab', 'lab'], ['How to play', 'help'], ['Learning check', 'quiz'], ['Assistant', 'assistant'], ['Concept cards', 'concept']]) {
      await user.click(screen.getByRole('button', {name})); expect(useGame.getState().sheet?.id, name).toBe(id);
    }
  });
});
