import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import {useGame} from './store/index.js';
import {STANDALONE} from './env.js';
import {bindFx} from './fx/bindings.js';
import App from './App.jsx';

// Restore a checkpoint or open a shared link, then render. The store is created at import (localStorage).
useGame.getState().actions.init();
bindFx(useGame);
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);

// Offline-first service worker: hosted build only (the standalone file is already offline; file:// cannot register one).
if (import.meta.env.PROD && !STANDALONE && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
