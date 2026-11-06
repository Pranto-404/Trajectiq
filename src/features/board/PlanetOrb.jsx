import s from './board.module.css';

function hueOf(text) { let h = 0; for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }

/** Highlight / body / shadow colours from the engine's body colours; a body without colours gets a hue derived from its name. */
export function orbColors(body, colors) {
  if (colors?.surface && colors?.accent) return [colors.accent, colors.surface, `color-mix(in srgb, ${colors.surface} 22%, #05080d)`];
  const h = hueOf(String(body || '').toLowerCase());
  return [`hsl(${h} 55% 78%)`, `hsl(${h} 45% 48%)`, `hsl(${h} 50% 14%)`];
}

/** Decorative destination globe (CSS only, no image, no 3D). The slow surface drift stops under reduced motion. */
export function PlanetOrb({body, colors, size = 132}) {
  const [hi, mid, lo] = orbColors(body, colors);
  return (
    <span className={s.orb} aria-hidden="true" style={{'--orb-hi': hi, '--orb-mid': mid, '--orb-lo': lo, '--orb-size': `${size}px`}} data-body={String(body || '')}>
      <span className={s.orbSurface} />
      <span className={s.orbShade} />
    </span>
  );
}
