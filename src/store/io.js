// Browser side effects behind one small interface, so the store stays testable: createGame({io}) can inject fakes.
// No network is involved: downloads use a Blob URL, copying uses the Clipboard API with a textarea fallback.

/** Offers `data` as a file download. */
export function download(data, type, name) {
  const url = URL.createObjectURL(new Blob([data], {type}));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener'; a.hidden = true;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copies text. Resolves true on success. Falls back to a temporary textarea when the Clipboard API is unavailable. */
export async function copy(text) {
  try { if (globalThis.navigator?.clipboard?.writeText) { await globalThis.navigator.clipboard.writeText(text); return true; } } catch { /* fall through */ }
  try {
    const box = document.createElement('textarea');
    box.value = text; box.setAttribute('readonly', ''); box.style.position = 'fixed'; box.style.opacity = '0';
    document.body.appendChild(box); box.select();
    const ok = document.execCommand?.('copy') !== false;
    box.remove();
    return ok;
  } catch { return false; }
}

export const print = () => globalThis.print?.();

export const defaultIo = {download, copy, print};
