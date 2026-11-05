import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence, motion} from 'motion/react';
import {Icon} from './Icon.jsx';
import {variants, variantsFor} from '../motion/presets.js';
import {useReducedMotion} from '../motion/MotionProvider.jsx';
import s from './Toast.module.css';

const KIND_ICON = {info: 'info', success: 'check', warn: 'warning', error: 'warning'};

/**
 * One toast. Auto-dismisses after `duration` ms (4 s); the timer pauses while the pointer is over it or focus is inside.
 * Rises and fades in 240 ms. The viewport is the live region (role=status), so no extra announcement is needed.
 */
export function Toast({id, kind = 'info', children, duration = 4000, onDismiss, dismissLabel = 'Dismiss'}) {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const left = useRef(duration), started = useRef(0), timer = useRef(0);
  useEffect(() => {
    if (paused) return undefined;
    started.current = Date.now();
    timer.current = setTimeout(() => onDismiss?.(id), left.current);
    return () => { clearTimeout(timer.current); left.current = Math.max(400, left.current - (Date.now() - started.current)); };
  }, [paused, id, onDismiss]);
  return (
    <motion.li layout={reduced ? false : 'position'} className={`${s.toast} ${s[kind]}`} data-kind={kind} {...variantsFor(variants.toast, reduced)}
      onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <Icon name={KIND_ICON[kind] || 'info'} size={18} />
      <span className={s.text}>{children}</span>
      <button type="button" className={s.close} aria-label={dismissLabel} onClick={() => onDismiss?.(id)}><Icon name="close" size={16} /></button>
    </motion.li>
  );
}

/** Stack of at most 3 toasts. toasts: [{id, text, kind}]. Pass the store's `toasts` and `actions.dismissToast`. */
export function ToastViewport({toasts, onDismiss, dismissLabel}) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div data-modal-host data-persistent>
      <ul className={s.viewport} role="status" aria-live="polite" aria-relevant="additions" aria-label="Notifications">
        <AnimatePresence initial={false}>
          {toasts.slice(-3).map(t => <Toast key={t.id} id={t.id} kind={t.kind} onDismiss={onDismiss} dismissLabel={dismissLabel}>{t.text}</Toast>)}
        </AnimatePresence>
      </ul>
    </div>,
    document.body
  );
}
