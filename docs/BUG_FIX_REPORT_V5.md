# TRAJECTIQ v5 bug-fix report

## Baseline and method

The newly uploaded `TRAJECTIQ(1).zip` was extracted without its embedded `.git` metadata. Every non-directory source file matched the previously committed v4 workspace byte-for-byte. Its unmodified suite ran: **56 tests, 56 passed**. The game is dependency-free JavaScript ES modules with a generated standalone HTML edition, native WebGL plus SVG fallback, browser-local persistence and static hosting.

The attached deep-audit PDF and master text were used as acceptance inputs. Findings below distinguish implemented fixes from verification limits. Regression filenames refer to `tests/`; app means `dist/ui/app.js`, model means `dist/engine/model.js`. Testing is automated Node/model/DOM-adapter/mock-GPU testing unless stated otherwise. No complete physical-device or browser-layout certification is claimed.

## Original audit findings

| ID / severity | Reproduce / root cause | Change and files | Verification / final status |
|---|---|---|---|
| B01 P0 | Narrow game/lab: auto-minimum grid tracks could expand beyond viewport | `styles.css`: minmax(0,1fr), min-width:0, wrapping, locally scrollable tables, compact mobile controls | `v5-rendering-accessibility`: static cascade at 13 widths. Code fixed; browser layout gate remains open |
| B02 P0 | Launch, visit lab, change component/slider/custom field; handlers lacked common guard | app `draftGuard` rejects component/input/drop/custom/destination edits during active flight | `v5-flight-guards`: all edit routes preserve launched state; automated pass |
| B03 P0 | Launch again during unfinished run overwrote it | app `launch` refuses active relaunch | Flight guard regression; automated pass |
| B04 P1 | Start/pitch/preset abandoned active flight | app `discardThen` pauses, saves, asks explicit discard; cancel preserves it | Flight guards cover preset/pitch/start/cancel/discard; automated pass |
| B05 P1 | Ask lunar temperature/radiation/career question; broad keyword routing returned unrelated distance facts | assistant/copilot strict supported intents, ambiguity/unsupported fallback, domain exclusions | `v5-assistant-accuracy` adversarial prompts and FAQ routing; automated pass |
| B06 P1 | Customized design, apply power/comms fix; old preset reset unrelated parts | app `previewPowerFix` previews mass/cost; confirmation changes only power/comms | Guard regression asserts preservation of mission name, fuel, orbit, payload, bus, launch and sizes; pass |
| B07 P1 | Refresh active/crisis flight; only completed runs persisted | app `persist`, `validCheckpoint`, `restoreCheckpoint`: schema/version checks, full run snapshot, paused resume | UI pending-crisis restore and model serialized transition equivalence; pass |
| B08 P2 | Export JSON appeared reusable as progress backup despite no import | app export/help labels report read-only; invalid originals can be downloaded | Honest labeling implemented; portable restore/import remains unsupported |
| B09 P2 | Resilient preset with conservative policy missed objective | No fabricated guarantee; documentation and assistant explain policy-dependent result | Scientific report: 504.44 fails, ordinary 568.89 succeeds; documented model behavior |
| B10 P2 | Historical runs had different engines/policies but plot implied hardware-only comparison | app trade filters destination/current version; observational label explains player decisions; copilot benchmarks same policy | UI chart checks + copilot common-policy tests; historical charts remain observational |
| B11 P2 | Save/friends/repair prompts matched wrong topic | Explicit scope for local resume, read-only reports, no multiplayer, locked flight hardware | Assistant regression cases; pass |
| B12 P2 | `battery size = 125%` rejected or misinterpreted | copilot parses percentages/multipliers/Bangla digits, finite/range validation | Engine-matched what-if and invalid-input tests; pass |
| B13 P2 | Critical journey remained English after selecting Bangla | app translates main navigation, launch/play/discard/resume controls; assistant bilingual | Partial improvement; full interface/content localization remains open |
| B14 P2 | Gauge green while matching readiness constraint warned | app uses shared checks/status; eclipse gauge distinguishes consumption from reserve | Shared status logic reviewed, UI guard coverage; visual color/contrast gate open |
| B15 P2 | Science chart capped at 100%, hiding above-target differences | app raw-science axis/results; model `rawCompletion`; progress indicators may still cap | Distinct circle positions for above-target runs and physics raw scoring regression; pass |
| B16 P2 | Dialog paused/rerendered, destroying initiating focus node | app captures initiating selector, sets background inert, restores replacement control | Modal adapter test verifies inert and focus return; real screen-reader/keyboard audit pending |

## Additional confirmed defects

| ID / severity | Reproduction / root cause | Implemented correction | Regression evidence |
|---|---|---|---|
| V5-01 P1 | Choose “wider orbit”; altitude/period unchanged | Rename reduced-return capture; disclose fixed reference orbit and fictional 450 m/s/35% penalty; model | `v5-physics`: fuel/period/quality consistency |
| V5-02 P1 | Recorder empties part-way through timestep; full slice transmitter load charged | Split integration at recorder-empty boundary | Analytic partial-contact energy test |
| V5-03 P1 | Battery crosses 15%; observations for whole slice lost despite energy charge | Split at threshold; retain pre-safe-mode observations | Analytic threshold energy/data conservation test |
| V5-04 P1 | Begin sunlight operation with zero battery; possible revival | Terminate zero-energy state immediately | Exact battery boundary tests |
| V5-05 P1 | Repeated/tampered decisions or commands after completion | Validate allowed action/phase, independently recheck fuel/power; completed-state no-op | Physics forged capture button + UI completed/pre-operations command tests |
| V5-06 P1 | Damaged/incompatible saved flight silently replaced | Preserve original; block launch until explicit discard; allow download | Checkpoint and malformed raw JSON tests (`{broken`, `null`, `[]`) |
| V5-07 P1 | Stored labels/logs inserted as HTML | Escape persisted labels, event titles/chains/logs; reject malformed archive shapes | Stored img/script payload and null-event regression |
| V5-08 P2 | 200 synchronous Monte Carlo runs froze UI (~1.68 s baseline host) | One simulation per scheduled task; progress, cancellation, duplicate/stale-result protection | Batch test checks queued tasks, cancellation and exact seeded result parity |
| V5-09 P2 | Canvas consumed vertical touch scrolling/browser pinch and all wheel input | Vertical pan/pinch native; horizontal camera drag; wheel only when focused, Ctrl-wheel retained | Mock input tests in rendering suite |
| V5-10 P2 | Shader/link/allocation errors leaked GPU resources; runtime errors bypassed fallback | Track/release partial resources, dispose idempotently, trigger one SVG fallback | Mock GPU compile/link/allocation/runtime/context-loss/disposal tests |
| V5-11 P2 | Network-first cache could mix old UI/new modules; forced activation during flight | Version-pinned shell cache, complete installation, no forced activation/claim | `v5-offline`: version pinning, cleanup, cache miss503, external requests excluded |
| V5-12 P1 | Strict assistant vocabulary accidentally rejected all “what if” requests | Restore supported tokens, aliases/case normalization and safe one-field followups | 182 added assistant test cases include actual engine comparisons |
| V5-13 P2 | Mars source/customization/export still showed Moon values | Destination-specific data panel, CSV/export, radius/solar/orbit/light-time and schematic labels | Mars UI, assistant, physics and renderer tests |

## Security and architecture review

No runtime packages, external AI calls, analytics, credentials, login or backend were added. Fictional user mission names and persisted display strings are escaped. Saved data is treated as untrusted; validation is bounded and rejects inconsistent conservation totals. Recovery resource checks run in the engine independently of saved button flags. Vercel headers disable unused device permissions and add MIME-sniffing/referrer protections.

This does not make locally stored scores tamper-proof. A player controls their browser and there is no authenticated competitive leaderboard. A strict CSP has not been added because the current inline styles and standalone script require a deliberate policy/hashing design. Archive validation discards malformed completed-history entries; it cannot repair arbitrary old corrupt data.

## Final status

Implemented core integrity/model fixes pass regression checks. No known failing automated core-flow test remains. B01 visual closure, full accessibility, actual browser/platform behavior, browser service-worker lifecycle and production smoke tests remain **unverified release gates**. The package is a release candidate; “all devices flawless” or “bug-free” would be unsupported. See `QA_V5.md` and `DEPLOYMENT_V5.md` for precise remaining work.
