import {useEffect, useRef} from 'react';

// Shared by Dialog and Sheet: focus trap, Escape, inert background and return-focus, written once.
const inertCounts = new Map();
function setInert(el, on) {
  const n = (inertCounts.get(el) || 0) + (on ? 1 : -1);
  if (n <= 0) { inertCounts.delete(el); el.removeAttribute('inert'); el.removeAttribute('data-was-inert'); }
  else { inertCounts.set(el, n); el.setAttribute('inert', ''); }
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
export const focusables = root => [...root.querySelectorAll(FOCUSABLE)].filter(el => !el.closest('[inert]') && !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true');

/**
 * While `open`: everything else in <body> becomes inert (the portal host is kept active), focus moves into `ref`, Tab is
 * trapped, Escape calls onClose (when dismissible), and on close focus returns to the element that opened it.
 */
export function useModal({open, ref, onClose, dismissible = true}) {
  const opener = useRef(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const node = ref.current; if (!node) return undefined;
    opener.current = document.activeElement;
    const host = node.closest('[data-modal-host]') || node;
    const others = [...document.body.children].filter(el => el !== host && el.tagName !== 'SCRIPT' && !el.hasAttribute('data-modal-host'));
    others.forEach(el => setInert(el, true));
    const first = node.querySelector('[data-autofocus]') || focusables(node)[0] || node;
    if (first === node) node.tabIndex = -1;
    first.focus({preventScroll: true});
    const onKey = e => {
      if (e.key === 'Escape' && dismissible) { e.stopPropagation(); e.preventDefault(); close.current?.(); return; }
      if (e.key !== 'Tab') return;
      const list = focusables(node); if (!list.length) { e.preventDefault(); return; }
      const a = list[0], z = list.at(-1), active = document.activeElement;
      if (!node.contains(active)) { e.preventDefault(); a.focus(); }
      else if (e.shiftKey && active === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && active === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      others.forEach(el => setInert(el, false));
      const back = opener.current;
      if (back && back.isConnected && typeof back.focus === 'function') back.focus({preventScroll: true});
      else document.querySelector('main button, main [tabindex="0"]')?.focus?.();
    };
  }, [open, ref, dismissible]);
}
