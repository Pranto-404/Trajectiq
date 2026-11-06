import {lazy, Suspense} from 'react';
import {useT} from '@/i18n/index.js';
import {LaunchCheckSheet} from './LaunchCheckSheet.jsx';
import s from './hangar.module.css';

// The hangar is the largest screen and is not needed for the first paint, so it is a separate chunk. Loading starts right
// after the entry module is evaluated (see start()), so by the time the player presses "Accept mission" it is usually ready.
const loadScreen = () => import('./HangarScreen.jsx');
const Screen = lazy(() => loadScreen().then(m => ({default: m.HangarScreen})));

/** Start fetching both chunks without waiting for the first visit. Safe to call more than once. */
export function start() { loadScreen().catch(() => {}); }

function Loading() {
  const t = useT();
  return <div className={s.screen} data-screen="hangar" aria-busy="true"><p className={s.fine} role="status">{t('Loading the hangar…')}</p></div>;
}

export function HangarScreen() { return <Suspense fallback={<Loading />}><Screen /></Suspense>; }
/** The pre-launch check stays in the main chunk: it is small and the launch path must never wait on a download. */
export const LaunchCheck = LaunchCheckSheet;
