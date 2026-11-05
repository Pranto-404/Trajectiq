import {Button, Icon} from '@/ds/index.js';
import {useGame} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import s from './board.module.css';

/** The 90-second pitch path banner (demo mode). Shown on the board and in the hangar while `pitch` is on. */
export function PitchBanner() {
  const t = useT();
  const pitch = useGame(st => st.pitch), a = useGame(st => st.actions);
  if (!pitch) return null;
  return (
    <section className={s.pitch} aria-label={t('90-second pitch path')} data-testid="pitch-banner">
      <Icon name="orbit" size={20} />
      <div className={s.pitchText}>
        <strong>{t('90-second pitch path')}</strong>
        <p>{t('Fragile design → launch → eclipse / backlog → explain why → upgrade power + comms → compare.')}</p>
      </div>
      <div className={s.row}>
        <Button size="sm" variant="secondary" onClick={() => a['preset-fragile']()}>{t('Fragile preset')}</Button>
        <Button size="sm" variant="secondary" onClick={() => a['preset-resilient']()}>{t('Redesign fix')}</Button>
        <Button size="sm" variant="ghost" onClick={() => a['exit-pitch']()}>{t('Exit')}</Button>
      </div>
    </section>
  );
}
