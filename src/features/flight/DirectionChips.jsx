import {Icon} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {directionWord} from './flightModel.js';
import s from './flight.module.css';

/**
 * Direction-only preview of one response: an arrow glyph strip per metric (up to three arrows) and a spoken word
 * ("slightly higher"). By design it never renders a number: the decision stays the player's, the exact ranges cost the
 * one forecast. Positive is always better (the engine already inverts lost data and safe-mode risk).
 */
export function DirectionChips({chips}) {
  const t = useT();
  if (!chips?.length) return null;
  return (
    <ul className={s.dirChips} aria-label={t('Rough preview, direction only')}>
      {chips.map(c => {
        const n = Math.min(3, Math.abs(Math.round(c.dir || 0))), up = c.dir > 0, flat = n === 0;
        return (
          <li key={c.key} className={s.dirChip} data-tone={flat ? 'flat' : up ? 'good' : 'bad'}>
            <span>{t(c.key)}</span>
            <span className={s.dirArrows} aria-hidden="true">
              {flat ? <Icon name="arrow-flat" size={14} /> : Array.from({length: n}, (_, i) => <Icon key={i} name={up ? 'arrow-up' : 'arrow-down'} size={14} />)}
            </span>
            <span className="sr-only">{t(directionWord(c.dir))}</span>
          </li>
        );
      })}
    </ul>
  );
}
