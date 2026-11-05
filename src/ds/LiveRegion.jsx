import {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {announce, subscribeAnnouncements} from './announce.js';

/**
 * Mount once (the shell does). Two visually hidden regions: polite (role=status) for installs and phase changes,
 * assertive (role=alert) for crisis, critical battery and recorder warnings. Messages clear after 6 s; identical
 * consecutive messages are re-announced by alternating an invisible suffix.
 */
export function LiveRegion() {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const flip = useRef(false);
  const timers = useRef({});
  useEffect(() => subscribeAnnouncements(m => {
    flip.current = !flip.current;
    const text = m.text + (flip.current ? '​' : '');
    const [set, key] = m.assertive ? [setAssertive, 'a'] : [setPolite, 'p'];
    set(text);
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => set(''), 6000);
  }), []);
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div data-modal-host data-persistent>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-live="polite">{polite}</div>
      <div className="sr-only" role="alert" aria-live="assertive" aria-atomic="true" data-live="assertive">{assertive}</div>
    </div>,
    document.body
  );
}

/** const say = useAnnounce(); say('Installed Endurance solar kit.'); say('Battery critical', {assertive: true}) */
export function useAnnounce() { return useCallback((text, opts) => announce(text, opts), []); }
