import {useCallback, useId} from 'react';
import {Chip} from './Chip.jsx';
import {Icon} from './Icon.jsx';
import s from './PartCard.module.css';

const sign = v => (v > 0 ? '+' : v < 0 ? '−' : '±');
const num = v => Math.abs(v).toLocaleString('en-US', {maximumFractionDigits: 1});

/** Signed delta against the installed part. Lower mass, cost and load are good (green); higher are bad (amber). */
export function delta(part, installed, key) {
  if (!installed || installed.id === part.id) return 0;
  return Math.round((part[key] - installed[key]) * 10) / 10;
}

/**
 * Ghost-preview hook: spread `bind(id)` on any element (PartCard does it for you) and `onPreview(id | null)` fires on
 * pointer hover and keyboard focus, so the gauges can draw a ghost segment and the stage can ghost-place the part.
 * Wire it to the store: useGhostPreview(id => actions.previewPart(kind, id)).
 */
export function useGhostPreview(onPreview) {
  return useCallback(id => ({
    onPointerEnter: e => { if (e.pointerType !== 'touch') onPreview?.(id); },
    onPointerLeave: () => onPreview?.(null),
    onFocus: () => onPreview?.(id),
    onBlur: () => onPreview?.(null)
  }), [onPreview]);
}

/**
 * The module in the parts tray: name, note, three delta chips (mass, cost, power load) against the installed part,
 * installed state, drag handle. One button: Enter or Space installs; hover or focus previews.
 * part: {id, name, note, mass, cost, power}; installed: the currently installed part of the same category (or null).
 * state: 'default' | 'installed' | 'locked'. `kind` is used for the drag payload.
 */
export function PartCard({part, installed = null, state, kind, onInstall, onPreview, disabled = false, disabledReason, draggable = false, className = ''}) {
  const status = state || (installed?.id === part.id ? 'installed' : 'default');
  const why = useId();
  const bind = useGhostPreview(onPreview);
  const blocked = disabled || status === 'locked';
  const chips = [['mass', 'kg'], ['cost', 'cr'], ['power', 'W']];
  const base = installed || part;
  return (
    <article className={`${s.card} ${s[status]} ${className}`} data-part={part.id} data-state={status}>
      <button type="button" className={s.main} aria-pressed={status === 'installed'} aria-disabled={blocked || undefined} aria-describedby={blocked && disabledReason ? why : undefined}
        draggable={draggable && !blocked} onDragStart={draggable ? e => e.dataTransfer?.setData('application/x-trajectiq', JSON.stringify({kind, id: part.id})) : undefined}
        onClick={() => { if (!blocked) onInstall?.(part); }} {...bind(part.id)}>
        <span className={s.top}>
          <strong className={s.name}>{part.name}</strong>
          {status === 'installed' ? <Chip kind="pass" size="sm">Installed</Chip> : status === 'locked' ? <Chip kind="info" icon="lock" size="sm">Locked</Chip> : <span className={s.cta}>Install <Icon name="arrow-right" size={14} /></span>}
        </span>
        {part.note ? <span className={s.note}>{part.note}</span> : null}
        <span className={s.deltas}>
          {chips.map(([key, unit]) => {
            const d = delta(part, installed, key), showDelta = installed && status !== 'installed';
            const good = d < 0, bad = d > 0;
            return (
              <span key={key} className={s.delta} data-delta={key} data-trend={showDelta ? (good ? 'good' : bad ? 'bad' : 'flat') : 'base'}>
                <Icon name={!showDelta || d === 0 ? 'arrow-flat' : d > 0 ? 'arrow-up' : 'arrow-down'} size={12} />
                <span className="num">{showDelta ? `${sign(d)}${num(d)}` : num(base[key] === part[key] ? part[key] : part[key])} {unit}</span>
                <span className="sr-only">{key === 'power' ? 'power load' : key}{showDelta ? (d === 0 ? ', same as installed' : d > 0 ? ', higher' : ', lower') : ''}</span>
              </span>
            );
          })}
        </span>
      </button>
      {blocked && disabledReason ? <p id={why} className={s.why}>{disabledReason}</p> : null}
    </article>
  );
}
