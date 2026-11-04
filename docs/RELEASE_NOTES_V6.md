# Release notes · v6.0.0

v6 answers a twelve-point review of v5 and adds the features the official challenge text asks for (teams of up to four, scenarios, difficulty, sandbox, scoring, sharing).

## The twelve review findings

| # | Finding | What changed | Evidence |
|---|---|---|---|
| 1 | A crisis choice ("Reallocate link resources") changed nothing: score stayed 504.4 | Root cause reproduced: the recorder had already drained, so every link option ended identically. A link decision is now raised only when the recorder holds more than the contact window can return; otherwise the log says no decision was needed. Boost now has real costs (double transmitter power, 10% instrument quality). A new test checks that every crisis raised for the Balanced, Resilient and Fragile presets has distinguishable options. | `V6 #1` tests |
| 2 | The preview showed the exact outcome of every option | The free preview shows **direction only** (↑ ≈ ↓ per science, battery, data, safe-mode risk). One **forecast** per mission shows ranges across pessimistic, nominal and optimistic conditions. | `V6 #2` tests |
| 3 | The assistant could not explain "why did prioritizing return score lower?" | New decision explanations: each crisis decision is replayed from the paused moment under every alternative, then explained from measured differences. The assistant answers decision questions from that replay and still declines unrelated questions. | `V6 #3` tests |
| 4 | No warning that the recorder may fill before the first contact | New readiness check "Recorder before first contact" compares fill time with the time to the first contact. | `V6 #4` |
| 5 | Advice said "resume sunlit mapping after conserving energy" although battery ended at 89% and data was the problem | Advice now comes from a ranked root-cause analysis in one unit (science lost). Energy advice appears only if energy actually cost science. | `V6 #5` |
| 6 | Moon eclipse fixed at 35 min; Mars used the real formula | Both bodies use the same central-shadow formula: 46.5 min for a 100 km lunar orbit. Balance was re-checked: Balanced and Resilient designs still meet the objective, Fragile still fails. | `V6 #6` |
| 7 | "1.2 Mb/s payload data must fit a 4 Mb/s contact link" was confusing | Crisis text explains the duty cycle: the link is open 25 of every 118 minutes (21%), so it returns about 0.85 Mb/s averaged over an orbit. | `V6 #7` |
| 8 | The 225 million km Mars distance was labelled only in docs | Labelled in the destination control and the Customize dialog as a game choice, not a measured average. | UI test |
| 9 | "Choose destination" control cramped | Rebuilt as a stacked field; verified at 375 px. | UI test, browser check |
| 10 | Overlapping header buttons | Header is now brand, one **Assistant** button and one **Menu** (How to play, Concept cards, Sources, Pitch demo, Focus view, Reduce animation, Language). Focus view moved onto the 3D scene. | UI test |
| 11 | Real-device testing pending | Tested in an emulated phone viewport; a five-minute physical-device checklist was added. **Physical devices are still unverified.** | `docs/QA_V6.md` |
| 12 | Boilerplate in the README, challenge not named, no team details | README rewritten around the named challenge with the requirement mapping. Team member details are intentionally left for the team to add. | `README.md` |

## New in v6

- **Mission board**: four scenarios, three difficulties, Solo / Crew / Sandbox, mission charter, critical resource.
- **Crew mode** for 1–4 players with roles, suggestions, Go/No-Go roll call, voting and a collaboration score.
- **Mission Score** (five dimensions) and **Decision review**.
- **Mission codes**, fair comparison of two designs, local leaderboard, challenge links, printable report.
- **Resources:** development schedule (time) and launch–orbit compatibility; orbit options explained.
- **Random events:** solar particle event and Mars dust storm, seeded, with a decision only when it matters.
- **Concept cards** behind "?" buttons.
- **3D and motion:** lit spacecraft with highlights, spinning planets with atmosphere glow, twinkling stars, orbit trails, ground-station beam pulses, launch plume and countdown, intro dolly, idle camera drift, view transitions, tilt cards. All motion respects `prefers-reduced-motion` and an in-game switch.
- **Security:** strict CSP, hardening headers, hash-pinned offline file, hostile-input tests.
- **Service worker:** online visits always get the latest release; the cache is the offline fallback.

## Known limits

Single device for crew play; no network multiplayer. Leaderboard is local and self-reported (codes are re-flown to verify designs). No physical-device test yet. The offline assistant is deterministic, not a generative AI.
