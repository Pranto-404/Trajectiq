# Mission experience review

Reviewed 2026-11-06 in the owner's Microsoft Edge. This is an engineering assessment against the supplied challenge brief, not an official judging score.

## Research and decisions

- [NASA JPL Marsbound](https://www.jpl.nasa.gov/edu/resources/lesson-plan/marsbound-mission-to-the-red-planet/) makes students choose objectives, balance equipment and resource constraints, and reconsider their designs. Trajectiq now foregrounds the objective and explains the collect → store → return chain using actual simulation values. Existing NASA/JPL provenance remains in the data and in-app notes; artwork is explicitly schematic.
- [ORBITAL](https://github.com/aHmed-Afreet/space-mission-game), including its [public interface](https://space-mission-game.vercel.app/), presents distinct game modes and a clear next assignment. Trajectiq now gives a four-step journey and a prominent build action while retaining open scenario browsing.
- [Orbit Foundry](https://github.com/KittyWhiskers1333/SpaceMissionDesignGame1) documents a cinematic shipyard, readiness feedback, and returning/transmitting science. Trajectiq now brings launch readiness earlier and adds an actionable engineering advisor beside its existing interactive spacecraft.

These findings came from public interfaces and repository documentation. No third-party implementation or artwork was copied, and their undocumented behavior was not inferred.

## Findings addressed

| Finding | Change |
|---|---|
| A new player faced dense choices before understanding the loop | Mission briefing, selected objective, four steps, clearer primary action |
| Light mode lacked visual hierarchy | Cobalt actions, layered surfaces, subtle depth and planetary artwork |
| Warnings did not clearly identify the next decision | Advisor prioritizes failures, then the mission's critical resource; links to subsystem controls |
| Players could not open diagnostics on a failing design | Readiness opens for drafts; actual launch still rejects hard failures |
| Locked scenario cards still accepted selection | Lock guard and accessibility state |
| Campaign clock assumed every mission lasts 240 minutes | Progress uses each scenario's duration and clamps to its bounds |
| Mobile action bar retained dark styling in light mode | Theme-aware surface and text |
| Hangar displayed the base mission identifier | Uses the actual scenario identifier |
| More animation could impair accessibility or waste resources | Transform/opacity effects, reduced-motion support, hidden-tab pause |

## Verification

- `npm test`: 371 engine/Node tests and 351 UI tests passed (722 total), including new advisor, launch-diagnostics and mission-duration regression coverage.
- `npm run build`: hosted app and standalone output succeeded. Existing large-chunk advisory remains.
- Edge: both themes, mission board and hangar, 375px responsive board/hangar/report without horizontal overflow, and a complete Mars Dust Season mission.
- Manual flight: resilient build, recorder event, dust-storm decision, final report: 569 science against a 448 target; score 832, grade A. This validates one scenario path, not every possible design.
- Existing assistant and crew tests passed. The assistant remains a local rules/simulation advisor, not a hosted generative model.

## Assessment and remaining limits

The strongest challenge fit is the integrated engineering loop: players see resource consequences, fly a design, make operational choices, and inspect a causal report. Visual polish now supports that loop instead of requiring players to discover it themselves.

No win or bug-free guarantee is justified. Physical-phone performance, comprehensive assistive-technology testing, formal user studies, and all scenario/event combinations remain future checks. Multiplayer is the existing local cooperative experience, not networked sessions. The orbital and resource models remain educational approximations; no flight-engineering accuracy is implied by the 3D presentation.
