import {useEffect, useImperativeHandle, useRef, useState} from 'react';
import {CATEGORIES, CATALOG} from '@data/catalog.js';
import {Chip} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import s from './hangar.module.css';

/** Kinds whose installed part id changed since the previous render, held for `ms` so the seat flash can play once. */
function useChangedKinds(design, ms = 700) {
  const prev = useRef(design);
  const [changed, setChanged] = useState([]);
  useEffect(() => {
    const kinds = CATEGORIES.map(c => c[0]).filter(k => prev.current[k] !== design[k]);
    prev.current = design;
    if (!kinds.length) return undefined;
    setChanged(kinds);
    const id = setTimeout(() => setChanged([]), ms);
    return () => clearTimeout(id);
  }, [design, ms]);
  return changed;
}

const partName = (design, kind) => CATALOG[kind]?.find(p => p.id === design[kind])?.name || design[kind];

/**
 * The built-in 2D stage: a schematic spacecraft with one focusable hotspot per subsystem. It is the fallback when the 3D stage
 * is not present or cannot run (no WebGL2), and it keeps the same props contract as <Stage3D> (design, selected, hoverPart,
 * onPick) so selection and hover flow through props either way. Below the drawing, one toggle chip per subsystem is the
 * keyboard and touch path to the same selection.
 */
export function SchematicStage({design, selected, hoverPart, onPick, onSocketHover, ref, compact = false}) {
  const t = useT();
  const changed = useChangedKinds(design);
  useImperativeHandle(ref, () => ({seatPart() {}, cameraTo() {}, launchSequence() {}}), []);
  const wing = 100 + 36 * Math.min(Number(design.arrayScale) || 1, 4);
  const hot = kind => `${s.spot} ${selected === kind ? s.spotOn : ''} ${hoverPart?.kind === kind ? s.spotGhost : ''}`;
  const props = kind => ({
    className: hot(kind), role: 'button', tabIndex: 0, 'aria-pressed': selected === kind, 'data-kind': kind,
    'aria-label': t(CATEGORIES.find(c => c[0] === kind)?.[1] || kind), title: partName(design, kind),
    onClick: () => onPick?.(kind),
    onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick?.(kind); } },
    onPointerEnter: () => onSocketHover?.(kind), onPointerLeave: () => onSocketHover?.(null)
  });
  const cx = 320;
  return (
    <div className={s.schematic} data-compact={compact || undefined}>
      <svg viewBox="0 0 640 340" role="group" aria-label={t('Spacecraft schematic. Select a subsystem.')} className={s.schematicSvg}>
        <defs>
          <pattern id="tq-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" className={s.bgGrid} /></pattern>
        </defs>
        <rect width="640" height="340" fill="url(#tq-grid)" opacity=".6" />
        {/* power wings */}
        <g {...props('power')}>
          <line x1={cx - 60} y1="196" x2={cx - 60 - 20} y2="196" className={s.arm} /><line x1={cx + 60} y1="196" x2={cx + 80} y2="196" className={s.arm} />
          <rect x={cx - 80 - wing} y="162" width={wing} height="68" rx="4" className={s.part} />
          <rect x={cx + 80} y="162" width={wing} height="68" rx="4" className={s.part} />
          {Array.from({length: 5}, (_, i) => <line key={i} x1={cx - 80 - wing + (i + 1) * wing / 6} y1="162" x2={cx - 80 - wing + (i + 1) * wing / 6} y2="230" className={s.cell} />)}
          {Array.from({length: 5}, (_, i) => <line key={`r${i}`} x1={cx + 80 + (i + 1) * wing / 6} y1="162" x2={cx + 80 + (i + 1) * wing / 6} y2="230" className={s.cell} />)}
          {changed.includes('power') ? <rect className={s.seat} x={cx - 80 - wing} y="162" width={wing * 2 + 160} height="68" rx="6" /> : null}
          <text x={cx - 80 - wing / 2} y="250" className={s.tag} textAnchor="middle">{t('Power')}</text>
        </g>
        {/* propulsion */}
        <g {...props('propulsion')}>
          <path d={`M${cx - 22} 262 L${cx + 22} 262 L${cx + 36} 300 L${cx - 36} 300 Z`} className={s.part} />
          <line x1={cx} y1="262" x2={cx} y2="300" className={s.cell} />
          {changed.includes('propulsion') ? <path className={s.seat} d={`M${cx - 22} 262 L${cx + 22} 262 L${cx + 36} 300 L${cx - 36} 300 Z`} /> : null}
          <text x={cx + 50} y="290" className={s.tag}>{t('Propulsion')}</text>
        </g>
        {/* launch adapter */}
        <g {...props('launch')}>
          <rect x={cx - 52} y="304" width="104" height="12" rx="3" className={s.part} />
          <rect x={cx - 70} y="316" width="140" height="10" rx="3" className={s.part} />
          {changed.includes('launch') ? <rect className={s.seat} x={cx - 70} y="304" width="140" height="22" rx="4" /> : null}
          <text x={cx + 82} y="324" className={s.tag}>{t('Launch')}</text>
        </g>
        {/* bus with recorder inside */}
        <g {...props('bus')}>
          <rect x={cx - 60} y="140" width="120" height="122" rx="10" className={s.part} />
          {changed.includes('bus') ? <rect className={s.seat} x={cx - 60} y="140" width="120" height="122" rx="10" /> : null}
          <text x={cx - 52} y="158" className={s.tag}>{t('Bus')}</text>
        </g>
        <g {...props('storage')}>
          <rect x={cx - 36} y="206" width="72" height="34" rx="5" className={s.part} />
          <line x1={cx - 24} y1="218" x2={cx + 24} y2="218" className={s.cell} /><line x1={cx - 24} y1="228" x2={cx + 24} y2="228" className={s.cell} />
          {changed.includes('storage') ? <rect className={s.seat} x={cx - 36} y="206" width="72" height="34" rx="5" /> : null}
          <text x={cx} y="254" className={s.tag} textAnchor="middle">{t('Recorder')}</text>
        </g>
        {/* payload */}
        <g {...props('payload')}>
          <rect x={cx - 44} y="84" width="88" height="52" rx="8" className={s.part} />
          <circle cx={cx} cy="110" r="16" className={s.lens} /><circle cx={cx} cy="110" r="6" className={s.lensCore} />
          {changed.includes('payload') ? <rect className={s.seat} x={cx - 44} y="84" width="88" height="52" rx="8" /> : null}
          <text x={cx - 52} y="100" className={s.tag} textAnchor="end">{t('Payload')}</text>
        </g>
        {/* comms dish */}
        <g {...props('comms')}>
          <line x1={cx + 60} y1="150" x2={cx + 120} y2="92" className={s.arm} />
          <ellipse cx={cx + 132} cy="82" rx="38" ry="14" transform={`rotate(-35 ${cx + 132} 82)`} className={s.part} />
          {changed.includes('comms') ? <ellipse className={s.seat} cx={cx + 132} cy="82" rx="38" ry="14" transform={`rotate(-35 ${cx + 132} 82)`} /> : null}
          <text x={cx + 150} y="118" className={s.tag}>{t('Comms')}</text>
        </g>
      </svg>
      <div className={s.slotRow} role="group" aria-label={t('Subsystem slots')}>
        {CATEGORIES.map(([kind, title]) => (
          <Chip key={kind} selectable selected={selected === kind} icon={kind} size="sm" onClick={() => onPick?.(kind)} data-slot={kind}>
            <span className={s.slotText}>{t(title.split(' ')[0])}<span aria-hidden="true" className={s.slotPart}>{partName(design, kind)}</span></span>
          </Chip>
        ))}
      </div>
    </div>
  );
}
