import {describe, it, expect, beforeEach, vi} from 'vitest';
import {render, screen, within, act, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {encodeDesign} from '@engine/share.js';
import {presetFor} from '@data/catalog.js';
import {MotionProvider} from '@/ds/index.js';
import {useGame} from '@/store/index.js';
import {defaultIo} from '@/store/io.js';
import {SharePanel, CodeImport, CompareResult} from '@/features/report/SharePanel.jsx';
import {Leaderboard} from '@/features/report/Leaderboard.jsx';
import {PATCH_SIZE, drawPatch, patchModel, renderPatchBlob, seededStream} from '@/features/report/patch.js';
import {makeRun, showReport, resetStore, EVIL} from './fixtures.js';

const wrap = ui => render(ui, {wrapper: ({children}) => <MotionProvider reduced>{children}</MotionProvider>});
const acts = () => useGame.getState().actions;

function fakeCtx() {
  const calls = [];
  const grad = {addColorStop() {}};
  return new Proxy({calls}, {
    get: (t, k) => k === 'calls' ? calls : (k === 'createRadialGradient' || k === 'createLinearGradient') ? () => grad : typeof k === 'string' ? (...a) => { calls.push([k, ...a]); } : undefined,
    set: (t, k, v) => { calls.push(['set:' + k, v]); return true; }
  });
}

let run;
beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => fakeCtx()); run = makeRun(); showReport(run, {reportTab: 'share'}); });

describe('share code panel', () => {
  it('shows a TQ6 mission code for the run and routes copy, challenge link and print through the store actions', async () => {
    const copy = vi.spyOn(acts(), 'copy-code').mockResolvedValue(true), challenge = vi.spyOn(acts(), 'copy-challenge').mockResolvedValue(true), exp = vi.spyOn(acts(), 'export').mockImplementation(() => {});
    wrap(<SharePanel run={run} />);
    const box = screen.getByRole('textbox', {name: 'Mission code'});
    expect(box.value).toMatch(/^TQ6\.[A-Za-z0-9_-]+$/); expect(box.readOnly).toBe(true);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', {name: 'Copy code'})); await user.click(screen.getByRole('button', {name: 'Copy challenge link'})); await user.click(screen.getByRole('button', {name: 'Download read-only report'}));
    expect(copy).toHaveBeenCalled(); expect(challenge).toHaveBeenCalled(); expect(exp).toHaveBeenCalled();
  });

  it('adds to the leaderboard once and explains why it is disabled for sandbox or duplicate runs', async () => {
    const add = vi.spyOn(acts(), 'board-add');
    const first = wrap(<SharePanel run={run} />);
    const btn = screen.getByRole('button', {name: 'Add to leaderboard'});
    await userEvent.setup().click(btn);
    expect(add).toHaveBeenCalledTimes(1); expect(useGame.getState().board).toHaveLength(1);
    first.unmount(); wrap(<SharePanel run={run} />);
    const again = screen.getByRole('button', {name: 'Add to leaderboard'});
    expect(again.getAttribute('aria-disabled')).toBe('true'); expect(again).toHaveAccessibleDescription('Already on the leaderboard');
    await userEvent.setup().click(again); expect(useGame.getState().board).toHaveLength(1);
  });

  it('sandbox runs cannot be ranked', () => {
    const sb = makeRun({id: 's1', patch: {}}); sb.design = {...sb.design, sandbox: true};
    showReport(sb, {reportTab: 'share'});
    wrap(<SharePanel run={sb} />);
    expect(screen.getByRole('button', {name: 'Add to leaderboard'})).toHaveAccessibleDescription('Sandbox runs are not ranked');
  });
});

describe('compare and import with hostile codes', () => {
  it('rejects hostile codes with a visible alert and never stages an import', async () => {
    wrap(<CodeImport />);
    const user = userEvent.setup(), box = screen.getByRole('textbox', {name: 'Paste a TQ6 code'});
    for (const hostile of ['TQ6.' + 'A'.repeat(2500), 'hello', 'TQ6.%%%', EVIL, 'TQ6.' + btoa('{"v":1,"d":"x"}')]) {
      await user.clear(box); await user.click(box); await user.paste(hostile);
      await user.click(screen.getByRole('button', {name: 'Load into my hangar'}));
      expect(await screen.findByRole('alert')).toBeTruthy();
      expect(useGame.getState().pendingImport).toBeNull(); expect(useGame.getState().sheet).toBeNull();
      await user.click(screen.getByRole('button', {name: 'Compare with my design'}));
      await waitFor(() => expect(useGame.getState().compare?.error).toBeTruthy());
      expect(document.body.querySelector('img,script')).toBeNull();
    }
  });

  it('a valid code compares by re-flying both designs and can be staged for import (v1 Moon code)', async () => {
    wrap(<CodeImport />);
    const user = userEvent.setup(), code = encodeDesign(presetFor('moon', 'balanced'), {score: 999, team: EVIL});
    const box = screen.getByRole('textbox', {name: 'Paste a TQ6 code'});
    await user.click(box); await user.paste(code);
    await user.click(screen.getByRole('button', {name: 'Compare with my design'}));
    const result = await screen.findByTestId('compare-result');
    expect(within(result).getByText(/same seed and autopilot/)).toBeTruthy(); expect(within(result).getByText(/claims 999 points/)).toBeTruthy();
    expect(result.querySelector('img,script')).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Load into my hangar'}));
    expect(useGame.getState().pendingImport?.destination).toBe('moon'); expect(useGame.getState().sheet?.id).toBe('import-confirm');
  });

  it('accepts a payload-v2 code for another body and rejects a tampered one', async () => {
    wrap(<CodeImport />);
    const user = userEvent.setup(), box = screen.getByRole('textbox', {name: 'Paste a TQ6 code'});
    const d = presetFor('mercury', 'balanced', 'mercury-thermal');
    const code = encodeDesign({...d, scenario: 'mercury-thermal'});
    await user.click(box); await user.paste(code);
    await user.click(screen.getByRole('button', {name: 'Load into my hangar'}));
    expect(useGame.getState().pendingImport?.destination).toBe('mercury');
    act(() => { useGame.setState({pendingImport: null, sheet: null}); });
    await user.clear(box); await user.click(box);
    await user.paste(encodeDesign({...d, scenario: 'mercury-thermal'}).slice(0, -6) + 'AAAAAA');
    await user.click(screen.getByRole('button', {name: 'Load into my hangar'}));
    expect(await screen.findByRole('alert')).toBeTruthy(); expect(useGame.getState().pendingImport).toBeNull();
  });

  it('CompareResult renders decoder errors and hostile names as text', () => {
    const {container, rerender} = wrap(<CompareResult compare={{error: EVIL}} />);
    expect(screen.getByRole('alert').textContent).toContain('<img'); expect(container.querySelector('img,script')).toBeNull();
    rerender(<CompareResult compare={{mine: {launchable: true, science: 1, battery: 2, cost: 3, mass: 4, achieved: true}, theirs: {launchable: false}, theirName: EVIL, claimed: null}} />);
    expect(container.querySelector('img,script')).toBeNull(); expect(screen.getByText('Cannot launch')).toBeTruthy();
  });
});

describe('leaderboard', () => {
  it('shows the top ten of up to 30 entries and renders hostile fields as text', () => {
    const board = Array.from({length: 30}, (_, i) => ({id: 'b' + i, team: EVIL, label: EVIL, scenarioTitle: EVIL, difficulty: EVIL, mode: EVIL, grade: 'A', score: i * 10, code: 'c'}));
    const {container} = wrap(<Leaderboard board={board} currentId="b29" />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(10); expect(rows[0].textContent).toContain('290'); expect(rows[0].getAttribute('data-active')).toBe('true');
    expect(container.querySelector('img,script')).toBeNull();
  });
  it('explains the empty state', () => { wrap(<Leaderboard board={[]} />); expect(screen.getByText(/Finish a ranked mission/)).toBeTruthy(); });
});

describe('mission patch', () => {
  const model = () => patchModel({run, score: run.score, mission: {title: 'Lunar Polar Mapper', bodyName: 'Moon'}, body: null, code: 'TQ6.abc'});
  it('draws deterministically on a canvas context with no network and clips hostile text', () => {
    const a = fakeCtx(), b = fakeCtx(), m = model();
    drawPatch(a, m); drawPatch(b, m);
    expect(a.calls.length).toBeGreaterThan(40); expect(JSON.stringify(a.calls)).toBe(JSON.stringify(b.calls));
    const evil = patchModel({run: {...run, label: EVIL, design: {...run.design, name: EVIL.repeat(5)}}, score: run.score, mission: {title: EVIL.repeat(5)}, body: null, code: ''});
    expect(evil.name.length).toBeLessThanOrEqual(28); expect(evil.title.length).toBeLessThanOrEqual(34);
    const x = seededStream('a'), y = seededStream('a'); expect(x()).toBe(y());
  });
  it('renders a PNG blob through a canvas factory and resolves null without a 2D context', async () => {
    const blob = new Blob(['x'], {type: 'image/png'});
    const canvas = {getContext: () => fakeCtx(), toBlob: cb => cb(blob)};
    expect(await renderPatchBlob(model(), () => canvas)).toBe(blob);
    expect(await renderPatchBlob(model(), () => ({getContext: () => null}))).toBeNull();
    expect(await renderPatchBlob(model(), () => { throw new Error('no canvas'); })).toBeNull();
  });
  it('the share tab previews the patch and downloads it as a PNG file', async () => {
    const blob = new Blob(['x'], {type: 'image/png'});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => fakeCtx());
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb) { cb(blob); });
    const dl = vi.spyOn(defaultIo, 'download').mockImplementation(() => {});
    wrap(<SharePanel run={run} />);
    expect(screen.getByRole('img', {name: /Mission patch for .*grade [SABCD]/})).toBeTruthy();
    expect(screen.getByRole('img').getAttribute('width')).toBe(String(PATCH_SIZE));
    await userEvent.setup().click(screen.getByRole('button', {name: 'Download patch (PNG)'}));
    await waitFor(() => expect(dl).toHaveBeenCalled());
    expect(dl.mock.calls[0][1]).toBe('image/png'); expect(dl.mock.calls[0][2]).toMatch(/^TRAJECTIQ_patch_R01\.png$/);
  });
});
