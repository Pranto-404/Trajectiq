import {useId, useRef} from 'react';
import {motion} from 'motion/react';
import {Icon} from './Icon.jsx';
import {spring} from '../motion/presets.js';
import {useReducedMotion} from '../motion/MotionProvider.jsx';
import s from './Segmented.module.css';

/**
 * Segmented control (operations commands, speed 1x/3x/10x, solo/crew/sandbox).
 * radiogroup semantics with a roving tabindex: arrow keys move and select, Home/End jump, Tab leaves the group.
 * The selection pill slides between options with a shared layoutId (instant when motion is reduced).
 * options: [{value, label, icon?, disabled?, hint?}]
 */
export function Segmented({options, value, onChange, label, size = 'md', fullWidth = false, className = ''}) {
  const gid = useId();
  const reduced = useReducedMotion();
  const refs = useRef([]);
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter(i => i >= 0);
  const current = options.findIndex(o => o.value === value);
  const tabStop = current >= 0 && !options[current].disabled ? current : enabled[0];
  const move = (from, dir) => {
    const at = enabled.indexOf(from); if (at < 0) return;
    const next = enabled[(at + dir + enabled.length) % enabled.length];
    refs.current[next]?.focus(); onChange?.(options[next].value);
  };
  const onKeyDown = (e, i) => {
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) { e.preventDefault(); move(i, 1); }
    else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) { e.preventDefault(); move(i, -1); }
    else if (e.key === 'Home') { e.preventDefault(); refs.current[enabled[0]]?.focus(); onChange?.(options[enabled[0]].value); }
    else if (e.key === 'End') { e.preventDefault(); const l = enabled.at(-1); refs.current[l]?.focus(); onChange?.(options[l].value); }
  };
  return (
    <div role="radiogroup" aria-label={label} className={`${s.group} ${s[size]} ${fullWidth ? s.full : ''} ${className}`}>
      {options.map((o, i) => {
        const on = i === current;
        return (
          <button key={String(o.value)} ref={el => { refs.current[i] = el; }} type="button" role="radio" aria-checked={on} tabIndex={i === tabStop ? 0 : -1}
            aria-disabled={o.disabled || undefined} title={o.hint} className={`${s.option} ${on ? s.on : ''}`} data-value={String(o.value)}
            onClick={() => { if (!o.disabled && !on) onChange?.(o.value); }} onKeyDown={e => onKeyDown(e, i)}>
            {on ? <motion.span layoutId={`${gid}-pill`} className={s.pill} transition={reduced ? {duration: 0.12} : spring.snappy} aria-hidden="true" /> : null}
            {o.icon ? <Icon name={o.icon} size={16} className={s.icon} /> : null}
            <span className={s.text}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
