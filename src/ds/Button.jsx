import {forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {motion} from 'motion/react';
import {Icon} from './Icon.jsx';
import {announce} from './announce.js';
import {spring} from '../motion/presets.js';
import {useReducedMotion} from '../motion/MotionProvider.jsx';
import s from './Button.module.css';

/** Sets a flag for `ms` milliseconds (the 600 ms success check, "Press again" window, ...). */
export function useTransientFlag(ms = 600) {
  const [on, setOn] = useState(false);
  const timer = useRef(0);
  const trigger = useCallback(() => { setOn(true); clearTimeout(timer.current); timer.current = setTimeout(() => setOn(false), ms); }, [ms]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [on, trigger];
}

const ARM_MS = 3000;

/**
 * <Button variant="primary|secondary|ghost|danger|commit" size="sm|md|lg" icon="play" iconOnly label="Play" loading success
 *         disabled disabledReason="Fix 2 failed checks to launch" onClick holdMs onConfirm />
 *
 * - Press: scale .97 spring (stiffness 700, damping 30). Hover lift only for fine pointers (Motion ignores touch hover).
 * - Disabled uses aria-disabled and stays focusable; `disabledReason` is shown as a tooltip and read as the description.
 * - Loading: spinner replaces the icon, the width is locked, aria-busy is set and clicks are ignored.
 * - Commit (hold to confirm): hold the pointer, or Space/Enter, for `holdMs` (700) to call `onConfirm`. A short tap or key
 *   press arms it ("Press again to confirm" for 3 s); a second activation confirms. `onClick` is not used by commit.
 */
export const Button = forwardRef(function Button({
  variant = 'secondary', size = 'md', icon, iconEnd, iconOnly = false, label, loading = false, success = false,
  disabled = false, disabledReason, holdMs = 700, onConfirm, confirmLabel = 'Press again to confirm', holdLabel,
  onClick, children, type = 'button', className = '', style, ...rest
}, ref) {
  const reduced = useReducedMotion();
  const reasonId = useId();
  const commit = variant === 'commit';
  const blocked = disabled || loading;
  const [holding, setHolding] = useState(false);
  const [armed, setArmed] = useState(false);
  const holdTimer = useRef(0), armTimer = useRef(0), completed = useRef(false), active = useRef(false);
  const own = useRef(null);
  const [lockWidth, setLockWidth] = useState(null);

  const setRefs = node => { own.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; };
  useLayoutEffect(() => { if (loading && own.current) setLockWidth(own.current.offsetWidth); else setLockWidth(null); }, [loading]);
  useEffect(() => () => { clearTimeout(holdTimer.current); clearTimeout(armTimer.current); }, []);
  useEffect(() => { if (blocked) { clearTimeout(holdTimer.current); setHolding(false); setArmed(false); active.current = false; } }, [blocked]);

  const confirmNow = () => { clearTimeout(armTimer.current); setArmed(false); onConfirm?.(); };
  const begin = () => {
    if (blocked || active.current) return;
    active.current = true; completed.current = false; setHolding(true);
    holdTimer.current = setTimeout(() => { completed.current = true; setHolding(false); confirmNow(); }, holdMs);
  };
  const cancel = () => { clearTimeout(holdTimer.current); active.current = false; setHolding(false); };
  const release = () => { // pointer up / key up: a completed hold already confirmed; an early release is a tap
    if (!active.current) return;
    const done = completed.current; cancel(); completed.current = false;
    if (done) return;
    if (armed) confirmNow();
    else { setArmed(true); announce(confirmLabel); clearTimeout(armTimer.current); armTimer.current = setTimeout(() => setArmed(false), ARM_MS); }
  };

  const commitProps = commit ? {
    onPointerDown: e => { if (e.button === 0 || e.pointerType === 'touch') begin(); },
    onPointerUp: release, onPointerLeave: cancel, onPointerCancel: cancel, onBlur: cancel,
    onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) begin(); } },
    onKeyUp: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); release(); } },
    onClick: e => e.preventDefault(),
    onContextMenu: e => e.preventDefault()
  } : {
    onClick: e => { if (blocked) { e.preventDefault(); return; } onClick?.(e); }
  };

  const text = commit && armed ? confirmLabel : commit && holding && reduced ? (holdLabel || 'Keep holding') : children;
  const lead = loading ? <span className={s.spinner} aria-hidden="true" data-spinner /> : success ? <motion.span className={s.check} initial={{scale: 0.4}} animate={{scale: 1}} transition={spring.snap} data-success><Icon name="check" size={size === 'sm' ? 16 : 18} /></motion.span> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null;
  if (iconOnly && !label && import.meta.env?.DEV) console.warn('Button iconOnly needs a `label` (aria-label).');

  return (
    <motion.button
      ref={setRefs} type={type}
      className={`${s.button} ${s[variant]} ${s[size]} ${iconOnly ? s.iconOnly : ''} ${className}`}
      style={lockWidth ? {...style, minWidth: lockWidth} : style}
      aria-disabled={blocked || undefined} aria-busy={loading || undefined}
      aria-label={iconOnly ? label : undefined} title={iconOnly && !disabledReason ? label : undefined}
      aria-describedby={disabled && disabledReason ? reasonId : undefined}
      data-variant={variant} data-armed={armed || undefined} data-holding={holding || undefined} data-loading={loading || undefined}
      whileTap={blocked || commit ? undefined : {scale: 0.97}} whileHover={blocked || reduced ? undefined : {y: -1}}
      transition={reduced ? {duration: 0.12} : spring.press}
      {...commitProps} {...rest}
    >
      {commit && !reduced ? <motion.span className={s.fill} aria-hidden="true" initial={false} animate={{scaleX: holding ? 1 : 0}} transition={holding ? {duration: holdMs / 1000, ease: 'linear'} : {duration: 0.12}} /> : null}
      {lead}
      {iconOnly ? null : <span className={s.label}>{text}</span>}
      {!iconOnly && iconEnd && !loading ? <Icon name={iconEnd} size={size === 'sm' ? 16 : 18} /> : null}
      {disabled && disabledReason ? <span id={reasonId} aria-hidden="true" className={s.tip}>{disabledReason}</span> : null}
    </motion.button>
  );
});
