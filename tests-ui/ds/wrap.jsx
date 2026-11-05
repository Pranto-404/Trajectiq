import {render} from '@testing-library/react';
import {MotionProvider} from '@/ds/index.js';

/** Render inside the reduced-motion provider, like the real app under prefers-reduced-motion. */
export function renderDs(ui, {reduced = true, ...opts} = {}) {
  return render(ui, {wrapper: ({children}) => <MotionProvider reduced={reduced}>{children}</MotionProvider>, ...opts});
}
