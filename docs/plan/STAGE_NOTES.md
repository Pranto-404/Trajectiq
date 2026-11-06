# 3D stage notes (WP6)

Branch `feat-stage`. Owner paths: `src/features/stage/**`, `tests-ui/stage/**`, `src/assets/textures/**`, `src/assets/ATTRIBUTION.md`, this file. No change to `package.json`, the engine, the store, the shell or the design system.

## Using the stage

```jsx
import {Stage3D} from '@/features/stage';
<Stage3D ref={stage} design={design} selected={category} hoverPart={preview?.kind} run={run} phase={phase}
         quality="auto" reduced={prefs.reducedMotion} onPick={setCategory} onSocketHover={kind => ...} />
stage.current.seatPart('power', 'endurance', cardEl.getBoundingClientRect());   // Promise<boolean>, resolves when seated
stage.current.cameraTo('report');       // 'board' | 'hangar' | 'flight' | 'report' | 'launch' | 'transfer' | {yaw,pitch,distance,target,fov}
stage.current.launchSequence(false);    // Promise<{skipped}>; launchSequence(true) skips (Esc / tap)
stage.current.setExploded(true); stage.current.setXray(true); stage.current.resetCamera();
```

* `phase`: `'board' | 'hangar' | 'launch' | 'transfer' | 'capture' | 'operations' | 'debrief'/'report'`. If omitted it is taken from `run.phase`, else `hangar`. The camera preset follows the phase (and `selected === 'launch'` zooms the hangar onto the adapter). `cameraTo` overrides until the phase or `selected` changes.
* `run` is the engine run (`phase, minute, eclipse, contact, safe, mode, history, seed`). `minute` drives the craft on its orbit; `eclipse`, `contact`, `safe` drive the story visuals. Nothing else from the run is needed.
* Optional props: `exploded`, `xray` (same as the ref setters), `autoLaunch` (default true: the cinematic starts by itself the first time `phase` becomes `launch` for a `run.seed`; set false to call `launchSequence` yourself), `label` (accessible description override), `className`, `style`.
* Reduced motion: `reduced` defaults to the shell's `useReducedMotion()`.
* Render `<Stage3D>` in every screen that wants it (board, hangar, flight, report). There is **one** WebGL context: `host.js` keeps a single canvas element and moves it into whichever slot is mounted. When a screen unmounts the canvas is parked off screen and the scene pauses; the next slot picks it up and the camera glides (900 ms) to that screen's preset. Give the slot a size (it fills its parent: `width/height: 100%`, `min-height: 220px`).
* `import {ASSET_CREDITS, ASSET_NOTICE} from '@/features/stage'` for the credits UI. `disposeStage()` releases everything (tests, app teardown).

## Architecture

| file | role |
|---|---|
| `Stage3D.jsx` | contract component: slot + imperative ref; picks WebGL scene or SVG fallback; auto-launch |
| `host.js`, `runtime.js`, `stageStore.js` | singleton host (canvas element, status, lazy load, park/unpark, dispose), command runtime (buffers `seatPart`/`cameraTo`/`launchSequence` until the scene exists), props store into the separate React root |
| `StageCanvas.jsx` (lazy) | `mountStage()`: own React root + `<Canvas>`; tier/DPR/FPS probe, hidden-tab pause, context-lost handling, error boundary |
| `Scene.jsx`, `Craft.jsx`, `Planet.jsx`, `OrbitLayer.jsx`, `Rocket.jsx`, `CameraRig.jsx`, `particles.js`, `textures.js` | the scene (three.js side) |
| `camera.js`, `orbit.js`, `bodyVisuals.js`, `parts.js`, `layout.js`, `quality.js`, `motionMath.js`, `webgl.js`, `credits.js` | pure helpers, unit tested |
| `SceneFallback.jsx` | SVG scene with the same selection API |
| `dev/harness.html` | dev-only test page (`npm run dev`, open `/src/features/stage/dev/harness.html`; not part of the build) |

## What it shows

* **Spacecraft**: procedural geometry for every catalog variant (2 buses, 2 payloads, 3 power kits plus `arrayScale`, 2 thrusters, 3 radios, 3 recorders, 2 launchers, livery colours). Standard PBR materials, lit by one directional Sun light, ambient and a cool fill. Selected part: lime emissive pulse; hovered part: cyan; socket rings glow for the hovered, selected, exploded or x-ray state. Exploded and x-ray toggles. Beacon blinks (amber and fast in safe mode).
* **Snap-fit**: `seatPart(kind, id, fromRect)` unprojects the tray rectangle centre onto the camera ray, flies the real part mesh from there to its socket on the `snap` spring (420/26, about 7 % overshoot in the simulation test; the plan text says about 4 %), then a 180 ms socket flash and a small dust burst. Reduced motion: no flight, a 120 ms flash. The promise resolves at landing so the UI can solidify its gauges.
* **Body**: table keyed by body id (`bodyVisuals.js`), covering all 8 engine bodies (moon, mars, earth, mercury, venus, ceres, vesta, europa); unknown ids use the engine colours via `getBody` (imported from `@data/bodies.js`, not `api.js`, to keep the initial bundle small), else a neutral grey rock (tested with hostile ids). NASA maps for Earth, Moon, Mars, Venus; procedural craters for Mercury, Ceres and Vesta; procedural icy lineae for Europa. Atmosphere glow shader (Venus thick plus a bright haze shell over the radar map, Earth blue, Mars dusty). Slow spin. Europa is drawn as a plain orbit: the engine's orbit is a stand-in for the Clipper flyby tour and the UI should show the body's `simplification` text.
* **Orbit story** (flight and report): ring (altitude spacing exaggerated, clamped), trail, eclipse arc (amber tube) and umbra cylinder whose radius is `r * R/(R+h)`: a unit test checks, for all 8 bodies, that the drawn shadow matches the engine's "last E minutes of each orbit" rule (at least 98.5 % of samples). Sun marker and Sun/Earth direction arrows. Solar wings tilt toward the Sun in flight (fixed tilt in the hangar so they stay easy to pick). The dish slews to Earth while `run.contact`; a link beam with pulses (faster pulses when the last history mode is `downlink`). Safe mode dims the craft to 50 %, eclipse to 20 %.
* **Launch cinematic**: pad, rocket (slim for rideshare, wide for dedicated), ignition, liftoff, exhaust particles in world space (they trail the rocket), shake that ramps in then decays exponentially, camera dolly and follow, separation flash, craft hand-off, then the camera glides to the next preset. 5.5 s the first time, 3.2 s after, 0.9 s with reduced motion (no shake, no particles). `launchSequence(true)` skips. A timer guarantees the promise resolves even if frames stop.
* **Camera**: presets with 900 ms `cubic-bezier(.65,0,.35,1)` glide; drag (mouse both axes, touch horizontal only), keys (arrows, `+`/`-`, `R`), wheel only when the canvas is focused; idle drift stops on interaction and is off under reduced motion; distance backs off on narrow canvases.
* **Performance**: tiers `low/medium/high` from `hardwareConcurrency`, `deviceMemory`, pointer type; a 1 s FPS sample after 8 warm-up frames can only downgrade (under 38 fps); `quality` prop overrides. DPR range `[1, min(tierCap, 1.5 on phones, 2 otherwise)]`. No shadows, no post-processing. One `Points` starfield (350/700/1200 stars) with a twinkle shader; plume and dust are fixed-size CPU particle buffers. `frameloop`: `always`; `demand` under reduced motion (verified: 0 draw calls when idle, one redraw on a camera change); `never` when `document.hidden` or no slot is mounted.

## Assets (all shipped images: 589 KB of 6 MB)

See `src/assets/ATTRIBUTION.md` (licence basis, original URLs, byte counts, what was checked by eye) and `ASSET_CREDITS` in `credits.js`. Downloaded at development time only; nothing is fetched at runtime; the textures are bundled and imported by Vite.

| file | source | shipped |
|---|---|---|
| `earth.jpg` | NASA Earth Observatory, Blue Marble NG (topography and bathymetry, December) | 2048x1024, 289 KB |
| `moon.jpg` | NASA SVS CGI Moon Kit, LRO/LROC colour map | 1024x512, 113 KB |
| `mars.jpg` | NASA-3D-Resources `Mars.jpg` (mission product not stated by the repo) | 1024x512, 85 KB |
| `venus.jpg` | NASA-3D-Resources `Venus.jpg` (false-colour Magellan radar) | 1024x512, 102 KB |

Traps avoided: NASA-3D-Resources `Moon.jpg` (an Apollo photo, not a map) and the Titan gradient texture were not used. **Not shipped, drawn procedurally**: Mercury (no NASA-3D-Resources folder; Treks tiles need stitching), Ceres and Vesta (27 MB and 357 MB sources), Europa (low-quality greyscale map). **No NASA 3D models are shipped**: the spacecraft are procedural and fictional (plan section 3: no model download, no CDN, no licence risk; the NASA models in ASSETS.md are 0.25 to 10 MB each and would also need Draco/meshopt decoders that drei fetches remotely by default).

## Decisions and deviations

* **No drei.** Nothing is imported from `@react-three/drei` (the camera rig, starfield, atmosphere and particles are small custom code), so no helper can fetch remotely and the chunk stays small. `package.json` is unchanged.
* **Single-file offline build**: the standalone has no code splitting and a 2.2 MB budget, so `STANDALONE` replaces the lazy import with `null` and the offline file uses the SVG scene. three.js is absent from `TRAJECTIQ_Play.html` (766 KB). The hosted build has the full 3D stage.
* **Separate React root**: the scene lives in its own `createRoot` inside the host element (not the app tree) so it survives `AnimatePresence` screen swaps. Context from the app (store, motion provider) does not reach it; everything flows through the props passed to `<Stage3D>`.
* While the lazy chunk loads, the SVG scene is shown (no empty box).
* The dev harness is in `src/features/stage/dev/` and is not in the build input.
* `.claude/launch.json` for the dev server was created locally and is not committed.

## Measured

* Lazy chunk `StageCanvas-*.js`: 957 KB raw, **254 KB gzip** (limit 300). Initial JS is 199 KB gzip with the stage wrapper included (budget 220; importing the whole `api.js` into the wrapper cost +25 KB, so only `bodies.js` is imported). Textures are separate files loaded on demand.
* Tests: `tests-ui/stage` 47 Vitest tests (camera presets and touch rule, body table for all 8 bodies plus hostile ids, texture files and sizes, orbit and eclipse reproduction for every body, quality tiers, motion maths, spacecraft specs for every catalog variant, WebGL2 detection, SVG fallback behaviour and API, host lifecycle with a mocked 3D chunk: mounted once across screen changes, context lost to fallback, load failure to fallback, dispose exactly once, resource tracking for textures and particles).
* In Chromium (desktop Windows, RTX-class GPU, 375x812 emulation, DPR capped to 1.25 on the medium tier): about 50 fps requestAnimationFrame cadence (worst frame 30 ms) in the orbit view with the pane shared with other tabs. **Not representative of a mid-range phone**; no physical device was available. Verified in the browser: scene renders for every state listed above, picks on bus and wings, touch rule (vertical swipe leaves the camera alone, horizontal rotates, `touch-action: pan-y`), reduced motion (0 draws idle), SVG fallback (`?nowebgl=1`), park and dispose (context lost, canvas removed).

## Not verified

Physical phones and tablets, Safari/Firefox, a real WebGL context loss (only the mocked path and code review), WebGL2-less browsers (simulated by the probe), screen readers, the integrated screens (the hangar and flight engineers mount `<Stage3D>` themselves; only the dev harness was exercised), seat-flight accuracy against a real tray rectangle (checked with a button rectangle only), Bengali strings beyond two labels.
