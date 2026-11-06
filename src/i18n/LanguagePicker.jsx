import {useId, useState} from 'react';
import {useGame} from '../store/index.js';
import {useT} from './useT.js';
import {LOCALES} from './locales.js';
import {loadLanguage} from './loadLanguage.js';
export function LanguagePicker() {
  const id = useId(), t = useT(), language = useGame(s => s.prefs.language);
  const [busy, setBusy] = useState(false), [error, setError] = useState(false);
  async function change(event) {
    const code = event.target.value;
    setBusy(true); setError(false);
    try { await loadLanguage(code); useGame.getState().actions.setPref('language', code); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  return <div className="languagePicker">
    <label htmlFor={id}>{t('Language')}</label>
    <select id={id} value={language} onChange={change} disabled={busy} aria-describedby={`${id}-note`}>
      {LOCALES.map(l => <option key={l.code} value={l.code} lang={l.code}>{l.name}</option>)}
    </select>
    <small id={`${id}-note`}>{t('Missing translations use English.')}</small>
    {error && <p role="alert">{t('Language could not load. Please try again.')}</p>}
  </div>;
}
