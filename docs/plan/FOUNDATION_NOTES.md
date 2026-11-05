# Foundation notes (WP0 build, WP1 store/shell/i18n, WP2 design system, WP3 fx)

These are the contracts exactly as implemented on `ux-v7`. Feature engineers can build against this file without reading the foundation code. Section numbers refer to `UX_REDESIGN_PLAN.md`.

## 0. Commands

```
npm ci --ignore-scripts        # install from the lockfile (no lifecycle scripts)
npm run dev                    # Vite dev server  http://127.0.0.1:5173/        (the game)
                               #                  http://127.0.0.1:5173/kit.html (design-system gallery, dev only)
npm run build                  # site/ (hosted) + site/sw.js + site/TRAJECTIQ_Play.html (standalone); legacy dist/TRAJECTIQ_Play.html unchanged
npm test                       # node --test tests/*.test.mjs  &&  vitest run
npm run test:ui                # vitest only          npm run test:node   node tests only
npm run fixtures:legacy        # re-export legacy-save fixtures from the v6 app (committed; rarely needed)
```

Import aliases (Vite and Vitest): `@engine/x.js` = `dist/engine/x.js`, `@data/x.js` = `dist/data/x.js`, `@/x` = `src/x`. The engine and data files are never edited from UI work.

## 1. Layout and ownership

```
index.html, kit.html            entry pages (no inline script, no on*= attributes; asserted by a node test)
src/main.jsx                    init store, bind fx, render <App/>, register the service worker (hosted build only)
src/App.jsx                     renders <AppShell/>
src/shell/                      AppShell, SheetHost, placeholder screens, built-in sheets, feature discovery, hooks   (WP1)
src/store/                      zustand store, validators, selectors, io                                              (WP1)
src/i18n/                       translate(), useT(), Bengali dictionary                                              (WP1)
src/sheets/registry.js          registerSheet / openSheet / closeSheet                                               (WP1)
src/ds/  src/motion/  src/styles/   design system, motion presets, tokens, fonts                                   (WP2)
src/fx/                         WebAudio synth + haptics                                                             (WP3)
src/kit/                        dev-only gallery                                                                     (WP2)
src/features/<name>/index.js    YOUR code goes here (one entry per package)
tests-ui/<area>/*.test.{js,jsx} Vitest + Testing Library
```

## 2. How to add a screen, a sheet, strings (no shared file is edited)

Create `src/features/<name>/index.js`. It is picked up automatically (`import.meta.glob`).

```js
import {HangarScreen} from './HangarScreen.jsx';
import {AssistantSheet} from './AssistantSheet.jsx';
export const screens = {hangar: HangarScreen};          // keys: board | hangar | flight | report (replaces the placeholder)
export const sheets = {assistant: {component: AssistantSheet, variant: 'side', title: 'Mission assistant'}};
export const strings = {bn: {'Mission assistant': 'মিশন সহকারী'}};
```

* **Screen** component takes no props; read the store. Wrap nothing: the shell provides `MotionProvider`, the screen transition (`AnimatePresence mode="wait"`, 16 px up + fade), `<main id="main">`, header, toasts, live region.
* **Sheet** def: `{component, variant: 'dialog' | 'side' | 'bottom' | 'auto', title: string | (props) => string, size?: 'sm'|'md'|'lg', dismissible?: boolean (default true), alert?: boolean (dialog role=alertdialog)}`. The component renders only the body; it receives the props passed to `openSheet` plus `close()`. Title is translated through `t()`. Focus trap, inert background, Escape, return focus are handled by the primitive.
* Open from anywhere: `import {openSheet} from '@/sheets/registry'; openSheet('concept', {topic: 'eclipse'})` or `useGame.getState().actions.openSheet(id, props)`.
* Unregistered ids render a labelled placeholder showing the id and props, so a missing feature is obvious.
* Built-in sheets owned by WP1 (replaceable by registering the same id): `rejected-save {kind:'save'|'checkpoint'}`, `resume {minute}`, `discard-flight`, `import-confirm`, `launch-check`, `power-fix`, `confirm-clear`, `menu`.
* Ids reserved for features (placeholder until registered): WP10 `assistant help sources lab nasa history quiz concept`; WP8 `crew-setup rollcall`; WP4 `menu` (a basic one exists). `concept` receives `{topic}` or `{index: true}`; `history` receives `{kind: 'battery'}` from `game-history`.
* Do not edit `placeholders.jsx`, `AppShell.jsx`, `features.js`, `registry.js`; ask the WP1 owner.

## 3. Store (`@/store`)

```js
import {useGame, selectAnalysis, selectMargins} from '@/store';
const design = useGame(s => s.design);                       // subscribe to a slice
const analysis = useGame(selectAnalysis);                     // memoised calculate()
useGame.getState().actions.install('power', 'compact');      // actions (also `import {actions}`)
```

Rules: **state is immutable** (replace objects, never mutate `run`, `design`, `team`); **selectors that return objects must be memoised** (zustand 5 loops on fresh objects; all exported selectors are, and a test enforces it); calls into the engine stay pure.

### 3.1 State

| key | meaning |
|---|---|
| `screen` | `'board' \| 'hangar' \| 'flight' \| 'report'` (legacy `page` + `game.stage`) |
| `category` | selected subsystem in the hangar (`'payload'` ...) |
| `design` | draft spacecraft (normalised by the engine) |
| `team` | crew session `{mode:'solo'\|'crew', players:[{name,roles}], active, contributions, signed, signedFor, concerns0, suggestions, votes, crises}` |
| `board` `runs` | leaderboard (<= 30), run archive (<= 20) |
| `run` | the flight (active) or the finished run being shown; `null` before launch |
| `playing` `speed` `pitch` | clock state, 1/3/10, demo mode |
| `robust` `robustProgress` | uncertainty result / `{done,total}` while the job runs |
| `compare` | `{error}` or `{mine, theirs, theirName, claimed}` from `compare-run` |
| `chat` `mentorLevel` `quiz` `guide` | assistant thread (<= 12), level, learning check `{i, answers}`, onboarding step 0-3 |
| `prefs` | `{language:'en'\|'bn', guided, reducedMotion, sound, haptics}` |
| `game.fullscreen` `pendingImport` `scoreSeen` | focus view, share-link design awaiting confirmation, run id whose score reveal already played |
| `reportTab` | `'score'` default; `go('trade')` sets `'trade'`, `go('debrief')` `'debrief'` (WP9 owns tab ids) |
| `launchCount` `cameraResets` | counters: increment on launch / camera reset; watch them in an effect to trigger the cinematic / reset the camera |
| `sheet` `toasts` | open sheet `{id, props, key}` or null; up to 3 toasts `{id, text, kind}` |
| `preview` | ghost preview request `{kind,id}` or `{field,value}` or null |
| `hidden` | document hidden (pause rAF loops) |
| `saveStatus` | `{rejected, checkpointDamaged}` for save-protection banners |

### 3.2 Persistence

Key `trajectiq-v1`, shape `{design, runs, prefs, team, board, checkpoint}`, identical to v6 (asserted: legacy blobs re-save deep-equal). `prefs.sound` / `prefs.haptics` are written only when true, so legacy blobs round-trip unchanged. Validators in `src/store/validators.js` (`validSavedRun`, `validCheckpoint`, `validBoardEntry`, `loadTeam`) are verbatim v6 behaviour. A damaged raw save is preserved byte for byte and every write is suppressed until `discard-rejected-save`; an invalid checkpoint is kept until the same action. While a flight is active the checkpoint is written on every change of `run`, `team`, `prefs`, `design` (the v6 app wrote on every render). Loading never rewrites the save.

`useGame.getState().actions.init()` (called by `main.jsx`) restores a valid checkpoint **paused** (screen `flight`, sheet `resume`), opens `rejected-save` for damaged data, and applies `#design=` / `#challenge=` links.

### 3.3 Actions

Every legacy `actions` key exists with the same name. Payload object fields are what the old `data-*` attributes carried (strings are accepted and coerced).

| action | payload | notes |
|---|---|---|
| `go(target)` | `'board'\|'hangar'\|'flight'\|'report'` or a legacy page: `game` (stay), `landing`/`home`, `brief` -> board, `architect` -> hangar + `lab` sheet, `readiness` -> `game-review`, `control`, `debrief` -> report/`debrief`, `trade` -> report/`trade`, `sources` -> sheet | unknown target ignored; cancels the uncertainty job when leaving |
| `home brief architect readiness trade game-debrief game-sources sources` | - | legacy page actions |
| `setCategory(kind)` `setReportTab(id)` `focus` `camera-reset` | | |
| `start` | - | new mission: discard flight (confirm sheet if active), back to board |
| `board-mode({mode})` | `solo\|crew\|sandbox` | crew = 2+ players |
| `board-scenario({scenario})` `board-difficulty({difficulty})` `board-players({players})` | ids / 2-4 | guarded by `draftGuard` + `ownerGuard` |
| `game-accept` | - | board -> hangar |
| `pitch` `exit-pitch` | | demo path (fragile preset, aggressive operations) |
| `preset(name)` `preset-balanced` `preset-fragile` `preset-resilient` | | discard-confirm during a flight |
| `install(kind, id, {source:'click'\|'drop'})` | | returns `'installed'\|'suggested'\|'blocked'`; crew non-owners create a suggestion; announces mass and margin; `drop` also selects the category and toasts |
| `setField(field, value)` | `fuel altitude inclination duty arrayScale batteryScale` numbers, `name livery distance` strings, `destination`, `mode` (operations dropdown, no log) | streams while dragging a slider; always persists |
| `setDestination(id)` `orbit-preset({inc, alt})` | | |
| `previewPart(kind, id)` `previewField(field, value)` `clearPreview` | | ghost previews; never change the design |
| `customize` `apply-custom` | | open / close the `lab` sheet |
| `game-review` | - | opens `launch-check` (crew: records first concerns, resets stale sign-offs) |
| `game-fix` `confirm-power-fix` | | `power-fix` sheet, Endurance + High-gain patch |
| `game-launch` `launch` | | `launch` refuses (and opens `launch-check`) until all crew roles signed |
| `play` (toggle) `pause` `resume` `step` `fast` `setSpeed(n)` `speed-1 speed-3 speed-10` | | see clock |
| `command(mode, {silent})` | `science\|aggressive\|coast\|downlink` | only in operations, no crisis; logs `Operations: <mode>` |
| `resolve(actionId)` | recovery id | solo; in crew mode it only toasts "the team votes" |
| `crew-vote({role, option})` `crew-resolve` `crew-pass` `crew-signoff({role})` `suggest(kind, part)` `suggest-accept({id})` `suggest-decline({id})` `setPlayers(n)` `setTeamName(i, name)` | | |
| `loadRun(id)` `redesign` `game-redesign` `markScoreSeen(id)` | | |
| `board-add` `clear-history` `confirm-clear` | | leaderboard, archive |
| `export` `export-nasa` | | download through `io.download` (report has no team name) |
| `copy-code` `copy-design` `copy-challenge` | | async, toast on result |
| `print` `compare-run({code})` `import-design` `cancel-import` | | |
| `robust` `cancel-robust` | | seeded 200-sample job, batched with `setTimeout(0)` |
| `export-rejected-save` `discard-rejected-save` `resume-checkpoint` `discard-checkpoint` `confirm-discard` `discardThen(fn)` | | save protection and flight lock |
| `mentor` `ask(q)` `applyAssistant(i)` `clear-chat` `setMentorLevel` `learn({topic})` `learn-index` `quiz` `answerQuiz(i)` `next-question` `game-help` `nasa-data` `game-history` `guide-next` `guide-toggle` | | `ask` lazy-loads the assistant engine (async); the rest open sheets or change state |
| `setPref(key, value)` `toggle-motion` `toggle-language` `toggle-sound` `toggle-haptics` | | prefs |
| `openSheet(id, props)` `closeSheet` `close` `toast(text, kind)` `dismissToast(id)` `announce(text, {assertive})` | | |
| `init` `dispose` `persist` | | lifecycle |

Guards (identical to v6): `draftGuard` (damaged save -> reopen the sheet; flight active -> toast "Hardware is locked..."), `ownerGuard` (crew roles own subsystems; `name` and `livery` are free), `discardThen` (flight lock with the `discard-flight` sheet).

### 3.4 Simulation clock

`play` starts an interval: **1.9 s per step outside the operations phase, `max(100, 1400 / speed)` ms inside operations** (the v6 cadence). It pauses on: a crisis (also announced assertively), any open sheet (and `play` is refused while one is open), a hidden tab (auto-resumes on return unless the player paused or a sheet/crisis intervened), `dispose`. Phase changes, battery < 30 % and < 15 %, recorder > 75 % and safe mode are announced through the live region. `fast` advances up to 150 steps and stops at a decision or the end. Finishing archives the run (id, label `R01`, review, crew summary, score) and switches to `report`.

### 3.5 Selectors (`@/store`, all memoised, read-only results)

`selectAnalysis` (calculate of the active design) · `selectMission` · `selectMargins` -> `{rows:[{id,title,unit,value,max,margin,digits,fraction,status:'pass'|'warn'|'fail',note,critical,learn}], extras:{power,data,pointing,launchOrbit,recorder}, launchable, checks}` · `selectTelemetry` -> `null` or `{gauges:[{id:'battery'|'recorder'|'science'|'fuel',label,value,max,unit,digits,fraction,status:'nominal'|'warn'}], thresholds, lostMB, safeMinutes, inContact, inEclipse, safe, minute, duration, clock, phase, mode, history}` · `selectCrisis` -> `null` or `{crisis, directions, advice, crewMode, votes, decided, forecastAvailable}` · `selectScore` · `selectReview` · `selectDebrief` · `selectReportRun` · `selectPreviousRun` · `selectShareCode` · `selectTrade` · `selectLaunchCheck` -> `{checks, launchable, crew, verdicts, signed, ready, canLaunch, failedCount, blockReason}` · `selectLaunchGate` -> `{ok, reason}` (feed `disabledReason`) · `selectOrbitOptions` · `selectPreview` -> `null` or `{patch, analysis, margins, deltas, launchable}` (ghost gauges) · `selectCrew` · `selectObjective` · `selectAssistantContext`. Helpers: `analyze(design)` (memoised calculate), `runCode`, `runScore`, `runReview`, `isFlightActive`, `activeDesign`.

### 3.6 Testing a feature against the store

`tests-ui/store/harness.js`: `makeStore(savedBlobOrRawString, extra)` returns an isolated store over an in-memory storage with fake timers/IO (`h.a` actions, `h.get()` state, `h.stored()`, `h.tickTimer()`, `h.downloads`, `h.copies`); `flyThrough(h)` plays a mission with the autopilot. For component tests that render the real shell use the singleton and reset it as in `tests-ui/shell/app.test.jsx`. Legacy save fixtures: `tests-ui/fixtures/legacy-saves/`.

## 4. Design system (`@/ds`)

Global CSS (`tokens.css`, `fonts.css`, `base.css`) is imported by `main.jsx`; components use CSS Modules. Tokens (plan 2.1): colours, spacing 4..64, radii, z layers, type scale, motion durations/easings, `--target-min` (32 px, 44 px under `@media (pointer: coarse)`), `[data-density="compact"]` (set under 820 px viewport height), `[data-motion="reduced"]`. Contrast of every text/status colour on every surface is asserted >= 4.5:1. Inter Variable and JetBrains Mono Latin subsets are vendored (57.8 KB total, OFL files alongside); Bengali falls back to the system stack.

| export | props (all optional unless marked) |
|---|---|
| `Button` | `variant` primary\|secondary\|ghost\|danger\|commit · `size` sm\|md\|lg · `icon` `iconEnd` (icon names) · `iconOnly` + **`label`** · `loading` · `success` · `disabled` + `disabledReason` (aria-disabled, stays focusable, reason as tooltip + description) · commit: `onConfirm`, `holdMs`=700, `confirmLabel`, `holdLabel` (hold the pointer or Space/Enter; a tap arms "Press again to confirm" for 3 s) · others pass through. Press spring (700/30), hover lift for fine pointers only. `useTransientFlag(ms)` helper. |
| `Panel` | `kicker` `title` `badge` (string or node) `actions` · `state` default\|selected\|locked\|warning\|incident · `collapsible` `defaultOpen` · `as` |
| `PartCard` | `part {id,name,note,mass,cost,power}` **required** · `installed` (part of the same category) · `state` default\|installed\|locked · `kind` · `onInstall(part)` · `onPreview(id\|null)` · `disabled` `disabledReason` · `draggable` (payload `application/x-trajectiq` `{kind,id}`). Delta chips are signed and trend-coloured. `useGhostPreview(onPreview)` returns `bind(id)` handlers (hover/focus). `partDelta(part, installed, key)`. |
| `Gauge` | `kind` linear\|arc\|segments\|margin · `label` `value` `max` `min` `unit` `digits` · `thresholds [{at,label}]` · `preview` (number: striped ghost segment) · `status` nominal\|warning\|critical\|locked (critical is announced) · `help` node (usually `<Concept/>`) · `segments` · `valueText`. `role="meter"`, spring needle (120/20) that snaps under reduced motion; only transform/opacity animate. |
| `Chip` | `kind` pass\|warn\|fail\|info\|role\|mode · `size` sm\|md · `icon` (null hides) · `selectable` `selected` `onClick` (toggle button) · `tone` |
| `Segmented` | `options [{value,label,icon,disabled,hint}]` `value` `onChange` `label` (aria) `size` `fullWidth`; radiogroup, roving tabindex, arrows/Home/End, sliding pill (`layoutId`) |
| `Slider` | `label` `value` `min` `max` `step` `unit` `onChange` (continuous; drive previews) `onCommit` `markers [{at,label}]` `disabled` `disabledReason` `showField` `help` |
| `Dialog` | `open` `onClose` `title` `description` `footer` `size` sm\|md\|lg `dismissible` `alert` `closeLabel`; mark the first-focus element with `data-autofocus` |
| `Sheet` | `open` `onClose` `title` `placement` auto\|side\|bottom `footer` `dismissible`; side drawer 420 px; bottom sheet drags down to dismiss (120 px or flick) |
| `ToastViewport` / `Toast` | `toasts [{id,text,kind}]` `onDismiss(id)`; max 3, 4 s, pauses on hover/focus; the viewport is the polite live region |
| `Icon` | `name` `size` `title` (omit = decorative). 36 icons (`ICON_NAMES`): the 7 subsystems, transport, state, domain, prefs, arrows |
| `Concept` | `id` `label` `onOpen`; default opens `openSheet('concept', {topic: id})` (the shell wires it with `setConceptOpener`) |
| `LiveRegion` / `useAnnounce()` / `announce(text, {assertive})` | `LiveRegion` is mounted once by the shell |
| motion | `MotionProvider({reduced})`, `useReducedMotion()`, `duration`, `ease`, `spring` (`snappy soft snap needle press`), `variants`, `variantsFor(v, reduced)`, `reduce`, `stagger` |

**Reduced motion has one source of truth**: system preference OR `prefs.reducedMotion`, resolved in `MotionProvider`, which sets `MotionConfig reducedMotion="always"`, `<html data-motion="reduced">` and the `useReducedMotion()` value. Use `variantsFor(...)`/`reduce(...)` for your own animation; animate only `transform` and `opacity`; pause rAF loops when `state.hidden`.

Accessibility defaults: visible focus ring on `:focus-visible`, 44 px targets on coarse pointers, decorative icons `aria-hidden`, icon-only buttons need `label`, status never by colour alone, modals make the rest of the page `inert`, restore focus, and never rely on drag (PartCard also installs on Enter/click).

## 5. fx (`@/fx`)

`fx.play('tick'|'seat'|'warn'|'go'|'nogo'|'launch'|'success')`, `fx.haptic('seat' | [ms...])`, `fx.cue(name)` (both), `useFx()` -> `{play, haptic, cue, enabled, hapticsEnabled, supported, toggleSound, toggleHaptics}`. A WebAudio synth with no assets (patterns in `patterns.js`). **Silent until a user gesture has unlocked audio and until `prefs.sound` is on (default off)**; haptics need `prefs.haptics` and `navigator.vibrate` (not on iOS). Missing `AudioContext`/`vibrate` never throws. `bindFx(useGame)` (called in `main.jsx`) unlocks on the first pointer/key event and plays cues for: part installed (`seat`), launch, crisis (`warn`), mission end (`success` or `nogo`), crew sign-off (`go`), speed/command change (`tick`), sound switched on (`tick`). Features may also call `fx.cue(...)` directly.

## 6. Build, security and deviations from the plan

* `site/index.html` has one `<script type="module" src>`; the standalone is one inline module script pinned by SHA-256 in a `default-src 'none'` meta CSP with `font-src data:` and `img-src data:` only; fonts and the logo are inlined; the script escapes `</script` and `<!--`. Tested by `tests/v7-build.test.mjs` (also: banned patterns in `src/`, no `dangerouslySetInnerHTML`/`innerHTML`, banned drei imports, allow-listed hosts in built assets, size budgets).
* `site/sw.js` is generated from `src/sw/sw.template.js` with every emitted file precached and a content-hashed cache name; semantics are the v5/v6 ones (`tests/v7-offline.test.mjs`). The legacy `dist/sw.js` and `v5-offline` test stay until cutover.
* **Deviation:** until cutover (WP12) `dist/TRAJECTIQ_Play.html` stays the byte-stable legacy file, because `standalone.test.mjs` and `v6-security.test.mjs` assert the legacy script and the CI byte-equality check protects it. The React standalone is written to `site/TRAJECTIQ_Play.html`; `npm run build -- --cutover` (or `TRAJECTIQ_STANDALONE_TARGET=dist`) writes it to `dist/` too. Linux CI uploads it as an artifact (it is the producer of the committed file at release).
* **Deviation:** the export report no longer embeds the team name (project rule: no team names in the web app).
* **Deviation:** `ask` (assistant) is async because `assistant.js` is lazy-loaded to keep the first load small.
* Playwright is not installed yet (WP11): `npm run e2e` prints how to enable it.
* Known gaps: no 3D (stage package), placeholder screens are deliberately plain, the bottom sheet has drag-to-dismiss but no multi-snap points (WP5 builds the 18/50/88 % parts tray on top of `Sheet`), Bengali covers the shell, built-in sheets and store messages only, `reportTab` ids are not fixed yet.
