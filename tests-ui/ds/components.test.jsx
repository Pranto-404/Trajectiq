import {describe, it, expect, vi, afterEach} from 'vitest';
import {useState} from 'react';
import {screen, fireEvent, act, within, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Chip, Panel, PartCard, Gauge, Segmented, Slider, Dialog, Sheet, Toast, ToastViewport, Icon, ICON_NAMES, Concept, setConceptOpener, LiveRegion, announce, Button, partDelta, MotionProvider, useReducedMotion} from '@/ds/index.js';
import {renderDs} from './wrap.jsx';

afterEach(() => { vi.useRealTimers(); document.documentElement.removeAttribute('data-motion'); });

describe('Icon', () => {
  it('has about 30+ hand-authored icons; decorative by default, named when given a title', () => {
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(30);
    for (const required of ['bus', 'payload', 'power', 'propulsion', 'comms', 'storage', 'launch', 'play', 'pause', 'step', 'fast', 'lock', 'check', 'warning', 'orbit', 'eclipse', 'signal', 'battery', 'fuel', 'assistant', 'sound-on', 'sound-off', 'vibration', 'fullscreen', 'help', 'share', 'close']) expect(ICON_NAMES).toContain(required);
    const {container} = renderDs(<><Icon name="power" /><Icon name="power" title="Power system" /></>);
    const [a, b] = container.querySelectorAll('svg');
    expect(a.getAttribute('aria-hidden')).toBe('true'); expect(a.getAttribute('role')).toBeNull();
    expect(screen.getByRole('img', {name: 'Power system'})).toBe(b);
    expect(renderDs(<Icon name="does-not-exist" />).container.querySelector('svg')).toBeNull();
  });
});

describe('Chip', () => {
  it('always shows an icon and text, never colour alone', () => {
    const {container} = renderDs(<><Chip kind="pass" /><Chip kind="warn">Careful</Chip><Chip kind="fail" size="sm" /></>);
    for (const chip of container.querySelectorAll('span[class*="chip"]')) { expect(chip.querySelector('svg')).toBeTruthy(); expect(chip.textContent.trim().length).toBeGreaterThan(0); }
    expect(screen.getByText('Pass')).toBeTruthy(); expect(screen.getByText('Careful')).toBeTruthy();
  });
  it('selectable chips are toggle buttons', async () => {
    const onClick = vi.fn(); renderDs(<Chip selectable selected onClick={onClick}>Moon</Chip>);
    const b = screen.getByRole('button', {name: 'Moon'}); expect(b.getAttribute('aria-pressed')).toBe('true'); await userEvent.setup().click(b); expect(onClick).toHaveBeenCalled();
  });
});

describe('Panel', () => {
  it('is a labelled region with a title, shows lock chip when locked', () => {
    renderDs(<Panel title="Parts" state="locked" kicker="Assembly"><p>x</p></Panel>);
    expect(screen.getByRole('region', {name: 'Parts'})).toBeTruthy(); expect(screen.getByText('Locked')).toBeTruthy();
  });
  it('collapsible panels expose aria-expanded and hide the body', async () => {
    renderDs(<Panel title="Mobile" collapsible><p>Body</p></Panel>);
    const t = screen.getByRole('button', {name: 'Collapse Mobile'}); expect(t.getAttribute('aria-expanded')).toBe('true');
    await userEvent.setup().click(t); expect(screen.queryByText('Body')).toBeNull(); expect(screen.getByRole('button', {name: 'Expand Mobile'}).getAttribute('aria-expanded')).toBe('false');
  });
});

describe('PartCard', () => {
  const installed = {id: 'a', name: 'Light kit', note: 'n', mass: 10, cost: 10, power: 0};
  const part = {id: 'b', name: 'Endurance kit', note: 'Bigger battery', mass: 22, cost: 8, power: 5};
  it('computes signed deltas against the installed part', () => { expect(partDelta(part, installed, 'mass')).toBe(12); expect(partDelta(part, installed, 'cost')).toBe(-2); expect(partDelta(installed, installed, 'mass')).toBe(0); expect(partDelta(part, null, 'mass')).toBe(0); });
  it('shows +12 kg and -2 cr chips, installs on click and Enter, previews on hover and focus', async () => {
    const onInstall = vi.fn(), onPreview = vi.fn(); renderDs(<PartCard part={part} installed={installed} kind="power" onInstall={onInstall} onPreview={onPreview} />);
    const b = screen.getByRole('button', {name: /Endurance kit/}); expect(b.getAttribute('aria-pressed')).toBe('false');
    expect(b.querySelector('[data-delta="mass"]').textContent).toContain('+12 kg'); expect(b.querySelector('[data-delta="cost"]').textContent).toContain('−2 cr');
    expect(b.querySelector('[data-delta="mass"]').dataset.trend).toBe('bad'); expect(b.querySelector('[data-delta="cost"]').dataset.trend).toBe('good');
    const user = userEvent.setup(); await user.hover(b); expect(onPreview).toHaveBeenLastCalledWith('b'); await user.unhover(b); expect(onPreview).toHaveBeenLastCalledWith(null);
    act(() => b.focus()); expect(onPreview).toHaveBeenLastCalledWith('b'); act(() => b.blur()); expect(onPreview).toHaveBeenLastCalledWith(null);
    await user.click(b); b.focus(); await user.keyboard('{Enter}'); expect(onInstall).toHaveBeenCalledTimes(2);
  });
  it('installed and locked states', () => {
    const {rerender} = renderDs(<PartCard part={installed} installed={installed} />);
    expect(screen.getByRole('button', {pressed: true})).toBeTruthy(); expect(screen.getByText('Installed')).toBeTruthy();
    const onInstall = vi.fn(); rerender(<PartCard part={part} installed={installed} state="locked" disabledReason="Hardware is locked after launch" onInstall={onInstall} />);
    const b = screen.getByRole('button', {name: /Endurance kit/}); fireEvent.click(b); expect(onInstall).not.toHaveBeenCalled(); expect(b).toHaveAccessibleDescription('Hardware is locked after launch');
  });
  it('drag payload carries kind and id', () => {
    renderDs(<PartCard part={part} installed={installed} kind="power" draggable />);
    const setData = vi.fn(); fireEvent.dragStart(screen.getByRole('button', {name: /Endurance kit/}), {dataTransfer: {setData}});
    expect(setData).toHaveBeenCalledWith('application/x-trajectiq', JSON.stringify({kind: 'power', id: 'b'}));
  });
});

describe('Gauge', () => {
  it('is a meter with value, range and spoken text', () => {
    renderDs(<Gauge kind="margin" label="Mass used" value={164} max={220} unit="kg" />);
    const m = screen.getByRole('meter', {name: 'Mass used'}); expect(m.getAttribute('aria-valuenow')).toBe('164'); expect(m.getAttribute('aria-valuemax')).toBe('220'); expect(m.getAttribute('aria-valuetext')).toBe('164 kg of 220 kg');
    expect(screen.getByText(/56 kg margin/)).toBeTruthy();
  });
  it('draws a ghost segment for a preview, up and down, and says so', () => {
    const {container, rerender} = renderDs(<Gauge label="Cost" value={90} max={150} unit="cr" preview={118} />);
    expect(container.querySelector('[data-ghost="up"]')).toBeTruthy(); expect(screen.getByText(/Preview 118 cr/)).toBeTruthy();
    rerender(<Gauge label="Cost" value={90} max={150} unit="cr" preview={60} />); expect(container.querySelector('[data-ghost="down"]')).toBeTruthy();
    rerender(<Gauge label="Cost" value={90} max={150} unit="cr" />); expect(container.querySelector('[data-ghost]')).toBeNull();
  });
  it('segments, arc and thresholds', () => {
    const {container, rerender} = renderDs(<Gauge kind="segments" label="Recorder" value={55} max={100} segments={10} thresholds={[{at: 75, label: 'Warning 75%'}]} />);
    expect(container.querySelectorAll('[data-on]')).toHaveLength(6); expect(screen.getByText('Warning 75%')).toBeTruthy();
    rerender(<Gauge kind="arc" label="Battery" value={50} max={100} thresholds={[{at: 15, label: 'Safe mode 15%'}]} />); expect(container.querySelector('svg path')).toBeTruthy();
    rerender(<Gauge label="Fuel" value={5} max={10} thresholds={[{at: 2}]} />); expect(container.querySelector('[data-tick]')).toBeTruthy();
  });
  it('status chips carry text and critical is announced assertively', () => {
    const {rerender} = renderDs(<><Gauge label="Battery" value={50} max={100} unit="%" status="nominal" /><LiveRegion /></>);
    rerender(<><Gauge label="Battery" value={12} max={100} unit="%" status="critical" /><LiveRegion /></>);
    expect(screen.getByText('Critical')).toBeTruthy(); expect(screen.getByRole('alert').textContent).toMatch(/Battery critical: 12 % of 100 %/);
    rerender(<><Gauge label="Battery" value={30} max={100} status="warning" /><LiveRegion /></>); expect(screen.getByText('Warning')).toBeTruthy();
    rerender(<><Gauge label="Battery" value={30} max={100} status="locked" /><LiveRegion /></>); expect(screen.getByText('Locked')).toBeTruthy();
  });
});

describe('Segmented', () => {
  function Demo({onChange}) { const [v, setV] = useState('a'); return <Segmented label="Mode" value={v} onChange={x => { setV(x); onChange?.(x); }} options={[{value: 'a', label: 'Alpha'}, {value: 'b', label: 'Beta', disabled: true}, {value: 'c', label: 'Gamma'}]} />; }
  it('is a radiogroup with a roving tabindex, arrow keys skip disabled options, Home/End work', async () => {
    const onChange = vi.fn(); renderDs(<Demo onChange={onChange} />);
    const group = screen.getByRole('radiogroup', {name: 'Mode'}); const [a, b, c] = within(group).getAllByRole('radio');
    expect(a.getAttribute('aria-checked')).toBe('true'); expect(a.tabIndex).toBe(0); expect(c.tabIndex).toBe(-1); expect(b.getAttribute('aria-disabled')).toBe('true');
    a.focus(); const user = userEvent.setup(); await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('c'); expect(c).toHaveFocus(); expect(c.getAttribute('aria-checked')).toBe('true');
    await user.keyboard('{ArrowRight}'); expect(a).toHaveFocus(); await user.keyboard('{End}'); expect(c).toHaveFocus(); await user.keyboard('{Home}'); expect(a).toHaveFocus();
    await user.click(b); expect(b.getAttribute('aria-checked')).toBe('false');
  });
});

describe('Slider', () => {
  it('is a labelled range; onChange streams while dragging, onCommit fires once at the end; the number field works', () => {
    const onChange = vi.fn(), onCommit = vi.fn(); renderDs(<Slider label="Propellant" unit="kg" min={0} max={160} value={55} onChange={onChange} onCommit={onCommit} />);
    const range = screen.getByRole('slider', {name: 'Propellant'}); expect(range.getAttribute('aria-valuetext')).toBe('55 kg');
    fireEvent.change(range, {target: {value: '70'}}); expect(onChange).toHaveBeenLastCalledWith(70); expect(onCommit).not.toHaveBeenCalled();
    fireEvent.keyUp(range, {key: 'ArrowRight'}); expect(onCommit).toHaveBeenCalledTimes(1);
    const field = screen.getByRole('spinbutton', {name: 'Propellant value'}); fireEvent.change(field, {target: {value: '999'}}); expect(onChange).toHaveBeenLastCalledWith(160);
  });
  it('disabled explains why', () => { renderDs(<Slider label="Fuel" min={0} max={10} value={3} onChange={() => {}} disabled disabledReason="Locked after launch" />); expect(screen.getByRole('slider', {name: 'Fuel'}).disabled).toBe(true); expect(screen.getByText('Locked after launch')).toBeTruthy(); });
});

describe('Dialog', () => {
  function Harness({dismissible = true}) {
    const [open, setOpen] = useState(false);
    return <><Button onClick={() => setOpen(true)}>Open</Button><Dialog open={open} onClose={() => setOpen(false)} title="Commit your design?" description="Hardware locks." dismissible={dismissible}><Button data-autofocus>First</Button><Button>Second</Button></Dialog></>;
  }
  it('is a labelled modal dialog: moves focus in, traps Tab, closes on Escape and returns focus, background is inert', async () => {
    const {container} = renderDs(<Harness />); const user = userEvent.setup();
    const opener = screen.getByRole('button', {name: 'Open'}); await user.click(opener);
    const dlg = await screen.findByRole('dialog', {name: 'Commit your design?'}); expect(dlg.getAttribute('aria-modal')).toBe('true'); expect(dlg).toHaveAccessibleDescription('Hardware locks.');
    expect(screen.getByRole('button', {name: 'First'})).toHaveFocus(); expect(container.hasAttribute('inert')).toBe(true);
    await user.tab(); await user.tab(); await user.tab(); // Second, Close... cycles inside
    expect(dlg.contains(document.activeElement)).toBe(true);
    await user.tab({shift: true}); expect(dlg.contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(container.hasAttribute('inert')).toBe(false); expect(opener).toHaveFocus();
  });
  it('the scrim and the close button dismiss; a non-dismissible dialog ignores Escape', async () => {
    renderDs(<Harness />); const user = userEvent.setup(); await user.click(screen.getByRole('button', {name: 'Open'}));
    await user.click(await screen.findByRole('button', {name: 'Close'})); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('non-dismissible: Escape does nothing and there is no close button', async () => {
    renderDs(<Harness dismissible={false} />); const user = userEvent.setup(); await user.click(screen.getByRole('button', {name: 'Open'}));
    await screen.findByRole('dialog'); await user.keyboard('{Escape}'); expect(screen.getByRole('dialog')).toBeTruthy(); expect(screen.queryByRole('button', {name: 'Close'})).toBeNull();
  });
  it('alert dialogs use role alertdialog', async () => {
    renderDs(<Dialog open onClose={() => {}} title="Discard the active flight?" alert><Button>Keep flight</Button></Dialog>);
    expect(await screen.findByRole('alertdialog', {name: 'Discard the active flight?'})).toBeTruthy();
  });
});

describe('Sheet', () => {
  it('side sheet is a labelled dialog that closes on Escape and returns focus', async () => {
    function H() { const [o, setO] = useState(false); return <><Button onClick={() => setO(true)}>Menu</Button><Sheet open={o} onClose={() => setO(false)} title="Assistant" placement="side"><Button>Ask</Button></Sheet></>; }
    renderDs(<H />); const user = userEvent.setup(); const opener = screen.getByRole('button', {name: 'Menu'}); await user.click(opener);
    const sheet = await screen.findByRole('dialog', {name: 'Assistant'}); expect(sheet.dataset.placement).toBe('side');
    await user.keyboard('{Escape}'); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); expect(opener).toHaveFocus();
  });
  it('bottom placement is reported', async () => { renderDs(<Sheet open onClose={() => {}} title="Parts" placement="bottom"><p>x</p></Sheet>); expect((await screen.findByRole('dialog', {name: 'Parts'})).dataset.placement).toBe('bottom'); });
});

describe('Toast', () => {
  it('the viewport is a polite status list, shows at most 3 and dismisses', async () => {
    const onDismiss = vi.fn(); const toasts = [1, 2, 3, 4].map(i => ({id: i, text: `Toast ${i}`, kind: 'info'}));
    renderDs(<ToastViewport toasts={toasts} onDismiss={onDismiss} />);
    const list = screen.getByRole('status', {name: 'Notifications'}); expect(within(list).getAllByRole('listitem')).toHaveLength(3); expect(screen.queryByText('Toast 1')).toBeNull();
    await userEvent.setup().click(within(list).getAllByRole('button', {name: 'Dismiss'})[0]); expect(onDismiss).toHaveBeenCalledWith(2);
  });
  it('auto-dismisses after 4 s and pauses while hovered', () => {
    vi.useFakeTimers(); const onDismiss = vi.fn(); renderDs(<ul><Toast id="x" onDismiss={onDismiss}>Hello</Toast></ul>);
    act(() => { vi.advanceTimersByTime(3000); }); expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.pointerEnter(screen.getByText('Hello').closest('li')); act(() => { vi.advanceTimersByTime(10000); }); expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.pointerLeave(screen.getByText('Hello').closest('li')); act(() => { vi.advanceTimersByTime(1100); }); expect(onDismiss).toHaveBeenCalledWith('x');
  });
});

describe('Concept, LiveRegion', () => {
  it('Concept is a named "?" button that calls the registered opener', async () => {
    const open = vi.fn(); setConceptOpener(open); renderDs(<Concept id="eclipse" label="eclipse" />);
    await userEvent.setup().click(screen.getByRole('button', {name: 'About eclipse'})); expect(open).toHaveBeenCalledWith('eclipse'); setConceptOpener(null);
  });
  it('LiveRegion announces politely and assertively, even for repeated messages', () => {
    vi.useFakeTimers(); renderDs(<LiveRegion />);
    act(() => announce('Installed Endurance solar kit.')); expect(screen.getByRole('status').textContent).toContain('Installed Endurance solar kit.');
    const first = screen.getByRole('status').textContent; act(() => announce('Installed Endurance solar kit.')); expect(screen.getByRole('status').textContent).not.toBe(first);
    act(() => announce('Decision required', {assertive: true})); expect(screen.getByRole('alert').textContent).toContain('Decision required');
    act(() => { vi.advanceTimersByTime(6100); }); expect(screen.getByRole('status').textContent).toBe('');
  });
});

describe('reduced motion: one source of truth', () => {
  function Probe() { return <output data-testid="r">{String(useReducedMotion())}</output>; }
  it('the in-app toggle sets html[data-motion=reduced] and the hook', () => {
    const {rerender} = renderDs(<Probe />, {reduced: false});
    expect(screen.getByTestId('r').textContent).toBe('false'); expect(document.documentElement.dataset.motion).toBeUndefined();
    rerender(<MotionProvider reduced><Probe /></MotionProvider>);
    expect(screen.getByTestId('r').textContent).toBe('true'); expect(document.documentElement.dataset.motion).toBe('reduced');
  });
  it('the system preference alone also reduces motion', () => {
    const mm = vi.fn(q => ({matches: /reduce/.test(q), addEventListener() {}, removeEventListener() {}})); vi.stubGlobal('matchMedia', mm);
    renderDs(<Probe />, {reduced: false}); expect(screen.getByTestId('r').textContent).toBe('true'); expect(document.documentElement.dataset.motion).toBe('reduced'); vi.unstubAllGlobals();
  });
});
