import {useGame} from '@/store/index.js';
import {Button, Icon} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import s from './shell.module.css';

export function FirstVisitGuide() {
  const t = useT(), seen = useGame(st => st.prefs.overviewSeen), a = useGame(st => st.actions);
  const firstVisit = useGame(st => st.firstVisit);
  if (seen || !firstVisit) return null;
  return <section className={s.welcome} aria-label={t('Your first mission')}>
    <div><span className="kicker">{t('WELCOME ABOARD')}</span><h2>{t('You are the mission designer.')}</h2><p>{t('No space experience needed. Try a design, see what happens, and improve it.')}</p></div>
    <ol>
      <li><Icon name="orbit" /><div><strong>{t('1. Pick a mission')}</strong><p>{t('Start with Lunar Polar Mapper and Cadet difficulty.')}</p></div></li>
      <li><Icon name="bus" /><div><strong>{t('2. Build and check')}</strong><p>{t('Try Balanced build. Keep mass, power and cost within limits.')}</p></div></li>
      <li><Icon name="launch" /><div><strong>{t('3. Fly, then learn')}</strong><p>{t('Launch, respond to events, and return science to Earth. Your report explains the result.')}</p></div></li>
    </ol>
    <div className={s.row}><Button variant="primary" onClick={() => a.setPref('overviewSeen', true)}>{t('Start exploring')}</Button><span>{t('Need a hand? Your assistant is at the bottom right.')}</span></div>
  </section>;
}
