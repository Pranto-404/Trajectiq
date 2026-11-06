import {useState} from 'react';
import {motion} from 'motion/react';
import {Button, Chip, spring, stagger, useReducedMotion} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {clean, finite, fmt} from './format.js';
import s from './report.module.css';

const W = 600, H = 320, L = 58, R = 548, T = 40, B = 258;

/** Plot geometry for the saved runs. Pure; exported for tests. */
export function plotGeometry(runs) {
  const ymax = Math.max(650, ...runs.map(r => finite(r.outcome?.science))) * 1.1;
  const xmax = Math.max(170, ...runs.map(r => finite(r.outcome?.cost))) * 1.05;
  const x = v => L + (v / xmax) * (R - L), y = v => B - (v / ymax) * (B - T);
  return {xmax, ymax, x, y};
}

/**
 * Returned science against mission cost. Non-dominated runs are diamonds on a step line, other runs are circles
 * (shape plus colour, never colour alone); bubble size is time in safe mode. Every point is focusable; Enter or a click
 * reviews the run. A readout under the plot repeats the numbers for the hovered or focused point.
 */
export function TradePlot({runs, frontier, onReview}) {
  const t = useT();
  const reduced = useReducedMotion();
  const [active, setActive] = useState(null);
  const g = plotGeometry(runs);
  const pts = runs.map((r, i) => ({run: r, i, cx: g.x(finite(r.outcome?.cost)), cy: g.y(finite(r.outcome?.science)), r: 7 + Math.min(12, finite(r.outcome?.safeMinutes) / 5), front: !!frontier[i]}));
  const line = pts.filter(p => p.front).sort((a, b) => a.cx - b.cx);
  const step = line.length > 1 ? line.map((p, k) => (k === 0 ? `M${p.cx.toFixed(1)} ${p.cy.toFixed(1)}` : `H${p.cx.toFixed(1)} V${p.cy.toFixed(1)}`)).join(' ') : '';
  const sel = active != null ? pts[active] : null;
  const ticks = Array.from({length: 6}, (_, i) => g.ymax * i / 5);
  return (
    <div className={s.plotWrap}>
      <svg className={s.plot} viewBox={`0 0 ${W} ${H}`} role="group" aria-label={t('Saved mission cost versus returned science units. Outcomes include operational choices.')}>
        <text x={L} y="22" className={s.axisText}>{t('RETURNED SCIENCE / UNITS')}</text>
        {ticks.map(v => <g key={v}><line x1={L} y1={g.y(v)} x2={R} y2={g.y(v)} className={s.grid} /><text x={L - 10} y={g.y(v) + 3} textAnchor="end" className={s.axisText}>{fmt(v)}</text></g>)}
        <line x1={L} y1={B} x2={R} y2={B} className={s.axis} />
        {[0, .25, .5, .75, .9].map(f => Math.round(g.xmax * f / 10) * 10).map(v => <text key={v} x={g.x(v)} y={B + 18} textAnchor="middle" className={s.axisText}>{v}</text>)}
        <text x={(L + R) / 2} y={H - 8} textAnchor="middle" className={s.axisText}>{t('MISSION COST / CREDITS')}</text>
        {step ? <path d={step} className={s.frontier} fill="none" aria-hidden="true" /> : null}
        {pts.map(p => {
          const label = `${clean(p.run.label, 12)}: ${fmt(p.run.outcome?.science, 1)} ${t('science units')}, ${fmt(p.run.outcome?.cost)} ${t('credits')}, ${fmt(p.run.outcome?.safeMinutes)} ${t('min safe mode')}${p.front ? `, ${t('non-dominated design')}` : ''}`;
          return (
            <motion.g key={p.run.id ?? p.i} role="button" tabIndex={0} aria-label={label} className={s.point} data-front={p.front || undefined} data-active={active === p.i || undefined}
              style={{transformBox: 'fill-box', transformOrigin: 'center'}} initial={reduced ? false : {scale: 0, opacity: 0}} animate={{scale: 1, opacity: 1}} transition={reduced ? {duration: 0} : {...spring.snap, delay: stagger(p.i, false)}}
              onMouseEnter={() => setActive(p.i)} onFocus={() => setActive(p.i)} onMouseLeave={() => setActive(a => (a === p.i ? null : a))}
              onClick={() => onReview?.(p.run)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onReview?.(p.run); } }}>
              {p.front ? <rect x={p.cx - p.r} y={p.cy - p.r} width={p.r * 2} height={p.r * 2} transform={`rotate(45 ${p.cx} ${p.cy})`} className={s.markFront} /> : <circle cx={p.cx} cy={p.cy} r={p.r} className={s.markOther} />}
              <text x={p.cx + p.r + 4} y={p.cy - p.r - 2} className={s.pointText}>{clean(p.run.label, 12)}</text>
            </motion.g>
          );
        })}
        {pts.length ? null : <text x={W / 2} y={H / 2 - 10} textAnchor="middle" className={s.axisText}>{t('Complete a mission to add a design.')}</text>}
      </svg>
      <div className={s.legend} aria-hidden="true"><span><i className={s.keyFront} /> {t('Non-dominated design')}</span><span><i className={s.keyOther} /> {t('Other designs')}</span></div>
      <div className={s.readout} aria-live="polite">
        {sel ? (
          <>
            <strong>{clean(sel.run.label, 12)}</strong>
            <span className="num">{fmt(sel.run.outcome?.science, 1)} {t('science units')} · {fmt(sel.run.outcome?.cost)} {t('credits')} · {fmt(sel.run.outcome?.safeMinutes)} {t('min safe mode')}</span>
            {sel.front ? <Chip kind="pass" size="sm">{t('Non-dominated')}</Chip> : null}
            {onReview ? <Button size="sm" variant="ghost" onClick={() => onReview(sel.run)}>{t('Review this run')}</Button> : null}
          </>
        ) : <span className={s.muted}>{t('Hover or focus a point to read its numbers. Enter reviews the run.')}</span>}
      </div>
    </div>
  );
}
