import {useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence, motion} from 'motion/react';
import {Button} from './Button.jsx';
import {useModal} from './useModal.js';
import {variants, variantsFor, spring} from '../motion/presets.js';
import {useReducedMotion} from '../motion/MotionProvider.jsx';
import s from './Sheet.module.css';

function useNarrow(query = '(max-width: 760px)') {
  const [narrow, setNarrow] = useState(() => !!globalThis.matchMedia?.(query)?.matches);
  useEffect(() => {
    const mq = globalThis.matchMedia?.(query); if (!mq) return undefined;
    const on = () => setNarrow(mq.matches);
    mq.addEventListener?.('change', on); return () => mq.removeEventListener?.('change', on);
  }, [query]);
  return narrow;
}

/**
 * Side drawer (420 px) on desktop, bottom sheet with drag-to-dismiss on narrow screens.
 * <Sheet open onClose title placement="auto|side|bottom" size>children</Sheet>
 * Slide 420 ms soft spring + scrim fade. Drag the handle down 120 px (or flick) to dismiss; keyboard users get Escape
 * and the close button. Same focus trap, inert background and return focus as Dialog.
 */
export function Sheet({open, onClose, title, placement = 'auto', footer, dismissible = true, closeLabel = 'Close', children, className = ''}) {
  const reduced = useReducedMotion();
  const narrow = useNarrow();
  const bottom = placement === 'bottom' || (placement === 'auto' && narrow);
  const ref = useRef(null);
  const id = useId();
  useModal({open, ref, onClose, dismissible});
  if (typeof document === 'undefined') return null;
  const chat = placement === 'chat';
  const v = variantsFor(bottom || chat ? variants.bottomSheet : variants.sideSheet, reduced);
  const drag = bottom && !reduced && dismissible ? {drag: 'y', dragConstraints: {top: 0, bottom: 0}, dragElastic: {top: 0, bottom: 0.6}, dragSnapToOrigin: true, dragTransition: spring.soft, onDragEnd: (_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose?.(); }} : {};
  return createPortal(
    <div data-modal-host>
      <AnimatePresence>
        {open ? (
          <div key="sheet" className={s.layer}>
            <motion.div className={s.scrim} {...variantsFor(variants.scrim, reduced)} onClick={dismissible ? onClose : undefined} aria-hidden="true" />
            <motion.aside ref={ref} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} className={`${s.sheet} ${chat ? s.chat : bottom ? s.bottom : s.side} ${className}`} data-placement={chat ? 'chat' : bottom ? 'bottom' : 'side'} {...v} {...drag}>
              {bottom ? <span className={s.handle} aria-hidden="true" /> : null}
              <header className={s.header}>
                <h2 id={`${id}-t`} className={s.title}>{title}</h2>
                {dismissible ? <Button variant="ghost" size="sm" iconOnly icon="close" label={closeLabel} onClick={onClose} /> : null}
              </header>
              <div className={s.body}>{children}</div>
              {footer ? <footer className={s.footer}>{footer}</footer> : null}
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body
  );
}
