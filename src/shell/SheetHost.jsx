import {useRef} from 'react';
import {useGame} from '../store/index.js';
import {Dialog, Sheet} from '../ds/index.js';
import {useT} from '../i18n/index.js';
import {getSheet} from '../sheets/registry.js';
import {PlaceholderSheet} from './builtinSheets.jsx';

/** Renders the open sheet (store.sheet) as a Dialog, side Sheet or bottom Sheet according to its registration. */
export function SheetHost() {
  const t = useT();
  const sheet = useGame(s => s.sheet);
  const close = useGame(s => s.actions.closeSheet);
  const last = useRef(null);
  if (sheet) last.current = sheet;
  const shown = sheet || last.current;           // keep the content mounted while the exit animation runs
  if (!shown) return null;
  const def = getSheet(shown.id) || {component: PlaceholderSheet, variant: 'dialog', title: shown.id, size: 'sm'};
  const Body = def.component;
  const props = def.component === PlaceholderSheet ? {sheetId: shown.id, ...shown.props} : shown.props;
  const title = t(typeof def.title === 'function' ? def.title(shown.props) : def.title || shown.id);
  const body = <Body {...props} close={close} />;
  if (def.variant === 'dialog') return <Dialog open={!!sheet} onClose={close} title={title} size={def.size} dismissible={def.dismissible !== false} alert={!!def.alert} closeLabel={t('Close')}>{body}</Dialog>;
  return <Sheet open={!!sheet} onClose={close} title={title} placement={['bottom', 'side', 'chat'].includes(def.variant) ? def.variant : 'auto'} dismissible={def.dismissible !== false} closeLabel={t('Close')}>{body}</Sheet>;
}
