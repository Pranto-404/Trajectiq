import {LEARN} from '@data/learn.js';
import {useGame} from '@/store/index.js';
import {Button, Icon} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {Rise} from '../report/Rise.jsx';
import {clean} from '../report/format.js';
import s from './sheets.module.css';

/** Own-property lookup, so '__proto__' and 'constructor' are never concepts. */
export const conceptFor = topic => (typeof topic === 'string' && Object.hasOwn(LEARN, topic) ? LEARN[topic] : null);

/** Sheet title: the concept name, or the index title. */
export const conceptTitle = props => (props?.index ? 'Concept cards' : conceptFor(props?.topic)?.title || 'Concept cards');

function Index({note}) {
  const t = useT();
  const act = useGame.getState().actions;
  return (
    <div className={s.sheet}>
      {note ? <p className={s.notice} role="status"><Icon name="info" size={14} /> {note}</p> : null}
      <p className={s.muted}>{t('Short, plain-language explanations of the ideas behind the numbers. Pick a card.')}</p>
      <ul className={s.cards}>
        {Object.entries(LEARN).map(([k, v], i) => (
          <li key={k}>
            <Rise i={i}>
              <button type="button" className={s.conceptCard} onClick={() => act.learn({topic: k})}>
                <strong>{clean(v.title, 60)}</strong>
                <span className={s.muted}>{clean(v.simple, 90)}…</span>
              </button>
            </Rise>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One concept card (plain words, why it changes the mission, try this) or the index of all cards. */
export function ConceptSheet({topic, index}) {
  const t = useT();
  const act = useGame.getState().actions;
  const card = conceptFor(topic);
  if (index) return <Index />;
  if (!card) return <Index note={t('That concept card does not exist. Here are all of them.')} />;
  return (
    <div className={s.sheet}>
      {[['In plain words', card.simple], ['Why it changes your mission', card.why], ['Try this', card.tryThis]].map(([label, text], i) => (
        <Rise key={label} i={i} className={s.fact}>
          <h3>{t(label)}</h3>
          <p>{clean(text, 800)}</p>
        </Rise>
      ))}
      <div className={s.row}><Button variant="ghost" size="sm" icon="arrow-right" onClick={() => act['learn-index']()}>{t('All concept cards')}</Button></div>
    </div>
  );
}
