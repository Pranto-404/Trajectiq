import {useGame} from '@/store/index.js';
import {Button, Icon} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {Rise} from '../report/Rise.jsx';
import s from './sheets.module.css';

const STEPS = [
  ['1 · Build in the hangar', 'Choose a module for each subsystem, or drag one onto the 3D view. Adjust fuel and orbit and watch the margins move before you commit.', 'bus'],
  ['2 · Accept your trade-offs', 'Open the pre-launch check. Hard failures block launch. Warnings are allowed, but their consequences will appear during flight.', 'check'],
  ['3 · Operate the mission', 'Map in sunlight or shadow, conserve energy, or return data first. Pause or step the clock. Next event runs until a decision or the end.', 'play'],
  ['4 · Respond, then redesign', 'Crises pause automatically. Pick a response, read the causal report and replay with a changed spacecraft. Only returned science counts.', 'orbit']
];

/** How to play: four steps, the 3D and keyboard controls, and shortcuts to the learning tools. */
export function HelpSheet() {
  const t = useT();
  const act = useGame.getState().actions;
  return (
    <div className={s.sheet}>
      <ol className={s.steps}>
        {STEPS.map(([title, body, icon], i) => (
          <li key={title}><Rise i={i} className={s.fact}><h3><Icon name={icon} size={18} /> {t(title)}</h3><p>{t(body)}</p></Rise></li>
        ))}
      </ol>
      <section aria-label={t('Controls')} className={s.fact}>
        <h3>{t('Controls')}</h3>
        <ul className={s.plain}>
          <li>{t('3D view: drag sideways to rotate, arrow keys rotate, + / − zoom, R resets the camera.')}</li>
          <li>{t('Touch: drag sideways to rotate; swipe vertically to scroll the page.')}</li>
          <li>{t('Every part can also be installed with Enter or a click; dragging is never required.')}</li>
          <li>{t('Hold the launch button (or press and hold Space) to authorize; a quick tap asks you to confirm.')}</li>
          <li>{t('Escape closes a panel and returns you to where you were.')}</li>
        </ul>
        <p className={s.muted}>{t('The scene is a schematic, not a flight trajectory to scale.')}</p>
      </section>
      <div className={s.row}>
        <Button variant="secondary" size="sm" icon="assistant" onClick={() => act.mentor()}>{t('Ask the assistant')}</Button>
        <Button variant="secondary" size="sm" icon="help" onClick={() => act['learn-index']()}>{t('Concept cards')}</Button>
        <Button variant="secondary" size="sm" icon="check" onClick={() => act.quiz()}>{t('Learning check')}</Button>
      </div>
    </div>
  );
}
