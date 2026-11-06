import {useEffect, useId, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {categoryName} from '@engine/crew.js';
import {Button, Icon, spring, stagger, useReducedMotion, variants, variantsFor} from '@/ds/index.js';
import {useGame, selectCrew} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {ROLES} from './crewModel.js';
import {RoleBadge} from './RoleBadge.jsx';
import s from './crew.module.css';

/** Brief banner after the controls change hands: a baton marker slides to the new player and the banner names them. */
function useHandoff(active) {
  const prev = useRef(active);
  const [shown, setShown] = useState(null);
  useEffect(() => {
    if (prev.current === active) return undefined;
    prev.current = active; setShown(active);
    const id = setTimeout(() => setShown(null), 2200);
    return () => clearTimeout(id);
  }, [active]);
  return shown;
}

/**
 * Crew strip: every player with their roles and subsystems, who has the controls, "Pass the controls" with a hand-off animation
 * (shared-element baton between players), and the pending suggestions with Accept / Decline for the owner. Names are rendered
 * as text only. Renders nothing outside crew mode.
 */
export function CrewStrip() {
  const t = useT();
  const reduced = useReducedMotion();
  const gid = useId();
  const crew = useGame(selectCrew);
  const actions = useGame(st => st.actions);
  const activeIdx = useGame(st => st.team.active);
  const handed = useHandoff(activeIdx);
  if (!crew.crew) return null;
  const active = crew.active;
  const mine = active.roles.map(r => ROLES[r].label).join(' + ');
  const incoming = handed != null ? crew.players[handed] : null;
  return (
    <section className={s.strip} aria-label={t('Crew table')} data-testid="crew-strip">
      <div className={s.stripTop}>
        <div className={s.stripText}>
          <span className="kicker">{t('Crew mode · shared decisions')}</span>
          <p><strong>{active.name}</strong> {t('has the controls as')} <strong>{mine}</strong>. {t('Change only what your role owns; use a part’s button to suggest a change to its owner.')}</p>
        </div>
        <Button variant="primary" size="sm" icon="arrow-right" onClick={() => actions['crew-pass']()}>{t('Pass the controls')}</Button>
      </div>
      <ul className={s.players} aria-label={t('Players')}>
        {crew.players.map((p, i) => {
          const on = i === activeIdx;
          return (
            <li key={i} className={s.player} aria-current={on ? 'true' : undefined} data-active={on || undefined}>
              {on ? <motion.span layoutId={`${gid}-baton`} className={s.baton} transition={reduced ? {duration: 0.12} : spring.snap} aria-hidden="true" /> : null}
              <span className={s.playerBody}>
                <strong>{p.name}{on ? <span className="sr-only"> ({t('has the controls')})</span> : null}</strong>
                <span className={s.playerRoles}>{p.roles.map(r => <RoleBadge key={r} role={r} />)}</span>
                <small>{p.roles.flatMap(r => ROLES[r].owns).map(k => categoryName(k)).join(' · ')}</small>
              </span>
            </li>
          );
        })}
      </ul>
      <AnimatePresence>
        {incoming ? (
          <motion.div key={handed} className={s.handoff} role="status" {...variantsFor({initial: {opacity: 0, y: -10, scale: 0.94}, animate: {opacity: 1, y: 0, scale: 1, transition: spring.snap}, exit: {opacity: 0, y: -6, transition: {duration: 0.14}}}, reduced)}>
            <Icon name="arrow-right" size={16} /> {t('{name} has the controls as {roles}.', {name: incoming.name, roles: incoming.roles.map(r => ROLES[r].short).join(' + ')})}
          </motion.div>
        ) : null}
      </AnimatePresence>
      {crew.pendingSuggestions.length ? (
        <div className={s.suggestions}>
          <span className="kicker">{t('Proposals')} ({crew.pendingSuggestions.length})</span>
          <ul className={s.suggestionList}>
            <AnimatePresence initial={false}>
              {crew.pendingSuggestions.map((sg, i) => {
                const can = active.roles.includes(sg.owner);
                return (
                  <motion.li key={sg.id} className={s.suggestion} layout={reduced ? false : 'position'} {...variantsFor(variants.fadeUp, reduced)} transition={{delay: stagger(i, reduced)}}>
                    <span><strong>{sg.fromName}</strong> {t('suggests')} <b>{sg.label}</b> <small>{t('for')} {ROLES[sg.owner]?.label || sg.owner}</small></span>
                    {can ? (
                      <span className={s.suggestionBtns}>
                        <Button size="sm" variant="primary" icon="check" onClick={() => actions['suggest-accept']({id: sg.id})}>{t('Accept')}</Button>
                        <Button size="sm" variant="ghost" onClick={() => actions['suggest-decline']({id: sg.id})}>{t('Decline')}</Button>
                      </span>
                    ) : <small className={s.waiting}>{t('Waiting for the owner')}</small>}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      ) : null}
    </section>
  );
}
