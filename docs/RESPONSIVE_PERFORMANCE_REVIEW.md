# Responsive and performance review — 2026-11-06

## Changes and reasons

- Chat composer: 46px input/button, 16px input text, 8px label gap, padded focus ring and a bounded scroll region. Corrects the cramped composer in the owner's screenshot.
- Narrow panels use zero-minimum grid tracks. Long mission-accept labels wrap; a reproduced 333px board overflow at a 320px viewport is fixed (305px content plus scrollbar).
- Touch input fonts are at least 16px; mobile panels avoid repeated backdrop blurs. Full Android/iOS browser behavior still requires physical-device QA.
- Offscreen WebGL slots suspend the render loop and resume on intersection. A regression verifies state changes, prop updates and stale observer callbacks. The existing single persistent WebGL context, adaptive quality, DPR limits and hidden-tab suspension remain.
- Solar-wing references are removed on unmount, preventing accumulation during repeated component changes. Thermal-blanket detail uses a shared original 128px texture, with disposal, and adds no mesh draw calls or remote downloads.
- Dark primary accents are quieter mint against navy; light mode retains its contrast-tested blue/teal palette. Briefing light sweep and hover depth use transform/opacity and respect reduced motion; hidden tabs pause the sweep.
- Crew entry explicitly says 2–4 friends share one device. It is pass-and-play, not network multiplayer.
- The Ice Hunter coverage explanation now includes its squared inclination penalty and actual factor. Sources distinguish generated science from returned science, identify the educational multiplier and specify battery clamp bounds and time units.

## Reference review

Inspected [NASA Eyes on the Solar System](https://eyes.nasa.gov/apps/solar-system/) and [Eyes on the Earth](https://eyes.nasa.gov/apps/earth/) in the owner's Edge. Solar System separates its scene from optional layers/settings and time controls. Earth pairs visible layers with an observation date and optional timelapse. Applied the principles of restrained framing, meaningful motion and explicit data context; no code or assets were copied. The spacecraft foil texture is original schematic detail, not flight-hardware imagery.

## Automated verification

- 372 Node tests + 359 UI tests passed (731 total), including crew ownership, suggestions, sign-offs, vote ties, import/share validation, equations, color contrast, reduced motion, stage lifecycle and responsive hook regression.
- Full suites were run before and after fixes; final hosted and standalone build passed. Existing large Three.js chunk advisory remains. Bundle output is approximately 559KB gzipped JavaScript across split chunks; it is not all required for initial HTML.
- Workload: 290 completed engine runs across ten scenarios, three difficulties and ten seeds/two policies where launchable. All completed with finite telemetry and nonnegative battery/recorder. Europa Director's starter design was correctly blocked by its schedule constraint.
- Local Node batch: 11.56 seconds total; median 23.05ms, p95 159.83ms, maximum 280.21ms per mission. These are measurements on this PC, not mobile frame-rate, server concurrency or real-world mission reliability.

## Edge UI verification

| Area | Checks |
|---|---|
| Responsive flight | 320×568, 360×800, 390×844, 844×390, 768×1024, 1024×768; no overflowing flight panels |
| Board/hangar | 320px overflow reproduced and repaired; presets, navigation, role handoffs, part selection, camera keyboard rotation/reset |
| Chat | 320px and 390px portrait plus 844×390 landscape; composer visible, 46px controls, current mission response, dark/light |
| Crew setup | Four names, all role handoffs, launch disabled before sign-off, all four sign-offs and launch |
| Crew flight | Balanced mission completed: 602 science, score 837, grade A |
| Crew crisis | Fragile mission reached recorder crisis; 2–2 tie resolved by Commander, held confirmation, further votes and completed report |
| Proposals | Commander payload suggestion waits for owner; Science Lead accepts and Survey camera becomes installed |
| Reports | Score, causal debrief, trade plot and share/export panel opened at phone width; no panel overflow |
| Tools | Help, concepts, quiz, history, Sources, NASA tables and engineering lab opened; formula/table regions scroll within the dialog |
| Runtime | No captured console errors in the final local test tab |

This is a targeted regression matrix, not every possible input combination. No physical Android/iPhone/iPad, Safari engine, screen-reader session, touch keyboard, thermal throttling, browser FPS benchmark or server load test was performed. Crew works locally; mission-code sharing supports asynchronous comparison. Export downloads and every quiz branch were covered by existing automated tests, not all manually repeated here. Security protections were retained; this pass is not a penetration test.
