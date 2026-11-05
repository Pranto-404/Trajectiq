import {afterEach, expect} from 'vitest';
import {cleanup} from '@testing-library/react';

// Minimal accessible-description / focus matchers (no jest-dom dependency).
expect.extend({
  toHaveFocus(el) { return {pass: el === document.activeElement, message: () => `expected ${el?.outerHTML?.slice(0, 60)} ${this.isNot ? 'not ' : ''}to have focus`}; },
  toHaveTextContent(el, text) { const t = el.textContent.replace(/\s+/g, ' ').trim(); const pass = text instanceof RegExp ? text.test(t) : t.includes(text); return {pass, message: () => `expected "${t}" ${this.isNot ? 'not ' : ''}to contain ${text}`}; },
  toHaveAccessibleDescription(el, text) {
    const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    const d = ids.map(i => document.getElementById(i)?.textContent || '').join(' ').trim();
    return {pass: d === text, message: () => `expected description "${d}" ${this.isNot ? 'not ' : ''}to equal "${text}"`};
  }
});
afterEach(() => cleanup());
