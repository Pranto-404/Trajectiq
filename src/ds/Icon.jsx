// Hand-authored inline SVG icon set: 24 px grid, 1.75 px stroke, round caps and joins. No icon library.
// Decorative by default (aria-hidden). Pass `title` to make an icon meaningful (role="img" with an accessible name).
const P = {
  // the seven subsystems
  bus: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M3 10h3M3 14h3M18 10h3M18 14h3M10 3v3M14 3v3M10 18v3M14 18v3" /></>,
  payload: <><circle cx="12" cy="13" r="3.5" /><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /></>,
  power: <><circle cx="12" cy="12" r="3.5" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" /></>,
  propulsion: <><path d="M12 3l4 6v8H8V9z" /><path d="M9.5 20.5L12 18l2.5 2.5M12 10v3" /></>,
  comms: <><circle cx="12" cy="10" r="1.6" /><path d="M12 12v8M8.5 20h7M7.6 5.6a6 6 0 0 0 0 8.8M16.4 5.6a6 6 0 0 1 0 8.8M4.8 3.2a10 10 0 0 0 0 13.6M19.2 3.2a10 10 0 0 1 0 13.6" /></>,
  storage: <><ellipse cx="12" cy="6.5" rx="7" ry="3" /><path d="M5 6.5v11c0 1.7 3.1 3 7 3s7-1.3 7-3v-11M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" /></>,
  launch: <><path d="M12 19V6M6.5 11.5L12 6l5.5 5.5M5 21h14" /></>,
  // transport
  play: <path d="M8 5.5l10.5 6.5L8 18.5z" />,
  pause: <><rect x="6.5" y="5" width="4" height="14" rx="1" /><rect x="13.5" y="5" width="4" height="14" rx="1" /></>,
  step: <><path d="M5.5 5.5L14 12l-8.5 6.5z" /><path d="M18 5v14" /></>,
  fast: <><path d="M3.5 5.5L11 12l-7.5 6.5zM12.5 5.5L20 12l-7.5 6.5z" /></>,
  // state
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  warning: <><path d="M12 4l9.5 16.5h-19z" /><path d="M12 10v4.5M12 17.4v.2" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8v.2" /></>,
  // domain
  orbit: <><ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-30 12 12)" /><circle cx="12" cy="12" r="2.2" /><circle cx="19" cy="7.5" r="1" /></>,
  eclipse: <><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5a8.5 8.5 0 0 0 0 17 5.5 8.5 0 0 1 0-17z" /></>,
  signal: <path d="M5 19v-3M10 19v-7M15 19V9M20 19V5" />,
  battery: <><rect x="3" y="7.5" width="16" height="9" rx="2" /><path d="M21.5 10.5v3M7 10.5v3M11 10.5v3" /></>,
  fuel: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  assistant: <><path d="M4.5 5.5h15v10.5h-8.5l-4 3.5V16h-2.5z" /><path d="M9 10.7h6" /></>,
  // preferences
  'sound-on': <><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
  'sound-off': <><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></>,
  vibration: <><rect x="8.5" y="4.5" width="7" height="15" rx="1.8" /><path d="M4.8 9v6M19.2 9v6M2.2 11v2M21.8 11v2" /></>,
  fullscreen: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.4 9.4a2.7 2.7 0 1 1 3.8 2.5c-.8.4-1.2 1-1.2 1.9M12 16.8v.2" /></>,
  share: <><circle cx="6" cy="12" r="2.4" /><circle cx="17.5" cy="6" r="2.4" /><circle cx="17.5" cy="18" r="2.4" /><path d="M8.2 10.8l7.1-3.6M8.2 13.2l7.1 3.6" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  'chevron-down': <path d="M6 9.5l6 6 6-6" />,
  'arrow-right': <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
  'arrow-up': <path d="M12 19.5v-15M6 10.5l6-6 6 6" />,
  'arrow-down': <path d="M12 4.5v15M6 13.5l6 6 6-6" />,
  'arrow-flat': <path d="M4.5 12h15" />,
  language: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></>,
  motion: <><path d="M4 12h5l2-5 3 10 2-5h4" /></>
};

export const ICON_NAMES = Object.keys(P);

/** <Icon name="power" size={20} title="Power system" /> */
export function Icon({name, size = 20, title, className, strokeWidth = 1.75, ...rest}) {
  const body = P[name];
  if (!body) return null;
  const a11y = title ? {role: 'img', 'aria-label': title} : {'aria-hidden': true, focusable: 'false'};
  const filled = name === 'play' || name === 'pause';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} data-icon={name} {...a11y} {...rest}>
      {title ? <title>{title}</title> : null}
      {body}
    </svg>
  );
}
