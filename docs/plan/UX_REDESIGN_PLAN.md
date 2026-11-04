# TRAJECTIQ UX and front-end redesign plan

Prepared 2026-11-05 for the NASA International Space Apps Challenge 2026 submission (event date 2026-11-14, nine days out).
Scope of this document: audit, design system, interaction concepts, stack decision, migration plan, test and security plan, risks.
Nothing in the repository other than this file was changed. Evidence was gathered from the repo, the live site (https://trajectiq-omega.vercel.app/, observed 2026-11-04/05 at 1440x900 and 375x812) and two throw-away proof-of-concept builds (one Next.js, one Vite) made outside the repo.

---

## 0. Decision in one page

| Question | Decision |
|---|---|
| Framework | **Vite 8 + React 19, client-rendered, plain JSX (no TypeScript).** Not Next.js. Not "stay vanilla". |
| Why not Next.js | Measured: a Next 16.4.5 static export of a one-button page ships 3 inline `<script>` tags (including the `self.__next_f.push(...)` hydration payload). Your CSP is `script-src 'self'` with no inline scripts. Next's own docs say nonces need dynamic rendering, and its experimental SRI mode did not remove the inline scripts in my test. Details in section 4. |
| State | **zustand 5.0.16** wrapping the existing `state` shape; engine calls stay pure and unchanged. |
| Motion | **Motion 14.9.1** (`motion/react`, formerly framer-motion; same version number). |
| 3D | **three 0.187.0 + @react-three/fiber 9.8.2 + a short allow-list of @react-three/drei 10.7.9 helpers**, lazy-loaded, procedural geometry only, SVG fallback for no-WebGL2. |
| Styling | CSS Modules (built into Vite) + CSS custom-property tokens. No Tailwind, no CSS-in-JS. |
| Tests | Keep `node --test` for the engine (unchanged). Add **Vitest 5.1.0 + Testing Library + jsdom** for components. Add **Playwright 1.64.1 + axe** for an end-to-end smoke test (CI only, never in the Vercel build). |
| Engine files | Stay exactly where they are (`dist/engine`, `dist/data`), imported through a Vite alias. Zero test import churn. |
| Output | Vite builds to a new `site/` directory (Vercel `outputDirectory` changes from `dist` to `site`). The standalone offline file is still produced, still SHA-256 pinned, still at `dist/TRAJECTIQ_Play.html`. |
| Safety net | Work on a branch with Vercel previews. **Gate G1 (end of Sun 2026-11-08):** a playable vertical slice on the new stack. If it is not there, abort and ship Plan B (section 6.3: legacy app plus CSS/motion/sound upgrades). `main` keeps deploying the current game until cutover. |

The five changes that will most improve the *feel* (ranked): (1) stop re-rendering the whole DOM so gauges, focus and the 3D canvas persist; (2) a persistent 3D stage with snap-fit building and predictive "ghost" gauges; (3) a viewport-fitting mission-control screen with a live resource-flow diagram and a timeline scrubber; (4) a real button/gauge/panel system with a motion language, sound and haptics; (5) cinematic moments: launch, incident takeover, Go/No-Go roll call, score reveal.

---

## 1. Candid UX audit

Method: read `dist/ui/app.js`, `panels.js`, `scene.js`, `space3d.js`, `dist/styles.css`, `index.html`, `sw.js`, `vercel.json`, the build script and the tests; then drove the live game (board, hangar, launch, first crisis) at desktop and phone width and probed it with scripts. Numbers below are measured unless marked "estimate".

The game is not bad. The engine is strong, the writing is clear, there is already a hand-written WebGL hangar, a launch countdown, view transitions and reduced-motion support. The problem is that the *interface layer* is a document that re-renders, not an instrument that responds.

### 1.1 Architecture problems that cap the experience

**A. Whole-DOM re-render on every state change (the root cause).**
- `render()` -> `renderNow()` assigns `#app.innerHTML` (app.js line 59). It runs on every click, every slider commit, and **every simulation tick**: `tick()` calls `render()` every 1.4 s at 1x (1.9 s outside the operations phase, `clockDelay()` line 116). The hangar page is about 275 DOM nodes, all destroyed and rebuilt each time.
- **Animation:** a CSS transition needs the *same element* to exist before and after. Because every `.bar i` is a brand-new element, widths can never glide; the code compensates with a `bar-in` keyframe and a `data-countup` hack (`afterRender`, lines 304-310) that only works once per element. Battery, recorder and science numbers jump every 1.4 s instead of flowing. Shared-element transitions (a part card flying to the spacecraft, a scenario card becoming the hangar header) are impossible because nothing has identity.
- **Focus (measured on the live site):** focus a hangar module button, press it, and `document.activeElement` becomes `BODY`; the focused node is detached from the document. Keyboard and screen-reader users lose their place on every action. The code has `lastFocus`/`focusKey` workarounds only for modals.
- **Input fighting the architecture:** while a slider is dragged, `input` handlers patch fragments with `outerHTML` (line 337) to avoid a full render; that is the code admitting that re-rendering destroys the control being dragged.
- **The 3D canvas has to be smuggled across renders:** `newCanvas.replaceWith(oldCanvas)` (line 66) so WebGL is not torn down.
- **Hover, selection, scroll position, text selection, tooltips** reset on each render; assistive tech re-reads or drops position because the live region is the whole app.
- **Security by convention:** 4 `innerHTML` sites and string templates mean escaping depends on every author remembering `esc()` (the repo has a good hostile-data test, but React escapes by default).
- **Readability and parallel work:** `app.js` is 400 lines but 131 KB: 30 lines exceed 1,000 characters (longest 4,691). The 12 KB `game()` template is one line. Two developers cannot safely edit this file at the same time.
- **Testing:** the UI tests drive handlers through a fake `document` and assert on HTML strings. They cannot test focus, animation, layout or real events.

**B. Styling debt.** `styles.css` is 72.8 KB / 714 rules, with only 16 `transition` declarations, 12 keyframes, 9 `!important`, 16 custom properties (colors only: no spacing, type, radius, motion or elevation tokens) and breakpoints at 560/680/850/900/1100/1150/1500/1600 px that grew ad hoc.

**C. No font is actually loaded.** `font-family: Inter, "Segoe UI", Arial` but there is no `@font-face` and no font file, so the game renders in whatever the OS has (Segoe on Windows, Arial on Linux/Android, Inter only if installed). The look differs per device and the Bengali toggle has no considered type pairing.

### 1.2 Component design, hierarchy, affordance

| # | Weakness | Where it shows up | Fix (section) |
|---|---|---|---|
| 1 | **Buttons are flat rectangles.** `.btn`: 8 px radius, 1 px border, background swap on hover (0.16 s). `transform` is in the transition list but no rule ever sets a transform, so there is **no press, lift or release feedback**. No loading, success or confirm states. Disabled is `opacity:.4` with no reason shown. | Every screen. Examples: "Launch readiness" disabled at brief stage and "Customize" disabled in flight with no explanation; "Authorize launch" has no weight for the single most important action. | 2.3 Button |
| 2 | **Unicode glyphs used as icons** (`▧ ◉ ☀ ▴ ⌁ ▥ ↑` for the seven subsystems; `↗ → Ⅱ ▶ ⇥ ◈` inside labels). They render differently per font, are ambiguous (what is `▴`?), and are decorative text to screen readers. | Hangar category list (app.js line 159), play controls, hero buttons. | 2.5 Iconography |
| 3 | **Weak hierarchy on the hero screens.** At 1440x900 the hangar stacks eyebrow -> H1 -> objective strip -> coach strip -> (crew strip) before the three-column game; the 3D stage starts around y=340 and the primary action ("Launch readiness") sits at the bottom of the right column, below the fold. In flight, the decision card plus timeline push the stage below the fold. | Live site, hangar and flight at 900 px height. | 3 (viewport-fit mission control) |
| 4 | **Two parallel UIs for one game.** The nav has "Play mission" plus seven numbered classic pages (Mission brief, Engineering lab, Readiness review, Telemetry detail, Causal debrief, Trade space, Sources). They show the same state in a different layout, so a newcomer cannot tell which is the real game. The `landing()` hero exists but is unreachable by default (`state.page` starts at `'game'`). | Sidebar/nav on all pages. | 3.1 IA merge |
| 5 | **The first screen is a form.** The player lands directly on "Plan your mission" (mode, scenario, difficulty, charter) before any emotional hook or sight of a spacecraft. | Live site first load. | 3 (Quick start) |
| 6 | **Tiny, all-caps, tracked-out labels:** eyebrow 10 px/2 px tracking, brand sub-line 9 px, badges 10 px. Hard to read on a phone in a dark room. | Everywhere. | 2.4 Typography |
| 7 | **Contrast:** `--dim #6c7d8d` on `--panel #111924` computes to about 4.2:1 (AA needs 4.5:1 for small text); on the page background it is about 4.6:1, passing only just. | Meta text, captions, units. | 2.1 tokens |
| 8 | **Gauges are bars with numbers.** No threshold ticks, no preview of the effect of a choice before committing, no arc/segment variants, no emphasis when a value turns critical (only a color class). | Margins rail and live telemetry (`gameMargins`, `gameTelemetry`). | 2.3 Gauge |

### 1.3 Feedback and motion

- **Feedback is a text toast.** One `#toast` element, text swap, 3 s. Installing a part = full re-render + toast "installed. Margins updated." The player has to compare numbers by eye; nothing shows *what changed*. No sound anywhere (`AudioContext` unused), no haptics (`navigator.vibrate` exists on the device and is unused).
- **Motion inventory is thin:** a Chromium-only view-transition crossfade (`swap`), a pointer-tilt on `[data-tilt]` cards, a score count-up, a 3.4 s launch overlay, orbit/scan/float keyframes, and a 30 fps-capped idle drift in the 3D scene. There is no enter/exit choreography, stagger, spring, or shared-element transition. Everything else snaps.
- **Simulation reads as slideshow:** state advances in 1.4 s steps and the UI jumps between them. Smooth interpolation between ticks would make the same data feel alive.
- **Crisis moments are not dramatic:** the crisis card is injected into the world panel and `scrollIntoView` is called. The highest-stakes decision in the game looks like another card.

### 1.4 Onboarding

- Coaching is a text strip with "Next hint / Hide tips" (`coachStrip`), not anchored to the UI element it describes.
- The mission offer overlay is good copy, but the path to the first launch is: board form -> accept -> hangar -> "Launch readiness" -> modal -> "Authorize launch". There is no one-tap "show me" path; the 90-second pitch path exists but is a presentation mode, not an onboarding.
- Bengali coverage is **42 translated strings** (`UI_BN`) against roughly 90 `button()` calls plus all headings and bodies; most of the UI stays English when the toggle is on.

### 1.5 Mobile (375 px)

Measured on the live site after accepting the mission:
- Document height **3,631 px**; the first screen (812 px) holds header, a scrolling nav, the title, two buttons, the objective card and the coach card. **The 3D spacecraft first appears around y=800**, i.e. below the fold. The hero of the game is invisible on first view.
- The 7-item nav is a horizontal scroller with items clipped ("Readiness re...").
- Smallest button height measured: **24 px** (WCAG 2.5.8 minimum; Apple HIG 44 pt, Material 48 dp). Several are used in the thumb zone.
- The three-column game collapses into one very long column: part list, then scene, then telemetry; the Launch button is at the very bottom.
- Drag-and-drop installation uses HTML5 drag events, which are unreliable on touch. The click path works, but the UI text still says "drag a module onto the spacecraft".

### 1.6 Accessibility

Strengths: `aria-current` on nav, global `:focus-visible` ring, reduced-motion preference and toggle, dialog makes the background inert, canvas has a description and keyboard camera controls, hostile-data tests.
Gaps:
- Focus loss on every action (see 1.1).
- No skip link; one `role=status` element for the whole app. Battery critical, recorder full and phase changes are not announced.
- HTML5 drag is not keyboard accessible (the click alternative exists but is not a documented keyboard model: no roving tabindex or arrow keys in the parts list; 58 tab stops on the hangar page).
- Meaning carried by color on gauges and chips in places; contrast items in 1.2.
- Small touch targets (1.5), tiny type (1.2).
- Bengali strings mixed with English labels (1.4), no `lang` switching on the root element when the toggle changes (to verify; the toggle only swaps strings).

### 1.7 What to keep

The engine and its tests; the mission/crew/decision-review/score model; the writing; reduced-motion support; the offline and hash-pinned standalone story; `localStorage` key `trajectiq-v1` and its validation; the CSP and hardening headers.

---

## 2. Design system proposal

Direction: **"mission-control precise"**. Dark, calm, high-contrast, instrument-like. Decisive mechanical motion with slight spring, heavy weight in 3D, quick and light in UI. Keep the brand: deep navy, lime primary, cyan data.

### 2.1 Tokens (CSS custom properties in `src/styles/tokens.css`)

**Color**
| Token | Value | Use |
|---|---|---|
| `--bg-0` / `--bg-1` | `#060a11` / `#080d15` (existing) | void behind stage / page |
| `--surface-1/2/3` | `#0e1620` / `#131d2a` / `#1a2636` | panel / raised / hover |
| `--line-1/2` | `#223041` / `#2f4258` | borders / strong borders |
| `--text-1` | `#f1f4f8` | primary text |
| `--text-2` | `#b6c1ce` | secondary (was `#a1adbb`) |
| `--text-3` | `#8d9bab` | tertiary; computes to about 6.0:1 on `--surface-2` (was `#6c7d8d`, about 4.2:1) |
| `--lime-500/600` | `#ccff6b` / `#b4f03f` | primary action / pressed |
| `--cyan-400` | `#7cdbf3` | data, links, selection |
| `--amber-400` | `#ffbc6e` | warning |
| `--red-400` | `#ff7b83` | failure / critical |
| `--violet-400` | `#b5a8ff` | assistant / copilot |
| Crew role hues | Commander `#ffd166`, Engineer `#7cdbf3`, Science Lead `#c3a6ff`, Power and Comms `#ff9f7a` | always paired with an icon and initial, never color alone |

Semantic aliases (`--ok`, `--warn`, `--bad`, `--info`, `--focus`) point at the above. Glow replaces drop shadow: `--glow-lime: 0 0 0 1px rgb(204 255 107 / .5), 0 0 24px rgb(204 255 107 / .25)`.

**Spacing** (4 px base): 4, 8, 12, 16, 24, 32, 48, 64. **Radius:** 6 (chip), 10 (button, input), 16 (panel), 999 (pill). **Z layers:** stage 0, HUD 10, sheet 30, dialog 40, toast 50, incident 60. **Breakpoints (container-query first):** 480, 760, 1100, 1500. **Density:** `data-density="compact"` under 820 px viewport height (hides captions, tightens gaps) so desktop laptops fit the mission-control screen without scrolling.

### 2.2 Layout primitives
`AppShell` is a `100dvh` grid: header (56 px) + stage layer + HUD layer. Desktop hangar: `minmax(260px,320px) 1fr minmax(280px,340px)` with the 3D stage persisting *behind* all three columns (panels are translucent glass over it). Mobile: stage pinned top 44dvh; parts tray is a bottom sheet with snap points 18/50/88 %; the primary CTA is a sticky thumb-zone bar.

### 2.3 Component set and states

**Button** (`<Button variant size icon loading holdToConfirm>`; a `motion.button`).
| Variant | Look | Use |
|---|---|---|
| Primary | lime fill, dark text | one per screen |
| Secondary | `--surface-3`, `--line-2` border | most actions |
| Ghost | transparent | tertiary, in-panel |
| Danger | red outline, red text | discard |
| Commit | hold-to-confirm: radial/linear fill over 700 ms; keyboard: hold Space/Enter, or press twice ("Press again to confirm") | **Authorize launch**, discard flight |
| Icon-only | 44x44 hit area, tooltip + aria-label | toolbars |

| State | Behaviour |
|---|---|
| Rest | border + inner 1 px highlight |
| Hover (pointer: fine) | lift `y:-1`, brighten, glow, 160 ms |
| Pressed | scale .97 spring (stiffness 700, damping 30), 90 ms; release springs back |
| Focus-visible | 2 px `--focus` ring with 3 px gap (never removed) |
| Loading | spinner replaces icon, width locked, `aria-busy` |
| Disabled | `aria-disabled` (stays focusable); tooltip/inline reason ("Fix 2 failed checks to launch") |
| Success | check morph 600 ms then reset |
Min target 44x44 under `@media (pointer: coarse)`.

**Panel** (`<Panel kicker title badge actions state>`): translucent surface, 1 px line, corner ticks. States: default, selected (cyan edge), locked (hatched overlay + lock chip; used for flight hardware), warning (amber edge), incident (red edge with scan line). Collapsible on mobile.

**PartCard** (the module in the tray): name, one-line note, three delta chips against the installed part (mass, cost, power; colored and signed, e.g. `+12 kg`), installed state, drag handle. Hover or focus **previews** the effect on the gauges (ghost segment) and ghost-places the part on the 3D model.

**Gauge** (`<Gauge kind="linear|arc|segments|margin" value max thresholds preview status>`).
- Anatomy: label (with concept "?" trigger), tabular-number value, unit, track, fill, threshold ticks (battery safe-mode 15 %, recorder warning 75 %), **ghost segment** for previewed delta (striped), status chip (icon + text), optional sparkline.
- States: nominal; warning (amber, 1.6 s slow pulse); critical (red, 0.8 s pulse, announced via live region); preview (ghost visible); locked.
- Motion: value springs (stiffness 120, damping 20, about 420 ms); fill and color transition 160 ms; between simulation ticks the value *interpolates* so gauges move continuously.
- Variants: Linear (mass/cost/science), Arc (battery), Segments (recorder, propellant), Margin (distance from a limit, e.g. 164 of 220 kg with 56 kg margin).

**Chip / Badge:** kinds pass/warn/fail/info/role/mode; always icon + text; sizes sm/md; selectable variant for filters.
**Segmented control** (operations commands, speed 1x/3x/10x, solo/crew/sandbox) with a sliding pill (`layoutId`).
**Slider** with live margin preview while dragging and a numeric field; 44 px thumb on touch.
**Dialog / Sheet:** native `<dialog>` or inert-backed container; focus trap and return-focus handled once in the primitive. Sheet = right drawer on desktop (420 px), bottom sheet with drag-to-dismiss on mobile.
**Toast:** stack of max 3, 4 s, pause on hover/focus, `role=status`.
**Concept trigger:** the existing "?" button becomes `<Concept id>` opening a sheet (content stays in `dist/data/learn.js`).
**LiveRegion:** `useAnnounce()` for telemetry thresholds, phase changes, installs ("Installed Endurance solar kit. Mass 164 of 220 kilograms, 56 kilograms margin.").

### 2.4 Typography
- UI: **Inter Variable**, Latin subset, vendored as a `.woff2` in `src/assets/fonts/` with its OFL licence file (not an npm package, to keep the supply chain short). Mono: **JetBrains Mono** Latin subset for telemetry and codes. Budget: 80 KB total for both; if the subset exceeds it, fall back to `system-ui` plus mono and keep tabular numerals. Bengali falls back to the system font stack (a Bengali webfont would dwarf the rest).
- Scale: 12 / 13 / 14 / 16 / 20 / 28 / 40 / 64 px (fluid `clamp()` for display). Body 14-16, **never below 12 px**; all-caps tracked "kicker" labels 11 px/600/0.08em and only for decoration, never for required information.
- `font-variant-numeric: tabular-nums` on every number so digits do not jitter.
- Standalone file needs `font-src data:` added to its meta CSP if fonts are inlined as data URIs (the hosted CSP already has `font-src 'self'`).

### 2.5 Iconography
Hand-authored inline SVG set (about 30 icons, 24 px grid, 1.75 px stroke, round caps) in one `Icon` component: seven subsystems (bus, payload, power, propulsion, comms, storage, launch), play/pause/step/fast, lock, check, warning, orbit, eclipse, signal, battery, fuel, assistant, sound on/off, vibration, fullscreen, help, share, close. No icon library dependency. All decorative icons `aria-hidden`; icon-only buttons carry labels.

### 2.6 Motion language

Principles: motion explains cause and effect; UI is quick, 3D is weighty; only animate `transform`, `opacity` and (3D) uniforms; everything is interruptible; every animation has a reduced-motion form.

**Duration tokens:** `instant 90 ms` (press) / `fast 160 ms` (hover, color) / `base 240 ms` (enter/exit) / `slow 420 ms` (panels, sheets, gauge tween) / `scene 900 ms` (camera moves) / `cinematic 1.2-1.8 s` (launch, score reveal).
**Easing:** enter `cubic-bezier(.2,0,0,1)`; exit `cubic-bezier(.4,0,1,1)` and 60 % of the enter duration; camera `cubic-bezier(.65,0,.35,1)`.
**Springs (Motion):** `snappy {stiffness:520, damping:34, mass:.9}` (UI), `soft {stiffness:220, damping:26}` (sheets, layout), `snap {stiffness:420, damping:26}` (part seating, about 4 % overshoot), `needle {stiffness:120, damping:20}` (gauges).

| What | Behaviour |
|---|---|
| Screens (Board -> Hangar -> Flight -> Report) | `AnimatePresence mode="wait"`; panels enter 16 px up + fade, staggered 40 ms (max 6). The **3D stage never unmounts**; the camera glides to the next preset (900 ms). |
| Sheets / dialogs / toast | Sheet: slide 420 ms soft spring + scrim fade 200 ms. Dialog: scale .96 -> 1 + fade 200 ms. Toast: rise + fade 240 ms. |
| Lists | `layout` reorder 320 ms; keys are stable ids. |
| Part install | Card press 90 ms -> ghost flies from the tray rectangle to the socket's projected screen position (520 ms `snap` spring) -> seat with overshoot -> socket flash 180 ms + dust puff 300 ms -> ghost gauges solidify 420 ms. Shared element via measured rects (not `layoutId`, because the target is in WebGL). |
| Scenario card -> hangar title | `layoutId` shared-element transition. |
| Crisis | Vignette in 240 ms; stage desaturates and time visibly stops; incident card rises from the timeline marker (`layoutId`); decision buttons are Commit-style. |
| Go/No-Go | One console per role, sequential 450 ms apart; "GO" stamp scales 1.4 -> 1 with 12 degree rotation in 180 ms; NO-GO shakes once. |
| Launch | 3-2-1 numerals 1 s each, camera dolly, shake decaying over 1.2 s; always skippable (Esc / tap); first launch about 9 s, repeat launches about 4 s. |
| Score | Ring fills 1.2 s, five category bars fill in sequence (150 ms stagger), grade stamps last. |
| Numbers | Count tween 600 ms on report; telemetry uses the needle spring. |

**Reduced motion** (system preference **or** the existing in-app toggle, same source of truth: `MotionConfig reducedMotion="always"` when either is set): no springs, overshoot, stagger, parallax, idle drift, camera shake, particles or shared-element flights; state changes become <=120 ms opacity cross-fades; count-ups show the final value; the launch becomes a 2 s fade with the word "Liftoff"; the 3D `frameloop` switches to `demand`; sound and the live region are unaffected. Also pause every rAF loop when `document.hidden`.

**Performance guard rails:** DPR capped at `[1, 1.5]` on phones; no shadows or post-processing in v1 (glow via emissive materials and additive sprites); quality tier chosen from `hardwareConcurrency` and a 1 s FPS sample; one WebGL context only.

---

## 3. Interaction ideas, ranked

IA change that enables most of them: collapse the eight-item nav into **four screens plus sheets**.
`Board` (mode, scenario, difficulty, charter, quick start) -> `Hangar` -> `Flight` (mission control) -> `Report` (score, decision review, causal chain, compare, share, trade space). Sheets: Assistant, Help, Sources and method, Engineering lab (customize), NASA data, Run history, Menu. The old pages map in as follows: brief -> Board charter; architect -> Engineering-lab sheet in the hangar; readiness -> the pre-launch Go/No-Go sheet; control -> Flight drawer; debrief and trade -> Report tabs; sources -> sheet.

**"Three taps to launch":** Board has a **Quick launch** button that accepts the mission with the Balanced build prefilled and goes to the launch sheet. Show the consequence first, teach after.

Effort is developer-days on this stack (one developer who knows it). Score = impact / effort.

| Rank | Idea | What the player experiences | Build notes (all client-side, no new data) | Impact (1-5) | Effort (d) | Score | Tier |
|---|---|---|---|---|---|---|---|
| 1 | **Incident takeover** | Crisis dims and desaturates the stage, alarm tone, card rises from the timeline marker, hold-to-commit choices with direction arrows | Presentational wrapper around existing `crisis` state and `crisisDirections`; Commit button | 4 | 1 | 4.0 | P0 |
| 2 | **Score reveal sequence** | Ring fills, five bars fill in order, grade stamps, then decision review slides in | Motion variants over `missionScore` output | 4 | 1 | 4.0 | P0 |
| 3 | **Predictive ghost gauges** | Hover/focus a part (or drag a slider) and the gauges show a striped ghost of the new mass, cost, power, maneuver margin before you commit | `calculate()` on a cloned design per hover, memoized; pure engine | 5 | 1.5 | 3.3 | P0 |
| 4 | **Mission patch share card** | One tap makes a PNG patch (spacecraft, scenario, grade, score, code) | Offscreen `<canvas>` -> `toBlob` -> download; no network | 3 | 1 | 3.0 | P2 |
| 5 | **Button/press/hover system + motion tokens** | Everything feels physical; disabled buttons explain themselves | Section 2 components | 4 | 1.5 | 2.7 | P0 |
| 6 | **Go/No-Go roll call** | Crew: each role's console lights up in sequence with a GO/NO-GO stamp; solo: subsystem checks tick down like a launch director's poll | Restyle of `uiGoNoGo` data (`roleVerdicts`, `signoffAllowed`) | 4 | 1.5 | 2.7 | P0 (crew gate needs it) |
| 7 | **Sound and haptics** | Tick, clunk on seat, warning chirp, GO chime, launch rumble; short vibration patterns on Android | WebAudio synth, zero asset files; `navigator.vibrate` feature-detected (not available on iOS Safari); default **off** with a one-tap "Add sound" nudge in the hangar | 4 | 1.5 | 2.7 | P1 |
| 8 | **Guided spotlight onboarding** | A dimmed overlay cuts a hole around the real element for each of 4 steps; progress dots; skippable | Replaces `coachStrip`; step list from existing copy (add Bengali) | 4 | 1.5 | 2.7 | P0 |
| 9 | **Engine-linked 3D storytelling** | Solar wings track the Sun, dish tracks Earth during a contact window, eclipse cone sweeps across the orbit, safe mode dims the craft | Props from `run.eclipse/contact/safe/mode`; geometry only | 4 | 1.5 | 2.7 | P0 |
| 10 | **Mobile bottom-sheet hangar** | Stage on top, parts tray as a draggable sheet, sticky thumb-zone Launch | Motion drag + snap points; CSS `dvh` | 5 | 2 | 2.5 | P0 |
| 11 | **Snap-fit 3D builder** | Drag (or click/Enter) a part: a ghost follows, the matching socket glows, the part seats with overshoot, dust and a clunk | r3f socket meshes + raycast hover; keyboard path = Enter on a PartCard | 5 | 3 | 1.7 | P0 |
| 12 | **Viewport-fit mission control** | Flight fits one screen: stage center, resource flow left, gauges right, command deck + timeline bottom; no page scroll | Grid layout using DS panels | 5 | 3 | 1.7 | P0 |
| 13 | **Live resource-flow diagram** | Sun -> array -> battery -> payload/bus/transmitter -> recorder -> downlink as animated flows; width/speed follow watts and MB/s; red where starved | SVG + Motion; derive loads from `calculate()` constants and `run.mode`/`history[].mode`, in UI code (engine unchanged) | 5 | 2.5 | 2.0 | P1 |
| 14 | **Cinematic launch** | Countdown, camera dolly, exhaust particles, staging flash, hand-off to orbit | r3f camera rig + `Points`; reuses the existing countdown timing | 4 | 2 | 2.0 | P1 |
| 15 | **Orbit timeline scrubber** | Drag through the 240-minute campaign: eclipse and contact bands, battery curve; the 3D craft follows the playhead and a tooltip explains each event | Reads `run.history` (minute, battery %, eclipse, contact, mode) and `run.logs`; read-only past, no engine change | 4 | 2.5 | 1.6 | P1 |
| 16 | **X-ray / exploded view toggle** | Parts separate along axes with labels | Offsets on the same part groups | 3 | 0.5 | 6.0 | P1 (cheap) |
| 17 | **Command palette (Ctrl/Cmd-K)** | Jump to any screen/action | Small component | 2 | 1 | 2.0 | P2 |

Tier meaning: **P0** must ship; **P1** ship if the Gate G1 and Day-6 checks are green; **P2** only with spare time. The recommended build order inside P0 is 5 -> 3 -> 11 -> 12 -> 10 -> 9 -> 8 -> 1 -> 2 -> 6.

3D content rules (richer 3D without assets): procedural geometry only (boxes, cylinders, lathe, spheres) so there is no model download, no CDN and no licence risk; Moon/Mars as noise shaders (port the idea in `space3d.js` FRAGMENT); selected part = emissive pulse + outline; stars as one `Points` object; **never** use drei helpers that fetch remotely by default (`Environment preset`, `useGLTF` with the default Draco decoder path, `Text`/`Text3D` fonts, `useTexture` URLs). `WebGL2` is required by three 0.187; where unavailable, show the existing SVG `scene.js` fallback.

---

## 4. Stack decision (with evidence)

Versions verified on npm on **2026-11-04 ~19:45 UTC** (machine clock; session date 2026-11-05), `npm view <pkg> version`, `dist-tags`, `peerDependencies`, `engines`:

| Package | Version | Notes |
|---|---|---|
| react / react-dom | **19.3.1** (`latest`, published 2026-10-31) | |
| vite | **8.3.5** (`latest`; `previous` tag = 6.4.5) | Rolldown-based; engines `node ^20.19 || >=22.12` |
| @vitejs/plugin-react | **6.2.1** | peer `vite ^8` |
| motion | **14.9.1** (`motion` and `framer-motion` are both 14.9.1) | import from `motion/react`; peer react 18/19 |
| three | **0.187.0** | |
| @react-three/fiber | **9.8.2** | peer `react >=19 <19.4`, `three >=0.156` |
| @react-three/drei | **10.7.9** | peer react ^19, fiber ^9 |
| zustand | **5.0.16** | |
| vitest | **5.1.0** | peer `vite ^6.4 || ^7 || ^8`; engines `node ^22.12 || ^24 || >=26` |
| jsdom | **30.1.3** | alternative happy-dom 21.0.4 not chosen |
| @testing-library/react / dom / user-event | **16.3.3 / 10.4.2 / 14.6.8** | |
| @playwright/test | **1.64.1** | |
| @axe-core/playwright / axe-core | **4.14.0** | |
| next (evaluated, rejected) | **16.4.5** | |
| typescript (not adopted) | 7.0.2 | engine is plain JS and nine days is too short to type the UI |
| Not chosen | gsap 3.15.1 (license/size for no gain over Motion), @react-spring/web 10.1.2, tone 15.1.22 (heavy; WebAudio synth is enough), howler 2.2.4 (last release 2023) | |

Pin every version exactly (`.npmrc`: `save-exact=true`). Note react 19.3.1 sits inside the fiber peer range (`<19.4`); do not bump React minors without re-checking it.

### 4.1 Constraint-by-constraint comparison

| Constraint | (a) Next.js 16.4.5 static export | (b) Vite 8 + React 19 | (c) Stay vanilla |
|---|---|---|---|
| **Vercel deploy from main with `npm run build && npm test`** | Works (`output: 'export'` -> `out/`). | Works; set `outputDirectory` to `site`; `buildCommand` unchanged. | Works today. |
| **Strict CSP `script-src 'self'`, no inline scripts** | **Fails (measured).** A one-button hello-world export contains 3 inline scripts: `(self.__next_f=self.__next_f\|\|[]).push([0])`, a `self.__next_f.push([1,"..."])` flight payload, and an `<script id="_R_">`. With `experimental.sri: {algorithm:'sha256'}` the external files gained `integrity=` but **the 3 inline scripts were still there**. Next's CSP guide (lastUpdated 2026-03-20) says nonces require dynamic rendering because static pages are built with no request headers to take a nonce from; SRI is "experimental", build-time only. Escape hatches all cost the security posture or the architecture: per-build script hashes in headers (the flight payload changes every build and `vercel.json` headers are static), `'unsafe-inline'` (violates the repo's own `v6-security` test), or dynamic rendering on Vercel functions (breaks static, offline-first). | **Passes (measured).** `site/index.html` is `<script type="module" crossorigin src="./assets/index-*.js">` with no inline script. | Passes. |
| **Single-file offline build that pins its script by hash** | No supported path: Next emits many chunks, a bootstrap runtime and inline flight data; you would reverse-engineer and inline all of it. | **Works (measured).** With `build.rolldownOptions.output.codeSplitting:false` the whole app incl. three/r3f/drei subset became one chunk (1,302,490 B raw, 366 KB gz). I inlined it in `<script type="module">`, computed SHA-256, wrote `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-...'; style-src 'unsafe-inline'; img-src data:">` (the same shape as `scripts/build-standalone.mjs`), served it and loaded it in Chromium: React, Motion and an r3f `<Canvas>` rendered with **no console errors**. | Works (today). |
| **Offline-first service worker** | No SW support; must be hand-rolled around hashed `_next` files. | Hand-rolled SW generated at build time from the bundle manifest (about 30 lines; keep the current network-first-with-cache-fallback logic and the no `skipWaiting` rule). Hashed file names make this *more* reliable than today's fixed list. No Workbox needed. | Existing `sw.js`. |
| **Bundle size on phones** (gzip, measured) | **135 KB** of script for hello-world (49.9 + 71.8 + 6.0 + 3.9 + 3.5 + 0.3) before any app code; plus a 39.5 KB `nomodule` polyfill that modern browsers skip. | React DOM alone **68.6 KB**; + zustand + Motion `LazyMotion` (`domAnimation`) **98.2 KB**; with the full `motion` component and `AnimatePresence` **115.2 KB**. Lazy 3D chunk (three + r3f + drei `OrbitControls`, `Stars`, `ContactShadows`): **248.7 KB** gz. (three + r3f adds about 242 KB gz over React DOM; plain `three` imperatively, no React, is 130.5 KB; drei `Float`+`Line`+`Html`+`OrbitControls` add about 13 KB gz over r3f alone.) | Current whole game: **126 KB gz** (HTML), 110.6 KB JS + 15.6 KB CSS. |
| **Pure engine reusable unchanged** | Yes (ESM). | Yes: `resolve.alias` to `dist/engine`, `dist/data`; files untouched. | n/a |
| **Testability** | Vitest works, but server/client boundary and `'use client'` add noise for no benefit. | Vitest shares the Vite config; RTL tests real DOM events, focus and a11y roles; store testable without React. | Fake-DOM string tests (today). |
| **What the framework adds that this game needs** | Routing, SSR, image optimisation, API routes: **none needed**, the game is a client-only static app. | Component model, state subscriptions, ecosystem (Motion, r3f). | A hand-rolled view layer. |

**Recommendation: (b) Vite + React.** It is the only option that meets every hard constraint without weakening the CSP, the offline file or the hash pin, and it gives the component model, motion library and declarative 3D the owner asked for.

**Why not (c) vanilla.** The audit's root cause (full re-render) can only be fixed in vanilla by writing a diffing renderer, and a team of parallel developers cannot safely share a 131 KB single-file string template. (c) remains the fallback: **Plan B** in section 6.3.

### 4.2 Secondary choices

- **zustand over Redux/Context/Jotai:** the game state is one object with imperative sequences (clock, flight lock, checkpoint, crew round). A store with selectors lets the telemetry panel re-render on a tick while the hangar tree does not, is testable without React (`useGame.getState().actions.launch()`), and weighs about 1 KB. Store action names equal today's `actions` keys (`launch`, `game-accept`, `preset-fragile`...) so tests port mechanically.
- **r3f vs plain three:** r3f costs about 110 KB gz more than plain `three` (measured 311 vs 130 incl./excl. React DOM). I still recommend r3f because the scene is a function of state (design, run, selected part), parts mount/unmount declaratively, and several developers will touch 3D at once. It is lazy-loaded after the first interactive paint, so the cost does not delay the UI. If the Gate G1 mobile test shows the chunk is too heavy, the fallback is the existing SVG scene, not a rewrite to raw three.
- **No `@react-three/postprocessing`, no GLB assets, no troika text:** weight, CDN defaults, CSP.
- **JSX not TypeScript:** engine is JS; types would slow nine days. Use JSDoc on the store and DS props.
- **CSS Modules + tokens:** zero dependencies, per-feature stylesheet ownership (no merge conflicts), no runtime.
- **Routing:** none. Screen is store state; `history.pushState` entries make the browser Back button work; `#code` share links keep using the existing `applyHash` logic.

### 4.3 How the build fits the current deploy

```
package.json scripts
  dev       vite
  build     node scripts/build.mjs        # vite build -> site/, emit sw.js with precache list,
                                          # standalone build (codeSplitting:false) -> inline + SHA-256
                                          # -> writes dist/TRAJECTIQ_Play.html and site/TRAJECTIQ_Play.html
  test      node --test tests/*.test.mjs && vitest run
  e2e       playwright test               # CI/local only
vercel.json  framework null; buildCommand "npm run build && npm test" (unchanged);
             outputDirectory "site"; installCommand "npm ci --ignore-scripts";
             all current headers and the CSP string unchanged.
engines      node >=22.12
```
Notes: (1) `site/` is generated and gitignored; `dist/` keeps only `engine/`, `data/`, the committed standalone file and (until cutover) the legacy UI. (2) The current CI step `git diff --exit-code dist/TRAJECTIQ_Play.html` assumes a byte-stable generator; two builds on one machine/path produced identical hashes in my test, but cross-OS and cross-path stability was **not** tested, so CI (Linux) becomes the producer of the committed file at release and the unit test verifies internal consistency (hash matches script) instead of byte equality with a Windows build. (3) Cache: add `Cache-Control: public, max-age=31536000, immutable` for `/assets/*` (hashed names); confirm header precedence on a preview deploy because the existing global rule sets `max-age=0`.

---

## 5. Migration plan

### 5.1 Strategy
Strangler by whole app on a branch (`ux-v7`), Vercel preview per push; `main` stays on the current game until cutover. Engine and data files do not move. All new code lives under `src/`, tests under `tests-ui/` and `e2e/`. Legacy UI (`dist/ui/*`, `dist/index.html`, `dist/styles.css`, `dist/sw.js`) stays untouched until WP12 so legacy tests keep passing during development.

**Rules of engagement.** A PR may only touch files under its package's owned paths plus its own tests. Shared files (`vite.config.js`, `package.json`, `vercel.json`, `src/App.jsx`, `src/store/*`, `src/ds/*`) are edited only by their owner; others request changes by PR comment. Feature packages export a single `index.js` entry; the shell and the sheet registry import only those entries (so adding a screen never edits shared code). Action names, props and fixtures are **contract-first**: WP1 and WP2 publish stubs by end of Day 0, everyone else builds against stubs and fixtures.

### 5.2 Contracts (frozen at end of Fri 2026-11-06 12:00)

- **Store** (`src/store/index.js`, WP1): `useGame(selector)`; `useGame.getState()`; same state shape as `app.js` (`page`->`screen`, `design`, `team`, `board`, `compare`, `run`, `runs`, `playing`, `speed`, `pitch`, `robust`, `prefs`, `game`), with `localStorage` key `trajectiq-v1` and the same on-disk schema. Actions keep today's names: `game-accept`, `game-review`, `game-launch`, `launch`, `play`, `step`, `fast`, `speed-N`, `preset-*`, `install(kind,id)`, `setField`, `resolve(actionId)`, `command(mode)`, `export`, `redesign`, `game-redesign`, `game-fix`/`confirm-power-fix`, `compare-run`, `import-design`, `discard-*`, `resume-checkpoint`, crew actions (`setPlayers`, `suggest`, `crewVote`, `crewSignoff`, ...). Selectors: `selectAnalysis` (memoized `calculate`), `selectMargins`, `selectTelemetry`, `selectCrisis`, `selectScore`, `selectReview`.
- **Design-system exports** (`src/ds/index.js`, WP2): `Button, Panel, PartCard, Gauge, Chip, Segmented, Slider, Dialog, Sheet, Toast, Icon, Concept, LiveRegion, useAnnounce, motion` presets, `tokens.css`.
- **Stage** (WP6): `<Stage3D design selected hoverPart run phase quality reduced onPick onSocketHover />` plus an imperative ref `{seatPart(kind,id,fromRect), cameraTo(preset), launchSequence(skip)}`; falls back to `<SceneFallback/>`.
- **FX** (WP3): `fx.play('tick'|'seat'|'warn'|'go'|'nogo'|'launch'|'success')`, `fx.haptic(pattern)`, `useFx()`; respects `prefs.sound` and `prefs.haptics`.
- **Sheets** (`src/sheets/registry.js`, WP1): `openSheet(id, props)`; ids owned by WP10 (`assistant`, `help`, `sources`, `lab`, `nasa`, `history`, `quiz`, `concept`), WP8 (`crew-setup`, `rollcall`), WP4 (`menu`).

### 5.3 Work packages (file ownership, order, acceptance)

Order shows dependency. "Dev-days" = one developer.

| WP | Owner paths (exclusive) | Depends on | Dev-days | Window |
|---|---|---|---|---|
| **WP0 Foundation and build** | `package.json`, `package-lock.json`, `.npmrc`, `vite.config.js`, `vite.standalone.config.js`, `vitest.config.js`, `playwright.config.js`, `vercel.json`, `index.html`, `scripts/*`, `src/main.jsx`, `src/sw/*`, `.github/workflows/*`, `.gitignore` (add `site/`), `.claude/launch.json`, `START_GAME.bat` | none | 1 | Thu 11-05 |
| **WP1 Store, shell, i18n** | `src/store/**`, `src/App.jsx`, `src/shell/**`, `src/i18n/**`, `src/sheets/registry.js`, `tests-ui/store/**` | WP0 | 2.5 | Thu-Sat |
| **WP2 Design system and motion** | `src/ds/**`, `src/motion/**`, `src/styles/**`, `src/assets/**`, `tests-ui/ds/**`, dev-only `kit.html` gallery | WP0 | 3 | Thu-Sat |
| **WP3 FX (sound, haptics)** | `src/fx/**`, `tests-ui/fx/**` | WP1 prefs | 1.5 | Fri-Sun |
| **WP4 Board and landing** | `src/features/board/**`, `tests-ui/board/**` | WP1, WP2 | 2 | Fri-Sat |
| **WP5 Hangar UI** | `src/features/hangar/**`, `tests-ui/hangar/**` | WP1, WP2 (WP6 props) | 4 | Fri-Mon |
| **WP6 3D stage** | `src/features/stage/**`, `tests-ui/stage/**` | WP0 (fixtures only; then WP1 types) | 6 | Thu-Tue |
| **WP7 Flight / mission control** | `src/features/flight/**`, `tests-ui/flight/**` | WP1, WP2, WP6 props | 5 | Sat-Tue |
| **WP8 Crew mode** | `src/features/crew/**`, `tests-ui/crew/**` | WP1, WP2 | 3 | Sat-Mon |
| **WP9 Report** | `src/features/report/**`, `tests-ui/report/**` | WP1, WP2 | 4 | Sat-Tue |
| **WP10 Sheets** (assistant, concepts, quiz, help, sources, NASA data, lab, history) | `src/features/sheets/**`, `tests-ui/sheets/**` | WP1, WP2 | 4 | Sat-Tue |
| **WP11 QA, a11y, perf, security** | `e2e/**`, `tests/v7-*.test.mjs` (new node tests only), `scripts/serve-with-headers.mjs` | WP0 | 3 (spread) | Thu-Wed |
| **WP12 Cutover and release** | legacy move, README/DEMO edits, SW cache version, release checklist | all | 1 | Thu 11-12 |

Staffing: if you have 6 developers: A=WP0+WP1, B=WP2+WP3, C=WP6, D=WP5+WP4, E=WP7+WP8, F=WP9+WP10 (WP11 shared; one person owns the e2e harness). With fewer people, build in the order WP0, WP1, WP2, WP6 spike, WP5, WP7, WP9, then the rest.

**Acceptance criteria**

- **WP0**
  - `npm ci --ignore-scripts && npm run build && npm test` is green on Linux (CI) and Windows, with a "hello shell" app.
  - `site/index.html` contains **no inline `<script>`** and no `on*=` attributes (asserted by a node test).
  - The standalone file is one inline module script whose SHA-256 matches its meta CSP; it opens from `file://` and renders the shell.
  - `site/sw.js` precaches every emitted asset and satisfies the (updated) `v5-offline` tests: no `skipWaiting`/`clients.claim`, old `trajectiq-*` caches deleted, network-first, honest 503, ignores cross-origin.
  - All existing engine tests still pass untouched.
  - `vercel.json` headers/CSP strings unchanged. A preview deployment serves with the CSP and shows zero violations.
- **WP1**
  - Every legacy `actions` key has a store action of the same name.
  - A saved `trajectiq-v1` blob and a checkpoint produced by the *current live app* (exported on Day 0 into `tests-ui/fixtures/legacy-saves/`) load, resume paused, and re-save with identical shape.
  - Ported validators (`validSavedRun`, `loadTeam`, `validCheckpoint`, `validBoardEntry`) reject hostile and damaged data exactly as today (damaged raw JSON is preserved until explicit discard).
  - Flight lock (`draftGuard`, `discardThen`), crew `ownerGuard` and `canEdit` behave identically.
  - A golden replay (the `ui-smoke` and `game-flow` sequences driven through the store) matches `runToEnd` outcomes bit for bit.
  - Simulation clock: same cadence as today; pauses on crisis, modal, hidden tab.
- **WP2**
  - Kit gallery shows every component in every state at both widths.
  - Keyboard operable, correct roles/names, focus ring visible, 44 px targets on coarse pointers, contrast >= 4.5:1 for text.
  - Reduced-motion variants verified in tests (`MotionConfig` wrapper); no component animates anything except transform/opacity.
  - Fonts load from `'self'` with `font-display: swap`; total font payload <= 80 KB or fallback chosen.
- **WP3** `fx` is silent until a user gesture and until enabled; unit-tested for pattern timing; no network, no audio files; works when `AudioContext`/`vibrate` are missing.
- **WP4** Board shows mode, scenario cards (all four scenarios), difficulty, charter, crew setup (1-4 players, names, roles), **Quick launch**, demo/pitch mode entry; layout transition from card to hangar title; Bengali strings for every label.
- **WP5**
  - Parts tray per category with delta chips; hover/focus ghost preview on gauges; click, Enter and drag/touch all install; crew non-owners create a *suggestion* instead of installing (as today).
  - Fuel, altitude, inclination, destination, orbit options, presets, margins (mass, cost, schedule, maneuver, power, data) with "?" concept triggers.
  - Spotlight onboarding; mobile bottom-sheet layout; focus never lost after an install (tested).
  - Hardware controls disabled with an explanation during flight.
- **WP6**
  - Procedural spacecraft for every catalog variant; seat animation with overshoot; socket glow; exploded view; selected-part pulse; orbit view with eclipse cone, Sun/Earth tracking, safe-mode dimming; launch rig that is skippable.
  - Lazy chunk <= 300 KB gz; mounts once and survives screen changes; `webglcontextlost` restores or falls back; disposes every GPU resource on unmount (port the intent of the old dispose tests); 30+ fps on a mid-range Android profile at DPR 1.5; WebGL2 missing -> SVG fallback with the same selection API.
  - Pauses rendering when hidden; `frameloop="demand"` under reduced motion.
- **WP7**
  - One-screen layout at 1280x720 and 1440x900 without page scroll (compact density kicks in); phone layout with stage top and gauge strip.
  - Telemetry gauges (battery, recorder, science, fuel, lost data, safe mode, link) with needle springs; phase ribbon; clock controls (play/pause/step/next event, 1x/3x/10x); operation commands with locks (disabled until operations phase, no crisis).
  - Crisis takeover with direction-only previews, one forecast per mission, explained link, recorder warning; choices Commit-style; commands unlock afterwards; crew version delegates to WP8's `<CrewVote/>` slot.
  - Resource-flow diagram and timeline scrubber if P1 is on (else simple history sparkline from `sparkline`).
  - Checkpoint written on every state change as today; reload returns paused with a pending decision.
- **WP8** Roles own subsystems; suggestions negotiated (accept/decline); sign-off per role; Go/No-Go roll call with each role's lens; crisis advice per role, votes, Commander breaks ties; pass-the-controls handoff animation; all via the existing `crew.js` functions.
- **WP9** Score reveal (all five categories, crew collaboration only in crew mode); decision review replay; causal-chain cards; redesign evidence/comparison with the previous run; share code create/copy/import with hostile-code rejection; local leaderboard (<=30 entries); trade-space plot; uncertainty/robustness job (batched, cancellable); run history with load/clear; printable/downloadable report; power+comms fix preview and confirmation.
- **WP10** Assistant chat (questions, beginner/engineer levels, read-only preview then Apply, stale proposals cannot overwrite a newer design, experiments, one-forecast provenance), concept cards, learning quiz, help, sources and method, NASA data panel + CSV export, engineering lab (customize), language toggle.
- **WP11** Section 6.2 and 6.4 plans; budgets enforced in CI.
- **WP12** Cutover checklist in section 7.

### 5.4 Preserving existing behaviour (parity matrix)

| Behaviour | Source of truth today | New home | How it is proven |
|---|---|---|---|
| Engine, scoring, review, crew, share, assistant, copilot | `dist/engine/*`, `dist/data/*` | unchanged files | the existing `node --test` suites, untouched |
| Save and restore (`trajectiq-v1`), damaged-save protection | app.js `persist`, `validSavedRun`, `loadTeam`, `validBoardEntry`, rejected-save modal | WP1 `src/store/persist.js` + validators, verbatim logic | legacy-save fixtures; `v5-flight-guards` "malformed raw JSON is preserved" ported to Vitest |
| Checkpoint and resume (paused, pending decision) | `validCheckpoint`, `restoreCheckpoint` | WP1 + WP7 resume sheet | `v5-flight-guards` "validated checkpoint returns paused" ported; e2e reload mid-flight |
| Flight lock, discard flow | `draftGuard`, `discardThen` | WP1 actions | ported `v5-flight-guards` "active flight cannot mutate" |
| Crew mode (roles, suggestions, sign-off, ownerGuard) | app.js crew block + `crew.js` | WP8 + WP1 | `v6-ui` "Crew mode" ported to RTL |
| Crisis voting and advice | `crewVoteBlock`, `crisisAdvice`, `tallyVotes` | WP7/WP8 | `v6-ui` "crisis shows direction-only previews..." ported |
| Decision review | `reviewDecisions`, `uiDecisionReview` | WP9 | `v6-ui` "finishing shows a Mission Score, a replayed decision review" ported |
| Score | `missionScore`, `uiScorePanel` | WP9 | same test; engine tests |
| Share codes and compare/import | `encodeDesign/decodeDesign/verifyDesign`, `applyHash`, `compareRun`, `importDesign` | WP9 | `v6-ui` "Sharing" ported; hostile code rejected |
| Assistant, copilot, experiments | `assistant.js`, `copilot.js`, `askAssistant`, `applyAssistant` | WP10 | `copilot-interface` three tests ported |
| Concept cards | `learn.js`, `uiLearnButton`, `uiLearnHTML` | WP2 `<Concept>` + WP10 sheet | `v6-ui` "Concept cards" ported |
| Mission board, scenarios, difficulty, sandbox | `boardScreen`, `scenarios.js` | WP4 | `v6-ui` "Mission board" ported |
| Robustness/uncertainty job | `startRobustness`, `cancelRobustness` | WP9 + WP1 job action | `v5-flight-guards` "uncertainty batches yield, reject duplicates, cancel safely" ported |
| Pitch/demo path | `pitchBanner`, `preset-fragile`, `preset-resilient` | WP4 (menu) + WP1 | smoke e2e |
| Bengali | `UI_BN` | WP1 i18n (dictionary extended) | key-coverage test for the primary path |
| Reduced motion | `prefs.reducedMotion` | WP2 `MotionConfig` + `body.reduced-motion` | DS test; stage test |
| Offline and standalone | `sw.js`, `build-standalone.mjs` | WP0 | `v5-offline`, `standalone`, `v6-security` updated |
| Hostile persisted data renders as text | `v6-security` last test, `v5-flight-guards`, `v3-regressions` | React default escaping; `dangerouslySetInnerHTML` banned in `src/` (node test) | ported hostile-data render test over every screen |

### 5.5 Test plan

**Layer 1: engine and data (unchanged, `node --test tests/*.test.mjs`).** These tests (engine, copilot, assistant accuracy, physics, v6-engine, v3-regressions' engine parts) import `../dist/engine/*` and `../dist/data/*`; none of those paths change. This suite is the contract that proves "pure engine reused unchanged". Keep running it first in `npm test`.

**Layer 2: UI-bound legacy tests (retire consciously).** Ten files import `dist/ui/*` or `app.js` through a fake DOM. During development they keep running against the legacy UI. At cutover (WP12) they move to `tests/legacy/` (not matched by `tests/*.test.mjs`) and are replaced as follows.

| Legacy test | Replaced by |
|---|---|
| `ui-smoke.test.mjs`, `game-flow.test.mjs` | `tests-ui/store/golden-replay.test.js` (store-level, deterministic) + `e2e/smoke.spec.js` (browser) |
| `v6-ui.test.mjs` (9 tests) | RTL component tests in `tests-ui/{board,crew,flight,report,sheets}/` |
| `v5-flight-guards.test.mjs` (12) | `tests-ui/store/flight-guards.test.js` (+ hangar/flight component tests for disabled states and dialog focus restore) |
| `v3-interface.test.mjs`, `copilot-interface.test.mjs` | `tests-ui/sheets/*.test.jsx` |
| `v5-rendering-accessibility.test.mjs` | geometry/orbit math moved to `src/features/stage/orbit.js` with unit tests; fallback/context-loss/dispose contracts re-tested around `Stage3D`; the two static-CSS responsive tests become Playwright viewport assertions |
| `scene3d.test.mjs` | `tests-ui/stage/orbit.test.js` (camera/orbit math) |
| `v5-offline.test.mjs` | same assertions against generated `site/sw.js` (or its template) |
| `standalone.test.mjs` | updated: asserts one inline module script, no imports/exports, hash matches CSP, key UI marker strings present (names are minified, so `function calculate` markers become string markers) |
| `v6-security.test.mjs` | updated per section 5.6 |

Keep the old `dist/ui/space3d.js` pure helpers (`orbitPosition`, matrices) as the reference until `orbit.js` is ported with the same test values.

**Layer 3: component and store tests (Vitest 5.1.0, jsdom, Testing Library).**
- `vitest.config.js` includes only `tests-ui/**/*.test.{js,jsx}`; Node-test files are never picked up (and vice versa).
- Store tests need no DOM. Component tests wrap in a provider that sets `MotionConfig reducedMotion="always"` and mocks `@react-three/fiber` (`Canvas` -> div) because jsdom has no WebGL.
- Assert behaviours, not markup: focus remains on the pressed control after install; live-region text on threshold crossing; non-owner crew install produces a suggestion; flight hardware controls are inert; hostile strings render as text.
- A guard test fails the build if `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` appear under `src/`.

**Layer 4: end-to-end smoke (Playwright 1.64.1, Chromium desktop + Chromium 375x812 mobile; add WebKit if time).**
Runs against a tiny server (`scripts/serve-with-headers.mjs`) that serves `site/` with the exact headers and CSP from `vercel.json`, and the test **fails on any `securitypolicyviolation` event or any non-same-origin request**.
Flow: load -> Quick launch path -> back to board -> accept -> install a part and assert a gauge changes -> open pre-launch check -> launch (skip cinematic) -> fast-forward -> resolve a crisis -> report shows score and decision review -> copy share code -> reload mid-flight and resume paused -> `context.setOffline(true)` reload still works -> open `dist/TRAJECTIQ_Play.html` via `file://`, assert it plays. `@axe-core/playwright` on every screen: zero serious or critical violations.
This runs in GitHub Actions (`npx playwright install --with-deps chromium`) and locally with `npm run e2e`. It does **not** run in the Vercel build (no browser download there); `npm test` stays fast and browser-free.

**Budgets enforced by a node test reading `site/`:** initial JS <= 220 KB gz (estimate: React DOM 69 + Motion 17-29 + zustand 1 + engine about 45 + UI about 50, with `assistant.js`, `copilot.js` and `learn.js` lazy-loaded to take about 25 KB off the first load); lazy 3D chunk <= 300 KB gz (PoC: 249); CSS <= 25 KB gz; standalone <= 2.2 MB raw (PoC with 3D and no app code: 1.30 MB). These are estimates to be replaced by real numbers at Gate G1. First-load transfer will be roughly three times today's 126 KB gz; the 3D chunk loads after first paint, the service worker makes repeat visits instant, and the game remains playable on a phone connection.

### 5.6 Security plan

- **CSP unchanged on the hosted site:** `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`. Verified compatible: the Vite output has no inline scripts; React, Motion and three set styles through the CSSOM. Stretch goal (not blocking): drop `'unsafe-inline'` from `style-src` once the e2e CSP listener shows no violations.
- **Standalone file:** same mechanism as today (meta CSP `default-src 'none'`, `script-src 'sha256-<hash of the exact inline script>'`, no `connect-src`), plus `font-src data:` only if fonts are inlined. The `</script` escaping step and CRLF normalisation in `build-standalone.mjs` are carried into the new script.
- **Dependency hygiene:** commit `package-lock.json` (none exists today because there are no dependencies); `.npmrc` with `save-exact=true` and `ignore-scripts=true`; CI and Vercel use `npm ci --ignore-scripts` (verified in the PoC: the only install script in the tree is the optional macOS `fsevents`; the build still works). `npm audit --omit=dev --audit-level=high` in CI; the PoC tree (7 runtime dependencies, 87 packages installed, 113 lockfile entries) reported **0 vulnerabilities on 2026-11-04**. Dependabot weekly; pin GitHub Actions by commit SHA; licence check allow-list (MIT, ISC, BSD, Apache-2.0, MPL-2.0, 0BSD: all that appeared). Runtime deps only: react, react-dom, motion, zustand, three, @react-three/fiber, @react-three/drei. Do not add a dependency without a WP11 review.
- **No runtime network:** the existing banned-pattern test (`eval`, `new Function`, `document.write`, `javascript:`, `importScripts`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `postMessage(`, string timers, `fetch`) is **applied strictly to first-party `src/`** (and the engine). It cannot be applied unchanged to built output: my PoC bundle contains `javascript:` (3 times, React DOM's URL sanitiser text), `postMessage(` (1, React's scheduler `MessageChannel`) and `fetch(` (React plus drei loaders) as vendor code. So for built assets the test becomes: no `eval(`/`new Function(`/`document.write(`, no `XMLHttpRequest`/`WebSocket`/`EventSource`/`sendBeacon`, every `https://` host in the allow-list (react.dev, github.com, docs.pmnd.rs, opencollective.com appear as comments/messages only), and the Playwright run proves zero cross-origin requests.
- **Banned drei/three features:** `Environment` presets, default-path Draco/KTX2/Basis decoders, `Text`/`Text3D` remote fonts, any texture or model URL; enforced by a node test that greps `src/` for the import names.
- **XSS:** React escaping replaces `esc()` discipline; no `dangerouslySetInnerHTML` (guard test). Share codes and persisted data keep their existing validators; hostile-data render test runs on every screen.
- **Headers** (`X-Frame-Options`, COOP/CORP, HSTS, Permissions-Policy, Referrer-Policy) unchanged; the existing header test stays. `vibrate` is not restricted by the current Permissions-Policy.
- **Privacy:** no analytics, no third-party requests, no telemetry; sound and haptics preferences stored locally only.

---

## 6. Risks, schedule and cut list

Today is Thu 2026-11-05; the event is Sat 2026-11-14.

### 6.1 Calendar

| Day | Plan |
|---|---|
| Thu 11-05 (D0) | WP0 complete. WP1/WP2 contracts and stubs. Export legacy save fixtures from the live app. WP6 spike with fixtures. WP11 harness skeleton. |
| Fri 11-06 | WP1 store done; contracts frozen at noon. WP2 core (Button, Panel, Gauge, Chip, Dialog, Toast, Icon). WP4 and WP5 start. |
| Sat 11-07 | WP4 done. WP5 mostly done. WP7, WP8, WP9, WP10 start. WP3 FX. |
| **Sun 11-08** | **Gate G1 (evening): vertical slice** Board -> Hangar (install with gauge preview) -> Launch -> Flight with one crisis -> Report, on the new stack, solo path, parity with the golden replay, on a real phone. Measure bundle sizes. **Go / No-Go to Plan B.** |
| Mon 11-09 | Feature completion: WP7, WP8, WP9, WP10, WP6 launch rig. |
| Tue 11-10 | Integration, motion polish, mobile pass, a11y pass, perf. |
| Wed 11-11 | **Feature freeze 18:00.** Bug bash with legacy fixtures and the e2e suite. |
| Thu 11-12 | **Cutover** (WP12): merge to `main`, verify production, bump SW cache version. Fix-forward only. |
| Fri 11-13 | Submission assets (demo video, DEMO/README edits), P0 bug fixes only. |
| Sat 11-14 | Buffer. No merges after 09:00. |

### 6.2 Risk register

| Risk | Likelihood / impact | Mitigation |
|---|---|---|
| Rewrite does not finish in 9 days (about 80 UI behaviours to port) | High / High | Strangler branch, `main` untouched; Gate G1; Plan B; IA merge removes 4 screens; ruthless cut list; contract-first parallelism. |
| 3D chunk too heavy or slow on phones | Medium / High | Lazy load after first paint; DPR cap and quality tiers; no shadows/post-processing; SVG fallback; budget gate at G1. |
| Library defaults break CSP or offline (CDN fetches, workers) | Medium / High | Banned-import test; Playwright fails on any CSP violation or cross-origin request; standalone loaded from `file://` in CI. |
| New-major toolchain surprises (Vite 8/Rolldown, Vitest 5) | Low-Medium / Medium | Exact pins and lockfile; PoC already built and ran under strict CSP; fallback: Vite `previous` tag 6.4.5 (re-resolve plugin and Vitest peers). |
| Merge conflicts across 6 developers | Medium / Medium | Exclusive path ownership; single-entry `index.js` per feature; registries; contract freeze. |
| Test debt: UI-bound legacy tests cannot be mechanically ported | Medium / Medium | Replacement table (5.5); store actions keep legacy names so ports are mostly mechanical; legacy tests keep running until cutover. |
| Saved-game incompatibility strands judges mid-run | Low / High | Same schema, legacy-save fixtures, damaged-save modal preserved, `trajectiq-v1` key unchanged. |
| Standalone file bigger and non-deterministic across OSes | Medium / Medium | CI produces the committed file; consistency test instead of byte-diff; size budget. |
| Accessibility regressions in custom controls | Medium / Medium | Native elements first; axe in e2e; roving-tabindex tests; live-region tests. |
| Audio autoplay blocked; startling judges | Medium / Low | Default off; start after a gesture; one-tap toggle in the header. |
| WebGL context loss or WebGL2 missing | Medium / Medium | `webglcontextlost` handling, SVG fallback, tested. |
| Team unfamiliar with React/r3f | Medium / Medium | Keep components small, rely on the DS kit and fixtures; pair on WP6/WP5 boundary. |
| Vercel Node version vs Vitest/Vite engines | Low / High | `engines: node >=22.12`, set Node 22.x or 24.x in the Vercel project, CI on 22. |

### 6.3 Plan B (if Gate G1 fails on Sun 11-08)

Abort the React migration, keep the legacy app, and ship the highest-return upgrades that do not need a framework: the design tokens and `@font-face`; real button states (press/hover/focus/loading/hold-to-confirm) in `styles.css`; `focus` restoration after each render (record focused `data-` key before `innerHTML` and refocus after); stop re-rendering the telemetry block (patch only gauge elements in `tick()` so bars can transition); CSS gauge ghost preview via `calculate()` on hover; sound and haptics module (framework-free); incident-takeover and score-reveal CSS animations; mobile layout that puts the 3D stage first with a sticky Launch bar; spotlight onboarding. About 4-5 developer-days and zero build changes. Everything in sections 2.1-2.6 transfers.

### 6.4 What to cut first, in order

1. Mission patch share card, command palette, parallax and photo-mode ideas (P2).
2. Exploded view; extra launch cinematic beyond the existing countdown plus camera dolly.
3. Haptics (Android-only).
4. Orbit timeline scrubber: keep the existing battery sparkline instead.
5. Live resource-flow diagram: keep the gauges.
6. Spring-based part seating: keep a 300 ms eased move plus flash.
7. Bengali coverage beyond the primary path (board, hangar, launch check, flight, report).
8. Secondary sheets as minimal tables with DS styling and no motion (Sources, NASA data, run history).
9. Drei helpers entirely: hand-roll orbit controls with pointer events (about 60 lines) to drop about 5-13 KB gz.
10. Last resort: Plan B.

**Never cut:** save/checkpoint compatibility, crew mode, decision review and score, share codes, offline and standalone with hash pin, the CSP, mobile hangar layout, keyboard and screen-reader basics, reduced motion.

---

## 7. Cutover checklist (WP12)

- [ ] `npm ci --ignore-scripts && npm run build && npm test` green on Linux CI; e2e green on the preview URL.
- [ ] `vercel.json` `outputDirectory: "site"`; CSP string identical to today's; production headers verified with `curl -I`.
- [ ] Legacy UI files moved to `legacy/`; legacy UI tests moved to `tests/legacy/`; old `dist/sw.js` cache names added to the new SW's cleanup list (`trajectiq-6.0.0-ui2` and earlier are removed on activation).
- [ ] `dist/TRAJECTIQ_Play.html` regenerated by CI, opens from `file://`, hash matches meta CSP.
- [ ] A phone (real device) completes board -> launch -> report on mobile data and offline.
- [ ] README, DEMO_AND_SUBMISSION and `.claude/launch.json` updated for `npm run dev`.
- [ ] Rollback: `git revert` the merge commit and redeploy; previous release tagged `v6-stable` before merge.

---

## Appendix: evidence log

Everything below was run on 2026-11-04/05 on the Windows dev machine (Node 24.18.0, npm 11.16.0). The two throw-away projects are in the session scratchpad (`...\scratchpad\next-poc`, `...\scratchpad\vite-poc`) and can be recreated from the package list in section 4.

1. **Next.js 16.4.5 static export** (`output:'export'`, one client button, React 19.3.1): `grep` of `out/index.html` found 3 `<script>` tags without `src`, with bodies `(self.__next_f=self.__next_f||[]).push([0])` and `self.__next_f.push([1,"1:\"$Sreact.fragment\"..."])`, plus `<script id="_R_">`. Script chunks loaded by modern browsers: 49,861 + 71,843 + 3,936 + 3,542 + 266 + 5,981 = 135,429 B gzip. With `experimental: {sri: {algorithm: 'sha256'}}` the external scripts got `integrity="sha256-..."`, but the 3 inline scripts remained.
2. **Next.js CSP guide** (nextjs.org/docs/app/guides/content-security-policy, lastUpdated 2026-03-20): nonces require dynamic rendering; static pages cannot receive a nonce; SRI is experimental, App Router only, build-time only.
3. **Vite 8.3.5 + React 19.3.1 builds** (gzip): bare React DOM 219.47 kB / 68.57 kB; + zustand + `LazyMotion`/`domAnimation`/`m` 303.58 / 98.22; app with full `motion`, `AnimatePresence`, `useReducedMotion`, zustand, lazy r3f scene 359.41 / 115.22 (main) and 939.75 / 248.74 (3D chunk with three 0.187.0, fiber 9.8.2, drei `OrbitControls`+`Stars`+`ContactShadows`); fiber alone (incl. React DOM) 1,138.69 / 310.87; fiber + `OrbitControls` 1,154.49 / 315.34; fiber + `OrbitControls`,`Html`,`Float`,`Line` 1,182.39 / 323.87; plain three imperative 528.04 / 130.48. `index.html` output: one `<script type="module" crossorigin src>` and no inline script.
4. **Banned-pattern scan of the built bundles** with the repo's own regexes: `javascript:` x3, `postMessage(` x1, `fetch(` x1 in the main chunk; `fetch(` x3 in the 3D chunk; no `eval(`, `new Function(`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`.
5. **Single-file build:** `build.rolldownOptions.output.codeSplitting:false` -> one 1,302.49 kB (366.32 kB gz) chunk; inlined with the `</script` escape, SHA-256 computed, meta CSP `default-src 'none'; script-src 'sha256-...'; style-src 'unsafe-inline'; img-src data:`; served from 127.0.0.1 and loaded in Chromium: UI rendered, an r3f `<Canvas>` with `OrbitControls`/`Stars`/`ContactShadows` mounted (`webgl2` context available), console clean.
6. **Reproducibility and hygiene:** two consecutive builds gave the same chunk hash (same path); `npm ci --ignore-scripts` then build succeeded; `npm audit`: 0 vulnerabilities; only install script in the lockfile: `fsevents`.
7. **Live site probes** (https://trajectiq-omega.vercel.app/): hangar 275 DOM nodes; `.btn.primary` computed `transition: background .16s, transform .16s`, `box-shadow: none`; focused `.game-module` button -> click -> `document.activeElement` is `BODY.game-page` and the focused node is detached; 1 `aria-live`/`role=status` region; no `AudioContext` usage; `navigator.vibrate` present but unused; 12 keyframes, 0 `@font-face`; at 375x812 document height 3,631 px, no horizontal overflow, smallest button 24 px.
8. **Repo measurements:** `app.js` 131,304 B, 400 lines, 30 lines over 1,000 chars, longest 4,691; `panels.js` 18.6 KB; `space3d.js` 21.4 KB; `styles.css` 72.8 KB (15.6 KB gz); all UI+engine+data JS 331,084 B (110,644 B gz); `TRAJECTIQ_Play.html` 402,249 B (126,142 B gz); `UI_BN` 42 keys; tests importing UI files: 10 of 17 test files; tests importing only engine/data/catalog paths under `dist/engine` and `dist/data` are unaffected by this plan.
