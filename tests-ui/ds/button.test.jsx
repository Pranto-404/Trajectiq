import {describe, it, expect, vi, afterEach} from 'vitest';
import {screen, fireEvent, act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {Button} from '@/ds/index.js';
import {renderDs} from './wrap.jsx';

afterEach(() => vi.useRealTimers());

describe('Button', () => {
  it('is a named button, activates by click, Enter and Space', async () => {
    const onClick = vi.fn(); renderDs(<Button variant="primary" onClick={onClick}>Launch</Button>);
    const b = screen.getByRole('button', {name: 'Launch'}); expect(b).toHaveProperty('type', 'button');
    const user = userEvent.setup(); await user.click(b); b.focus(); await user.keyboard('{Enter}'); await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it('icon-only buttons are named by their label and decorative icons are hidden', () => {
    renderDs(<Button iconOnly icon="close" label="Close dialog" />);
    const b = screen.getByRole('button', {name: 'Close dialog'});     expect(b.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('disabled uses aria-disabled, stays focusable, ignores clicks and explains why', async () => {
    const onClick = vi.fn(); renderDs(<Button disabled disabledReason="Fix 2 failed checks to launch" onClick={onClick}>Launch readiness</Button>);
    const b = screen.getByRole('button', {name: 'Launch readiness'});
    expect(b.getAttribute('aria-disabled')).toBe('true'); expect(b.hasAttribute('disabled')).toBe(false);
    const user = userEvent.setup(); await user.click(b); b.focus(); expect(b).toHaveFocus(); await user.keyboard('{Enter}');
    expect(onClick).not.toHaveBeenCalled();
    expect(b).toHaveAccessibleDescription('Fix 2 failed checks to launch');
  });

  it('loading sets aria-busy, shows a spinner, ignores clicks and keeps the width', async () => {
    const onClick = vi.fn(); const {rerender} = renderDs(<Button onClick={onClick}>Run job</Button>);
    rerender(<Button loading onClick={onClick}>Run job</Button>);
    const b = screen.getByRole('button', {name: /Run job/}); expect(b.getAttribute('aria-busy')).toBe('true');
    expect(b.querySelector('[data-spinner]')).toBeTruthy(); await userEvent.setup().click(b); expect(onClick).not.toHaveBeenCalled();
  });

  it('success shows a check', () => { renderDs(<Button success>Saved</Button>); expect(document.querySelector('[data-success]')).toBeTruthy(); });

  describe('commit (hold to confirm)', () => {
    it('confirms after holding the pointer for 700 ms, not before', () => {
      vi.useFakeTimers(); const onConfirm = vi.fn(); renderDs(<Button variant="commit" onConfirm={onConfirm}>Authorize launch</Button>);
      const b = screen.getByRole('button', {name: 'Authorize launch'});
      fireEvent.pointerDown(b); act(() => { vi.advanceTimersByTime(699); }); expect(onConfirm).not.toHaveBeenCalled(); expect(b.dataset.holding).toBe('true');
      act(() => { vi.advanceTimersByTime(2); }); expect(onConfirm).toHaveBeenCalledTimes(1);
      fireEvent.pointerUp(b); expect(onConfirm).toHaveBeenCalledTimes(1); // releasing after a completed hold is not a second confirm
    });

    it('releasing early cancels the hold and arms "Press again to confirm"; a second tap confirms', () => {
      vi.useFakeTimers(); const onConfirm = vi.fn(); renderDs(<Button variant="commit" onConfirm={onConfirm}>Authorize launch</Button>);
      let b = screen.getByRole('button');
      fireEvent.pointerDown(b); act(() => { vi.advanceTimersByTime(200); }); fireEvent.pointerUp(b);
      expect(onConfirm).not.toHaveBeenCalled(); b = screen.getByRole('button'); expect(b).toHaveTextContent('Press again to confirm');
      fireEvent.pointerDown(b); fireEvent.pointerUp(b); expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button')).toHaveTextContent('Authorize launch');
    });

    it('the armed state expires after 3 s', () => {
      vi.useFakeTimers(); const onConfirm = vi.fn(); renderDs(<Button variant="commit" onConfirm={onConfirm}>Go</Button>);
      const b = screen.getByRole('button'); fireEvent.pointerDown(b); fireEvent.pointerUp(b); expect(b).toHaveTextContent('Press again');
      act(() => { vi.advanceTimersByTime(3100); }); expect(b).toHaveTextContent('Go'); fireEvent.pointerDown(b); fireEvent.pointerUp(b); expect(onConfirm).not.toHaveBeenCalled();
    });

    it('works from the keyboard: hold Space/Enter, or tap twice', () => {
      vi.useFakeTimers(); const onConfirm = vi.fn(); renderDs(<Button variant="commit" onConfirm={onConfirm}>Go</Button>);
      const b = screen.getByRole('button');
      fireEvent.keyDown(b, {key: ' '}); fireEvent.keyDown(b, {key: ' ', repeat: true}); act(() => { vi.advanceTimersByTime(700); }); expect(onConfirm).toHaveBeenCalledTimes(1); fireEvent.keyUp(b, {key: ' '});
      fireEvent.keyDown(b, {key: 'Enter'}); fireEvent.keyUp(b, {key: 'Enter'}); expect(b).toHaveTextContent('Press again');
      fireEvent.keyDown(b, {key: 'Enter'}); fireEvent.keyUp(b, {key: 'Enter'}); expect(onConfirm).toHaveBeenCalledTimes(2);
    });

    it('leaving the button or blurring cancels without arming; a disabled commit never confirms', () => {
      vi.useFakeTimers(); const onConfirm = vi.fn(); const {rerender} = renderDs(<Button variant="commit" onConfirm={onConfirm}>Go</Button>);
      const b = screen.getByRole('button'); fireEvent.pointerDown(b); fireEvent.pointerLeave(b); act(() => { vi.advanceTimersByTime(1000); }); expect(onConfirm).not.toHaveBeenCalled(); expect(b).toHaveTextContent('Go');
      rerender(<Button variant="commit" disabled disabledReason="Not yet" onConfirm={onConfirm}>Go</Button>);
      fireEvent.pointerDown(b); act(() => { vi.advanceTimersByTime(1000); }); expect(onConfirm).not.toHaveBeenCalled();
    });

    it('with reduced motion it says "Keep holding" instead of animating a fill', () => {
      vi.useFakeTimers(); renderDs(<Button variant="commit" onConfirm={() => {}}>Go</Button>, {reduced: true});
      const b = screen.getByRole('button'); fireEvent.pointerDown(b); expect(b).toHaveTextContent('Keep holding'); fireEvent.pointerLeave(b);
    });
  });
});
