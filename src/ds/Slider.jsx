import {useId} from 'react';
import s from './Slider.module.css';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Range slider with a numeric field. `onChange(value)` fires continuously while dragging (drive the ghost preview from
 * it), `onCommit(value)` once when the drag, key press or edit ends. Native input, so keyboard, touch and screen readers
 * work. `markers: [{at, label}]` draw threshold ticks. The thumb is 44 px on coarse pointers.
 */
export function Slider({label, value, min = 0, max = 100, step = 1, unit = '', onChange, onCommit, markers = [], disabled = false, disabledReason, showField = true, help, className = '', id: idProp}) {
  const auto = useId(); const id = idProp || auto;
  const pct = max === min ? 0 : (clamp(value, min, max) - min) / (max - min) * 100;
  const set = v => { const n = Number(v); if (Number.isFinite(n)) onChange?.(clamp(n, min, max)); };
  const commit = e => onCommit?.(Number(e.currentTarget.value));
  return (
    <div className={`${s.slider} ${className}`} data-disabled={disabled || undefined}>
      <div className={s.head}>
        <label htmlFor={id} className={s.label}>{label}</label>{help}
        {showField ? (
          <span className={s.field}>
            <input className={s.number} type="number" inputMode="decimal" aria-label={`${label} value`} min={min} max={max} step={step} value={Number.isFinite(value) ? value : ''} disabled={disabled}
              onChange={e => set(e.target.value)} onBlur={commit} onKeyUp={e => { if (e.key === 'Enter') commit(e); }} />
            {unit ? <span className={s.unit}>{unit}</span> : null}
          </span>
        ) : null}
      </div>
      <div className={s.rail} style={{'--pct': `${pct}%`}}>
        <input id={id} className={s.range} type="range" min={min} max={max} step={step} value={clamp(value, min, max)} disabled={disabled} aria-valuetext={`${value}${unit ? ` ${unit}` : ''}`}
          aria-describedby={disabled && disabledReason ? `${id}-why` : undefined}
          onChange={e => set(e.target.value)} onPointerUp={commit} onKeyUp={e => { if (e.key.startsWith('Arrow') || e.key.startsWith('Page') || e.key === 'Home' || e.key === 'End') commit(e); }} onBlur={commit} />
        {markers.map((m, i) => <i key={i} className={s.marker} style={{left: `${(clamp(m.at, min, max) - min) / ((max - min) || 1) * 100}%`}} data-marker={m.label} />)}
      </div>
      <div className={s.scale} aria-hidden="true"><span>{min}{unit ? ` ${unit}` : ''}</span><span>{max}{unit ? ` ${unit}` : ''}</span></div>
      {disabled && disabledReason ? <p id={`${id}-why`} className={s.why}>{disabledReason}</p> : null}
    </div>
  );
}
