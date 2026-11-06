import {useId} from 'react';
import {motion, useMotionValue, useSpring} from 'motion/react';
import {Icon, Chip, spring} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {criticalLabel} from './missionInfo.js';
import {enterProps} from './motionUtil.js';
import s from './board.module.css';

const TILT_DEG = 7;

/**
 * One scenario card (a card from the engine's listScenarios). A toggle button (aria-pressed) so keyboard and screen-reader
 * users get the same affordance as a mouse user. Tilt toward the pointer happens only with a fine pointer (mouse, trackpad)
 * and never under reduced motion. `assumed` marks a body whose data includes values with no NASA source ("game assumption").
 */
export function ScenarioCard({card, selected, index, reduced, tilt, locked, assumed, onSelect}) {
  const t = useT();
  const id = useId();
  const rx = useMotionValue(0), ry = useMotionValue(0);
  const sx = useSpring(rx, spring.soft), sy = useSpring(ry, spring.soft);
  const tiltOn = tilt && !reduced;
  const move = e => {
    if (!tiltOn || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect(); if (!r.width) return;
    ry.set((((e.clientX - r.left) / r.width) - 0.5) * 2 * TILT_DEG);
    rx.set(-(((e.clientY - r.top) / r.height) - 0.5) * 2 * TILT_DEG);
  };
  const rest = () => { rx.set(0); ry.set(0); };
  return (
    <motion.button
      type="button" className={s.card} aria-pressed={selected} aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`} data-scenario={card.id} data-selected={selected || undefined} data-locked={locked || undefined}
      {...enterProps(index, reduced)}
      style={tiltOn ? {rotateX: sx, rotateY: sy, transformPerspective: 900} : undefined}
      whileTap={reduced ? undefined : {scale: 0.985}}
      onPointerMove={move} onPointerLeave={rest} onBlur={rest}
      onClick={() => onSelect(card.id)}
    >
      <span className={s.cardTop}>
        <span className="kicker">{card.tag}</span>
        {selected ? <span className={s.cardCheck}><Icon name="check" size={14} /><span className="sr-only">{t('Selected')}</span></span> : null}
      </span>
      <span id={`${id}-t`} className={s.cardTitle} data-flip-source={selected || undefined}>{card.title}</span>
      <span id={`${id}-d`} className={s.cardSummary}>{card.summary}</span>
      <span className={s.cardMeta}>
        <Chip size="sm" kind="mode" icon={null}>{card.budget} cr</Chip>
        <Chip size="sm" kind="mode" icon={null}>{card.scienceNeeded} {t('units to return')}</Chip>
        <Chip size="sm" kind="mode" icon={null}>{card.durationMinutes} min</Chip>
      </span>
      <span className={s.cardMeta}>
        <Chip size="sm" kind="warn" icon="warning">{t('Critical')}: {t(criticalLabel(card.critical))}</Chip>
        {card.weather ? <Chip size="sm" kind="info" icon="eclipse">{card.weather.title}</Chip> : null}
        {card.simplification ? <Chip size="sm" kind="info" icon="info">{t('Simplified')}</Chip> : null}
        {assumed ? <Chip size="sm" kind="info" icon="info">{t('Game assumptions')}</Chip> : null}
      </span>
      {card.why ? <span className={s.cardWhy}>{card.why}</span> : null}
    </motion.button>
  );
}
