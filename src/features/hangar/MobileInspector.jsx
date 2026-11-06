import {useId, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {spring, useReducedMotion} from '@/ds/index.js';
import {useGame, selectAnalysis, selectCrew, selectMargins} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {MarginsPanel} from './MarginsPanel.jsx';
import {OrbitPanel} from './OrbitPanel.jsx';
import {DesignAdvisor} from './DesignAdvisor.jsx';
import {CrewStrip} from './CrewStrip.jsx';
import s from './hangar.module.css';

/**
 * Phone inspector. The four long panels (margins, orbit, advice + presets, crew) used to be stacked, which made the page four
 * screens tall. Here they share one slot behind a sliding-pill tab bar, so the page is the stage, this strip and one panel.
 * role="tablist" with a roving tabindex: arrow keys move, Home/End jump. The panel cross-fades with a short slide; under reduced
 * motion it swaps instantly.
 */
export function MobileInspector({presets}) {
  const t = useT();
  const reduced = useReducedMotion();
  const gid = useId();
  const crew = useGame(selectCrew), margins = useGame(selectMargins), model = useGame(selectAnalysis);
  const tabs = [
    {id: 'margins', label: t('Margins'), alert: margins.launchable ? 0 : 1},
    {id: 'orbit', label: t('Orbit')},
    {id: 'advice', label: t('Advice'), alert: model.checks.filter(c => c.status !== 'pass').length},
    ...(crew.crew ? [{id: 'crew', label: t('Crew'), alert: crew.pendingSuggestions.length}] : [])
  ];
  const [tab, setTab] = useState('margins');
  const current = tabs.some(x => x.id === tab) ? tab : 'margins';
  const refs = useRef({});
  const dir = useRef(1);
  const go = (id, focus) => {
    dir.current = tabs.findIndex(x => x.id === id) >= tabs.findIndex(x => x.id === current) ? 1 : -1;
    setTab(id);
    if (focus) refs.current[id]?.focus();
  };
  const onKey = (e, i) => {
    const n = tabs.length;
    const to = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i + n - 1) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (to >= 0) { e.preventDefault(); go(tabs[to].id, true); }
  };
  const x = reduced ? 0 : 18 * dir.current;
  return (
    <section className={s.inspector} aria-label={t('Design inspector')} data-testid="mobile-inspector">
      <div role="tablist" aria-label={t('Design inspector')} className={s.inspectorTabs}>
        {tabs.map((x2, i) => {
          const on = x2.id === current;
          return (
            <button key={x2.id} ref={el => { refs.current[x2.id] = el; }} type="button" role="tab" id={`${gid}-tab-${x2.id}`} aria-selected={on} aria-controls={`${gid}-panel`}
              tabIndex={on ? 0 : -1} className={s.inspectorTab} data-tab={x2.id} onClick={() => go(x2.id)} onKeyDown={e => onKey(e, i)}>
              {on ? <motion.span layoutId={`${gid}-pill`} className={s.inspectorPill} transition={reduced ? {duration: 0.1} : spring.snappy} aria-hidden="true" /> : null}
              <span className={s.inspectorLabel}>{x2.label}</span>
              {x2.alert ? <span className={s.inspectorDot} aria-label={`${x2.alert}`}>{x2.alert > 9 ? '9+' : x2.alert}</span> : null}
            </button>
          );
        })}
      </div>
      <div id={`${gid}-panel`} role="tabpanel" aria-labelledby={`${gid}-tab-${current}`} className={s.inspectorBody}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={current} className={s.inspectorPane} initial={{opacity: 0, x}} animate={{opacity: 1, x: 0}} exit={{opacity: 0, x: -x}} transition={reduced ? {duration: 0.01} : spring.soft}>
            {current === 'margins' ? <MarginsPanel compact /> : null}
            {current === 'orbit' ? <OrbitPanel compact /> : null}
            {current === 'advice' ? <><DesignAdvisor compact />{presets}</> : null}
            {current === 'crew' ? <CrewStrip /> : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
