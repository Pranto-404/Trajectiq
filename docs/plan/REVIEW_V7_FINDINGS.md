# Independent review of the React build (2026-11-06)

Reviewer: a fresh agent that did not build the app, read-only, in an isolated worktree, against `main` (7c700c6) and the live site. It re-ran `npm ci`, `npm run build`, `npm test` itself: 372 node + 364 vitest tests pass, `npm audit` reports 0 vulnerabilities, live headers and both CSPs are correct.

## Major

1. **Crew ownership is bypassed by presets.** As Commander in a 4-player crew, clicking "Resilient build" swapped the payload (owned by Science): mass 164 to 174, cost 115 to 129, while a pending proposal stayed "Waiting for the owner". Direct orbit edits are blocked, but the controls are not disabled in the UI. Fix: apply presets only to fields the active role owns (or route through proposals) and disable non-owned controls.
2. **The Balanced / Quick-launch preset wins almost everything.** Engine run over 3 presets x 3 difficulties x 10 scenarios: Balanced reaches the objective with grade A or B+ on Cadet and Engineer in 9 of 10 scenarios (Venus 850, Earth 870, Moon 847, Mars Dust 862). Only Ice Hunter resists (winnable, no preset wins). Clicking Quick launch and 10x gives grade A with no decisions, and the run counts as ranked. Fix: make presets deliberately flawed, keep Quick launch out of ranked scoring, give each scenario a real puzzle.
3. **Mission Score is inflated and weakly discriminating.** A design returning 0 science still scores 484 to 551 of 1000. Decision quality is a free 200 of 200 when no crisis occurs (`dist/engine/review.js`: `200 * 1` with no material reviews). Choosing the second-best crisis option (557 vs 669 science, -17%) cost 3 points, with the generic explanation "small shifts in collection timing". Science above target scores nothing. Fix: floor-test the score, remove the free 200, scale value and efficiency by returned science, write cause-specific explanations.
4. **Accessibility: commit buttons ignore synthetic or assistive `click`.** `Button.jsx` sets `onClick=preventDefault` for hold-to-confirm; a plain click does nothing. Keyboard Enter works (tap to arm, tap again) but the 3 s arm window (`ARM_MS`) fails timing needs and silently re-armed in a slow test. Fix: honour click as arm-then-confirm and lengthen or remove the window.
5. **Mobile 375 px hangar overflows** (Europa: scrollWidth 391 vs 375, title clipped). Targets under 44 px: Solo/Crew/Sandbox and difficulty controls (38), all concept "?" buttons (22x22), inclination buttons (38), charter source links (16 high). README and CLAUDE.md claim 44 px.

## Minor

- NASA imagery credits are only under Menu, then NASA data & credits; none on the 3D stage, board or hangar (CLAUDE.md requires attribution where NASA imagery is shown).
- Meta description still says "Moon or Mars mission" (10 scenarios exist). First-visit guide says "Start with Cadet" but the default is Engineer.
- The assistant conversation from the previous mission persists into the next one.
- Crew roll call lets the active player sign off every role (noted as intentional).
- Focus: after launch `document.activeElement` is `BODY`; closing the assistant focuses a heading.
- axe: no `h1` on any screen; `role=status` on a `ul` with `li`; scrollable crisis region not focusable; "Replayed alternatives" landmark has no unique name; `label-content-name-mismatch` on the 10 scenario cards. No contrast violations.
- A brief "No mission in flight" flash between flight end and report. Report header repeats "Lunar Polar Mapper · Lunar Polar Mapper".
- Translations are partial: scenario names, crew role subtext and charter text stay English in all 12 languages (disclosed in docs).
- Ceres scenario text says a "5-hour orbit"; the computed period is 5.4 h. Vesta radius 261.385 km is derived from an SBDB diameter and labelled "Derived" (about 0.5% under the commonly quoted mean radius; not checked further).

## Polish

README mixes v6 history with v7 and its test count is stale (736 vs 718). "Discard / new mission" on a completed report has no confirm. First-visit precache is about 38 files including all 12 language packs; install took tens of seconds.

## Verified working

Solo to report on Moon, Mars Dust (crisis, direction-only preview, one forecast, decision review), Earth, Mercury, Venus, Vesta (checkpoint reload mid-crisis restored), Europa. Hostile crew names, share codes (garbage, oversize, XSS names), localStorage and `#design=` hash are inert; claimed scores are clamped; no prototype pollution. A damaged checkpoint shows an explicit prompt. No runtime network calls. Language switch, reduce-animation, concept cards and the learning check work.

## NASA data spot-check

Matches NASA/JPL: mean radii for Mercury, Venus, Earth, Mars, Ceres; Moon radius 1737.4 km and irradiance 1361; Dawn LAMO at Vesta (210 km, 4.3 h) and Ceres (375 km). GM values were only checked against the reviewer's own knowledge (fetched pages printed none). The 225,000,000 km Mars reference is labelled a game choice.

## Not verified by the reviewer

Ice Hunter, Mars Polar and Dawn at Ceres were never launched through the UI (engine runs only). Not tested: full keyboard-only play, a real long-press on commit buttons, offline with the network off, WebGL lost or unavailable, real screen readers, physical phones or 768 px tablet, first-load timing, rapid-click and resize stress, leaderboard add and print report, Sandbox beyond its card. The browser pane kept hiding, which stalled some automation.

## Reviewer's top three changes for winning odds

1. Make the score meaningful and the presets non-winning so design decisions matter.
2. Fix crew ownership and make sign-off per role and tied to the active player.
3. Put visible NASA attribution on the stage, and fix the mobile and accessibility defects.
