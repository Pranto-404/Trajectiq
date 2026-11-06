// Quality tiers, DPR caps and the 1 s FPS sampler. Pure (the environment is passed in).
export const TIERS = Object.freeze(['low', 'medium', 'high']);

export const TIER_SETTINGS = Object.freeze({
  low:    {stars: 350,  plume: 48,  segments: 32, dust: 12, antialias: false, dprMax: 1},
  medium: {stars: 700,  plume: 96,  segments: 48, dust: 20, antialias: false, dprMax: 1.25},
  high:   {stars: 1200, plume: 160, segments: 64, dust: 28, antialias: true,  dprMax: 2}
});

/** Phone-class device: coarse pointer and a short screen side. */
export function isPhoneLike({coarse = false, width = 1280, height = 800} = {}) {
  return !!coarse && Math.min(width, height) < 820;
}

/** Initial tier from cheap signals. Never throws on missing values. */
export function pickInitialTier({hardwareConcurrency, deviceMemory, phone = false} = {}) {
  const cores = Number.isFinite(hardwareConcurrency) ? hardwareConcurrency : 4, mem = Number.isFinite(deviceMemory) ? deviceMemory : 4;
  if (cores <= 2 || mem <= 2) return 'low';
  if (phone || cores <= 4 || mem <= 4) return 'medium';
  return 'high';
}

/** Explicit prop wins ('low'|'medium'|'high'); anything else (auto, undefined, junk) means auto. */
export function resolveTier(quality, auto) {
  return TIERS.includes(quality) ? quality : auto;
}

/** Device-pixel-ratio range handed to the Canvas: phones are capped at [1, 1.5]. */
export function dprRange(tier, {phone = false, devicePixelRatio = 1} = {}) {
  const cap = Math.min(TIER_SETTINGS[tier]?.dprMax ?? 1.25, phone ? 1.5 : 2);
  const hi = Math.max(1, Math.min(cap, Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1));
  return [1, hi];
}

/** Next lower tier (the FPS sample only ever downgrades). */
export const downgrade = tier => TIERS[Math.max(0, TIERS.indexOf(tier) - 1)] || 'low';

/** Collects frame times for `windowMs` after `warmupFrames`, then reports average fps once. */
export function createFpsSampler({windowMs = 1000, warmupFrames = 8} = {}) {
  let frames = 0, elapsed = 0, count = 0, done = false;
  return {
    tick(dtMs) {
      if (done || !(dtMs > 0)) return null;
      if (frames++ < warmupFrames) return null;
      elapsed += dtMs; count++;
      if (elapsed >= windowMs) { done = true; return (count * 1000) / elapsed; }
      return null;
    },
    get done() { return done; }
  };
}

/** A tier to move to after sampling `fps`, or null when performance is fine. Under 38 fps drops one tier. */
export const tierAfterSample = (tier, fps) => (Number.isFinite(fps) && fps < 38 && tier !== 'low' ? downgrade(tier) : null);
