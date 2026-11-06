import {AnimatePresence, motion} from 'motion/react';
import {Icon, Panel, useReducedMotion, variantsFor, variants} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import s from './flight.module.css';

const ICON = {warning: 'warning', decision: 'check', success: 'check', info: 'info'};

/** Newest first, last 30 events. Titles come from the engine and the player's own commands; rendered as text. */
export function EventLog({logs}) {
  const t = useT();
  const reduced = useReducedMotion();
  const items = logs.map((l, i) => ({l, key: `${i}-${l.minute}-${l.title}`})).slice(-30).reverse();
  return (
    <Panel kicker={t('Mission log')} title={t('Latest events')} className={s.fill}>
      <div className={s.scroll} tabIndex={0} aria-label={t('Mission log')} role="region">
        <ol className={s.logList}>
          <AnimatePresence initial={false}>
            {items.map(({l, key}) => (
              <motion.li key={key} className={s.logItem} data-type={l.type} layout={reduced ? false : 'position'} {...variantsFor(variants.fadeUp, reduced)}>
                <span className={s.logTime}>T+{Number(l.minute).toFixed(1)}</span>
                <span className={s.logTitle}><Icon name={ICON[l.type] || 'info'} size={12} /> {l.title}</span>
                {l.detail ? <span className={s.logDetail}>{l.detail}</span> : null}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </Panel>
  );
}
