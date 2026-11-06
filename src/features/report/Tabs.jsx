import {useId, useRef} from 'react';
import {motion} from 'motion/react';
import {Icon, spring, useReducedMotion} from '@/ds/index.js';
import s from './report.module.css';

/**
 * Accessible tabs (tablist / tab / tabpanel). Arrow keys, Home and End move and select; Tab leaves the list.
 * A sliding underline (shared layoutId) follows the selection and becomes instant under reduced motion.
 * `tabs`: [{id, label, icon?}]. Render each panel with <TabPanel id=... active=...>.
 */
export function Tabs({tabs, value, onChange, label, idPrefix = 'tab'}) {
  const reduced = useReducedMotion();
  const gid = useId();
  const refs = useRef([]);
  const at = Math.max(0, tabs.findIndex(x => x.id === value));
  const go = i => { const n = (i + tabs.length) % tabs.length; refs.current[n]?.focus(); onChange(tabs[n].id); };
  const onKey = (e, i) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(tabs.length - 1); }
  };
  return (
    <div role="tablist" aria-label={label} className={s.tabs}>
      {tabs.map((tab, i) => {
        const on = i === at;
        return (
          <button key={tab.id} ref={el => { refs.current[i] = el; }} type="button" role="tab" id={`${idPrefix}-${tab.id}`} aria-selected={on} aria-controls={`${idPrefix}-panel-${tab.id}`} tabIndex={on ? 0 : -1}
            className={s.tab} onClick={() => onChange(tab.id)} onKeyDown={e => onKey(e, i)}>
            {tab.icon ? <Icon name={tab.icon} size={16} /> : null}
            <span>{tab.label}</span>
            {on ? <motion.span layoutId={`${gid}-ul`} className={s.tabLine} transition={reduced ? {duration: 0.12} : spring.snappy} aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({id, active, idPrefix = 'tab', children}) {
  if (!active) return null;
  return <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-${id}`} tabIndex={-1} className={s.panelBody}>{children}</div>;
}
