import {useEffect} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {useGame, selectMission} from '../store/index.js';
import {Button, Chip, LiveRegion, ToastViewport, MotionProvider, useReducedMotion, variants, variantsFor, setConceptOpener} from '../ds/index.js';
import {useT} from '../i18n/index.js';
import {loadFeatures, getScreen} from './features.js';
import {SheetHost} from './SheetHost.jsx';
import {useDocumentLanguage, useDensity, useHistorySync} from './hooks.js';
import iconUrl from '../assets/icon.svg';
import s from './shell.module.css';

const NAV = [['board', 'Board'], ['hangar', 'Hangar'], ['flight', 'Flight'], ['report', 'Report']];

function Header() {
  const t = useT();
  const screen = useGame(st => st.screen), run = useGame(st => st.run), runs = useGame(st => st.runs), team = useGame(st => st.team), a = useGame(st => st.actions);
  const mission = useGame(selectMission);
  const reason = {flight: run && !run.done ? '' : t('Launch a mission first'), report: run?.done || runs.length ? '' : t('Finish a mission first')};
  return (
    <header className={s.header}>
      <button type="button" className={s.brand} onClick={() => a.home()} aria-label="TRAJECTIQ"><img src={iconUrl} alt="" width="28" height="28" /><span className={s.brandText}>TRAJECTIQ</span></button>
      <nav className={s.nav} aria-label={t('Mission screens')}>
        {NAV.map(([id, label]) => {
          const why = reason[id]; const here = screen === id;
          return <button key={id} type="button" className={s.navItem} aria-current={here ? 'step' : undefined} aria-disabled={why ? true : undefined} title={why || undefined} onClick={() => { if (!why) a.go(id); }}>{t(label)}</button>;
        })}
      </nav>
      <div className={s.right}>
        <Chip kind="info" icon="orbit" size="sm" className={s.chip}>{mission.title} · {mission.difficultyLabel}{team.mode === 'crew' ? ' · CREW' : ''}</Chip>
        <Button variant="ghost" size="sm" icon="assistant" onClick={() => a.mentor()}>{t('Assistant')}</Button>
        <Button variant="ghost" size="sm" iconOnly icon="menu" label={t('Menu')} onClick={() => a.openSheet('menu')} />
      </div>
    </header>
  );
}

function Screen() {
  const screen = useGame(st => st.screen);
  const reduced = useReducedMotion();
  const Body = getScreen(screen);
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={screen} {...variantsFor(variants.fadeUp, reduced)}><Body /></motion.div>
    </AnimatePresence>
  );
}

function Frame() {
  const t = useT();
  const toasts = useGame(st => st.toasts), a = useGame(st => st.actions);
  useDocumentLanguage(); useDensity(); useHistorySync();
  useEffect(() => { setConceptOpener(topic => a.openSheet('concept', {topic})); }, [a]);
  return (
    <div className={s.shell}>
      <a className="skip-link" href="#main" onClick={e => { e.preventDefault(); document.getElementById('main')?.focus(); }}>{t('Skip to content')}</a>
      <Header />
      <main id="main" className={s.main} tabIndex={-1}><Screen /></main>
      <SheetHost />
      <ToastViewport toasts={toasts} onDismiss={a.dismissToast} dismissLabel={t('Dismiss')} />
      <LiveRegion />
    </div>
  );
}

/** The app shell: header + screen router + sheet host + toasts + live region, inside the reduced-motion provider. */
export function AppShell() {
  const reduced = useGame(st => st.prefs.reducedMotion);
  loadFeatures();
  return <MotionProvider reduced={reduced}><Frame /></MotionProvider>;
}
