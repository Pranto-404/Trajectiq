import {useEffect, useId, useRef} from 'react';
import {motion, useMotionValue, useSpring, useTransform} from 'motion/react';
import {Chip} from './Chip.jsx';
import {announce} from './announce.js';
import {spring} from '../motion/presets.js';
import {useReducedMotion} from '../motion/MotionProvider.jsx';
import s from './Gauge.module.css';

const clamp01 = v => Math.min(1, Math.max(0, v));
const fmtNumber = (v, digits) => Number(v).toLocaleString('en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits});

/** Spring-driven number: the value glides (stiffness 120, damping 20, about 420 ms) and snaps when motion is reduced. */
export function useNeedle(value, reduced) {
  const source = useMotionValue(value);
  const sp = useSpring(source, spring.needle);
  const first = useRef(true);
  useEffect(() => {
    if (first.current || reduced) { source.jump(value); sp.jump(value); first.current = false; } else source.set(value);
  }, [value, reduced, source, sp]);
  return sp;
}

const STATUS = {warning: {kind: 'warn', text: 'Warning'}, critical: {kind: 'fail', text: 'Critical'}, locked: {kind: 'info', text: 'Locked', icon: 'lock'}};

function polar(cx, cy, r, deg) { const a = (deg - 180) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
function arcPath(from, to) {
  const [x1, y1] = polar(60, 60, 48, from * 180), [x2, y2] = polar(60, 60, 48, to * 180);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A48 48 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * <Gauge kind="linear|arc|segments|margin" label value max min unit digits thresholds preview status help />
 * - thresholds: [{at, label}] tick marks in value units (battery safe-mode 15 %, recorder warning 75 %).
 * - preview: a number. Draws a striped ghost segment between `value` and `preview` (hover/focus a part, drag a slider).
 * - status: nominal | warning (amber, 1.6 s slow pulse) | critical (red, 0.8 s pulse, announced) | locked.
 * - help: a node placed beside the label (usually <Concept/>).
 * Accessible as role="meter" with a spoken value text. Only transform and opacity animate.
 */
export function Gauge({kind = 'linear', label, value, max = 100, min = 0, unit = '', digits = 0, thresholds = [], preview = null, status = 'nominal', statusLabel, help, valueText, limit, segments = 10, className = '', ...rest}) {
  const reduced = useReducedMotion();
  const labelId = useId();
  const span = max - min || 1;
  const frac = clamp01((value - min) / span);
  const previewFrac = preview == null ? null : clamp01((preview - min) / span);
  const needle = useNeedle(value, reduced);
  const text = useTransform(needle, v => fmtNumber(v, digits));
  const scale = useTransform(needle, v => clamp01((v - min) / span));
  const angle = useTransform(needle, v => -90 + clamp01((v - min) / span) * 180);
  const spoken = valueText || `${fmtNumber(value, digits)}${unit ? ` ${unit}` : ''} of ${fmtNumber(max, digits)}${unit ? ` ${unit}` : ''}`;
  const margin = limit != null ? limit : max - value;

  const prev = useRef(status);
  useEffect(() => {
    if (prev.current !== 'critical' && status === 'critical') announce(`${label} critical: ${spoken}.`, {assertive: true});
    prev.current = status;
  }, [status, label, spoken]);

  const st = STATUS[status];
  const ghostUp = previewFrac != null && previewFrac > frac, ghostDown = previewFrac != null && previewFrac < frac;

  return (
    <div className={`${s.gauge} ${s[status]} ${s[kind]} ${className}`} data-kind={kind} data-status={status} {...rest}>
      <div className={s.head}>
        <span id={labelId} className={s.label}>{label}</span>{help}
        <span className={s.reading}>
          <motion.strong className={s.value} aria-hidden="true">{text}</motion.strong>
          {unit ? <span className={s.unit} aria-hidden="true">{unit}</span> : null}
        </span>
      </div>

      <div className={s.body} role="meter" aria-labelledby={labelId} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={spoken}>
        {kind === 'arc' ? (
          <svg className={s.dial} viewBox="0 0 120 70" aria-hidden="true" focusable="false">
            <path className={s.dialTrack} d={arcPath(0, 1)} />
            {thresholds.length ? thresholds.map((t, i) => <path key={i} className={s.dialZone} d={arcPath(clamp01((t.at - min) / span) - .004, clamp01((t.at - min) / span) + .004)} />) : null}
            {previewFrac != null ? <path className={s.dialGhost} d={arcPath(Math.min(frac, previewFrac), Math.max(frac, previewFrac))} /> : null}
            <motion.g style={{rotate: angle, transformOrigin: '60px 60px'}}><line className={s.needle} x1="60" y1="60" x2="60" y2="16" /><circle className={s.hub} cx="60" cy="60" r="4" /></motion.g>
          </svg>
        ) : kind === 'segments' ? (
          <div className={s.cells} aria-hidden="true">
            {Array.from({length: segments}, (_, i) => {
              const on = i < Math.ceil(frac * segments - 1e-9), ghost = previewFrac != null && (ghostUp ? i >= Math.ceil(frac * segments - 1e-9) && i < Math.ceil(previewFrac * segments - 1e-9) : i < Math.ceil(frac * segments - 1e-9) && i >= Math.ceil(previewFrac * segments - 1e-9));
              return <span key={i} className={`${s.cell} ${on ? s.on : ''} ${ghost ? (ghostUp ? s.ghostUp : s.ghostDown) : ''}`} data-on={on || undefined} data-ghost={ghost || undefined} />;
            })}
          </div>
        ) : (
          <div className={s.track} aria-hidden="true">
            {ghostUp ? <div className={s.ghost} style={{transform: `scaleX(${previewFrac})`}} data-ghost="up" /> : null}
            <motion.div className={s.fill} style={{scaleX: scale}} />
            {ghostDown ? <div className={s.cut} style={{clipPath: `inset(0 ${(1 - frac) * 100}% 0 ${previewFrac * 100}%)`}} data-ghost="down" /> : null}
            {thresholds.map((t, i) => <i key={i} className={s.tick} style={{left: `${clamp01((t.at - min) / span) * 100}%`}} data-tick={t.label || t.at} />)}
            {kind === 'margin' ? <i className={s.limit} data-limit /> : null}
          </div>
        )}
      </div>

      <div className={s.foot}>
        {kind === 'margin' ? <span className={s.note}>{fmtNumber(margin, digits)} {unit} {margin >= 0 ? 'margin' : 'over the limit'}</span> : thresholds.length ? <span className={s.note}>{thresholds.map(t => `${t.label || t.at}`).join(' · ')}</span> : <span />}
        {st ? <Chip kind={st.kind} icon={st.icon} size="sm">{statusLabel || st.text}</Chip> : null}
        {preview != null ? <span className={s.previewText}>Preview {fmtNumber(preview, digits)}{unit ? ` ${unit}` : ''}</span> : null}
      </div>
    </div>
  );
}
