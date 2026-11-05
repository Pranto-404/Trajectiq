import {Icon} from './Icon.jsx';
import s from './Concept.module.css';

let opener = null;
/** The shell wires this to openSheet('concept', {topic}). The design system itself never imports the store. */
export function setConceptOpener(fn) { opener = fn; }

/** The "?" trigger beside a label. Content stays in dist/data/learn.js; the concept sheet renders it. */
export function Concept({id, label, onOpen, className = ''}) {
  const name = label || id;
  return (
    <button type="button" className={`${s.concept} ${className}`} aria-label={`About ${name}`} title={`About ${name}`} data-concept={id}
      onClick={e => { e.stopPropagation(); (onOpen || opener)?.(id); }}>
      <Icon name="help" size={14} />
    </button>
  );
}
