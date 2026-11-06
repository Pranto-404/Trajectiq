import {useGame} from '@/store/index.js';
import {Button, Icon, Segmented} from '@/ds/index.js';
import {useFx} from '@/fx/index.js';
import {useT} from '@/i18n/index.js';
import s from './sheets.module.css';

/** A labelled on/off switch (role="switch"), so the state is spoken and not only coloured. */
export function Switch({icon, label, hint, on, onChange, disabled, disabledReason}) {
  const t = useT();
  return (
    <button type="button" role="switch" aria-checked={on} aria-disabled={disabled || undefined} className={s.switch} onClick={() => { if (!disabled) onChange(); }} title={disabledReason}>
      <Icon name={icon} size={18} />
      <span className={s.switchText}><strong>{label}</strong>{hint || disabledReason ? <small className={s.muted}>{disabled ? disabledReason : hint}</small> : null}</span>
      <span className={s.track} data-on={on || undefined} aria-hidden="true"><i /></span>
      <span className="sr-only">{on ? t('On') : t('Off')}</span>
    </button>
  );
}

/** Menu: language, motion, sound and haptics preferences, and shortcuts to every sheet and tool. */
export function MenuSheet({close}) {
  const t = useT();
  const prefs = useGame(st => st.prefs), pitch = useGame(st => st.pitch);
  const fx = useFx();
  const act = useGame.getState().actions;
  const then = fn => () => { close?.(); fn(); };
  const rows = [
    ['help', 'How to play', () => act['game-help']()], ['assistant', 'Assistant', () => act.mentor()], ['help', 'Concept cards', () => act['learn-index']()],
    ['check', 'Learning check', () => act.quiz()], ['orbit', 'Run history', () => act.openSheet('history')], ['info', 'Sources & method', () => act.sources()], ['signal', 'NASA data & credits', () => act['nasa-data']()],
    ['bus', 'Engineering lab', () => act.customize()]
  ];
  return (
    <div className={s.sheet}>
      <section className={s.block} aria-label={t('Preferences')}>
        <h3>{t('Preferences')}</h3>
        <Segmented label={t('Language')} value={prefs.language} onChange={v => act.setPref('language', v)} options={[{value: 'en', label: 'English'}, {value: 'bn', label: 'বাংলা'}]} />
        <Switch icon="motion" label={t('Reduce animation')} hint={t('Follows your system setting too')} on={prefs.reducedMotion} onChange={() => act['toggle-motion']()} />
        <Switch icon={prefs.sound ? 'sound-on' : 'sound-off'} label={t('Sound')} hint={t('Short synthesized cues; off by default')} on={prefs.sound} onChange={fx.toggleSound} />
        <Switch icon="vibration" label={t('Haptics')} hint={t('Vibration on supported phones')} on={prefs.haptics} onChange={fx.toggleHaptics} />
        <Switch icon="help" label={t('Beginner tips')} on={prefs.guided} onChange={() => act['guide-toggle']()} />
      </section>
      <section className={s.block} aria-label={t('Tools')}>
        <h3>{t('Tools')}</h3>
        <ul className={s.menuList}>
          {rows.map(([icon, label, fn]) => <li key={label}><Button variant="ghost" icon={icon} className={s.menuBtn} onClick={fn}>{t(label)}</Button></li>)}
          <li><Button variant="ghost" icon="fullscreen" className={s.menuBtn} onClick={then(() => act.focus())}>{t('Focus view')}</Button></li>
          <li><Button variant="ghost" icon="play" className={s.menuBtn} onClick={then(() => (pitch ? act['exit-pitch']() : act.pitch()))}>{pitch ? t('Leave pitch demo') : t('Pitch demo')}</Button></li>
        </ul>
      </section>
    </div>
  );
}
