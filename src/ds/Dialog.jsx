import {useId, useRef} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence, motion} from 'motion/react';
import {Button} from './Button.jsx';
import {useModal} from './useModal.js';
import {variants, variantsFor} from '../motion/presets.js';
import {useReducedMotion} from '../motion/MotionProvider.jsx';
import s from './Dialog.module.css';

/**
 * Modal dialog. Portal + inert background + focus trap + Escape + return focus are handled once in useModal.
 * <Dialog open onClose title description footer size="sm|md|lg" dismissible alert>children</Dialog>
 * Enter: scale .96 to 1 + fade 200 ms; the scrim fades. `alert` uses role="alertdialog" for destructive confirmations.
 * Mark the element that should receive focus first with data-autofocus.
 */
export function Dialog({open, onClose, title, description, footer, size = 'md', dismissible = true, alert = false, closeLabel = 'Close', children, className = ''}) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const id = useId();
  useModal({open, ref, onClose, dismissible});
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div data-modal-host>
      <AnimatePresence>
        {open ? (
          <div key="dialog" className={s.layer}>
            <motion.div className={s.scrim} {...variantsFor(variants.scrim, reduced)} onClick={dismissible ? onClose : undefined} aria-hidden="true" />
            <motion.section ref={ref} role={alert ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={`${id}-t`} aria-describedby={description ? `${id}-d` : undefined}
              className={`${s.dialog} ${s[size]} ${className}`} {...variantsFor(variants.scaleIn, reduced)}>
              <header className={s.header}>
                <h2 id={`${id}-t`} className={s.title}>{title}</h2>
                {dismissible ? <Button variant="ghost" size="sm" iconOnly icon="close" label={closeLabel} onClick={onClose} /> : null}
              </header>
              {description ? <p id={`${id}-d`} className={s.description}>{description}</p> : null}
              <div className={s.body}>{children}</div>
              {footer ? <footer className={s.footer}>{footer}</footer> : null}
            </motion.section>
          </div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body
  );
}
