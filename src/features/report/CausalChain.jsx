import {motion} from 'motion/react';
import {Chip, Icon, useReducedMotion, ease} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {clean, finite, fmt} from './format.js';
import {Rise} from './Rise.jsx';
import s from './report.module.css';

/** hardware -> limit -> event -> response -> result, as a wrapping list of nodes joined by arrows. Text only. */
export function Chain({items, label}) {
  const list = (Array.isArray(items) ? items : []).map(x => clean(x, 140));
  return (
    <ol className={s.chain} aria-label={label}>
      {list.map((node, i) => <li key={i} className={s.chainNode}>{node}</li>)}
    </ol>
  );
}

/** Causal cards: one per event in the run, with the chain, its impact and the response the player chose. */
export function CausalCards({items}) {
  const t = useT();
  if (!items.length) {
    return (
      <Rise className={s.card}>
        <h3>{t('Margins supported the campaign')}</h3>
        <Chain label={t('Causal chain')} items={[t('Compatible architecture'), t('Energy and contact capacity supported demand'), t('Observations returned before campaign ended')]} />
        <p className={s.muted}>{t('No crisis threshold was crossed. Try a lower-cost design to discover where the reserves matter.')}</p>
      </Rise>
    );
  }
  return (
    <div className={s.stack}>
      {items.map((e, i) => (
        <Rise key={`${e.id}-${i}`} i={i}>
          <article className={s.card} aria-labelledby={`cc-${i}`} data-testid="cause-card">
            <h3 id={`cc-${i}`}>{clean(e.title, 90)}</h3>
            <Chain label={t('Causal chain')} items={e.chain} />
            <p>{String(e.impact ?? '')}</p>
            {e.action ? <p className={s.response}><Icon name="arrow-right" size={14} /> <span className="kicker">{t('Your response')}</span> {clean(e.action, 120)}</p> : null}
          </article>
        </Rise>
      ))}
    </div>
  );
}

/**
 * Diagnosis: where the science went. The engine ranks the causes by science units at stake; bars are drawn relative
 * to the largest one. The primary cause is flagged. Fix text is advice from the engine, rendered as text.
 */
export function Diagnosis({causes, primary}) {
  const t = useT();
  const reduced = useReducedMotion();
  const list = (Array.isArray(causes) ? causes : []).slice(0, 5);
  if (!list.length) return null;
  const top = Math.max(...list.map(c => finite(c.units)), 1);
  return (
    <Rise className={s.card}>
      <header className={s.cardHead}><h3 id="diag-title">{t('Where the science went')}</h3><Chip kind="info" size="sm" icon="info">{t('Rule-based')}</Chip></header>
      <ol className={s.causes} aria-labelledby="diag-title">
        {list.map((c, i) => (
          <li key={`${c.id}-${i}`} className={s.cause} data-primary={primary?.id === c.id || undefined}>
            <div className={s.causeTop}>
              <strong>{primary?.id === c.id ? t('Main cause') : t('Contributing cause')}</strong>
              <span className="num">≈ {fmt(c.units)} {t('science units at stake')}</span>
            </div>
            <div className={s.bar} role="presentation"><motion.i style={{transformOrigin: 'left center'}} initial={reduced ? false : {scaleX: 0}} animate={{scaleX: Math.max(0.03, finite(c.units) / top)}} transition={reduced ? {duration: 0} : {delay: 0.15 + i * 0.1, duration: 0.42, ease: ease.enter}} /></div>
            <p>{String(c.what ?? '')}</p>
            <p className={s.muted}>{String(c.fix ?? '')}</p>
          </li>
        ))}
      </ol>
    </Rise>
  );
}

/** Rule-based redesign tips (text from the engine). */
export function Tips({tips}) {
  const t = useT();
  return (
    <ul className={s.tips} aria-label={t('Redesign recommendations')}>
      {(Array.isArray(tips) ? tips : []).map((tip, i) => <li key={i}><Icon name="arrow-up" size={14} /><span>{String(tip)}</span></li>)}
    </ul>
  );
}
