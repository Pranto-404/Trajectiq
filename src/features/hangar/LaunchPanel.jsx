import {Button, Chip} from '@/ds/index.js';
import {useGame, selectLaunchCheck} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {useLocked} from './hooks.js';
import s from './hangar.module.css';

/** The "Launch readiness" entry. Always available for draft diagnostics; only active flights disable it. */
export function LaunchButton({size = 'lg', block = false}) {
  const t = useT();
  const locked = useLocked();
  const a = useGame(st => st.actions);
  const ok = !locked;
  const reason = locked ? t('A flight is already in progress') : '';
  return <Button variant="primary" size={size} iconEnd="arrow-right" className={block ? s.block : undefined} disabled={!ok} disabledReason={reason || undefined} onClick={() => a['game-review']()}>{t('Launch readiness →')}</Button>;
}

/** Desktop launch card: the button, the verdict and the reason in words (never only a colour or a disabled look). */
export function LaunchPanel() {
  const t = useT();
  const lc = useGame(selectLaunchCheck);
  const locked = useLocked();
  return (
    <div className={s.launchPanel} data-tour="launch" data-testid="launch-panel">
      <LaunchButton block />
      <p className={s.fine} role="status">
        {locked ? t('A flight is already in progress') : lc.launchable ? <><Chip kind="pass" size="sm">{t('No hard failures')}</Chip> {t('Advisory warnings may be accepted.')}</> : <><Chip kind="fail" size="sm">{lc.failedCount} {t('failed')}</Chip> {t('Mass, budget and compatibility failures block launch.')}</>}
      </p>
    </div>
  );
}

/** Mobile sticky launch bar in the thumb zone. */
export function LaunchBar() {
  const lc = useGame(selectLaunchCheck);
  const t = useT();
  return (
    <div className={s.launchBar} data-tour="launch" data-testid="launch-bar">
      <span className={s.launchBarText} role="status">{lc.launchable ? t('No hard failures') : `${lc.failedCount} ${t('failed')}`}</span>
      <LaunchButton size="md" />
    </div>
  );
}
