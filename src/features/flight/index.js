// Flight / mission control (WP7). Replaces the `flight` placeholder screen.
// The screen loads as a lazy chunk so the first visit (the board) stays small; tests import FlightScreen.jsx directly.
import {Suspense, lazy, createElement} from 'react';
import {strings} from './strings.js';

const Inner = lazy(() => import('./FlightScreen.jsx').then(m => ({default: m.FlightScreen})));
function FlightScreenLazy(props) {
  return createElement(Suspense, {fallback: createElement('p', {role: 'status', className: 'kicker'}, 'Loading mission control…')}, createElement(Inner, props));
}

export const screens = {flight: FlightScreenLazy};
export {strings};
