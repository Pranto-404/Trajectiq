# Challenge text and comparable projects

Researched 2026-11-05, nine days before the event (14–15 November 2026). Sources are linked; nothing here is from private information.

## What the challenge asks

Source: the official challenge text (pasted by the team) and the organisers' repository, https://github.com/NASA-SPACEAPP-2026/Space-Mission-Design-Game.

- Players design a complete mission and manage limited resources, simulate it, and see how each choice shaped the result. The educational goal is to make trade-offs tangible.
- A solid solution has: a clear interface, a mission configuration system, resource management, **single-player and/or multiplayer for up to four**, and a simulation with evaluation and scoring.
- It should reward: mission performance, scientific value, efficient use of resources, **quality of decisions** and **team collaboration**.
- Resources to show: mass, power, budget, data, communications and **time**. Mark which are critical per scenario.
- Optional features the organisers list: scenarios, random events, difficulty levels, interactive visualisation, dashboards, leaderboards, mission reports, **save/share/compare designs**, cooperative and competitive modes, sandbox, post-mission analysis.
- A "no single perfect solution" design, and explanations of *why* a decision matters.

The video linked by the team (https://www.youtube.com/watch?v=_hl-36j6C54, "2026 Challenge | Space Mission Design Game") could not be read in this environment, so this analysis uses the written text only.

## Comparable projects found

| Project | What it is | Strengths | Gaps relevant to the challenge |
|---|---|---|---|
| ORBITAL, https://github.com/aHmed-Afreet/space-mission-game (React, Vite, TypeScript, three.js) | Large strategy and first-person game with 55 historical milestones | Deep content, audio, PWA, CI, 200 commits | No multiplayer or team roles; hand-weighted scores not tied to sourced parameters; README admits physical-device testing is pending; says it predates the event |
| Orbit Foundry, https://github.com/KittyWhiskers1333/SpaceMissionDesignGame1 (Three.js from a CDN) | Browser 3D shipyard and flight prototype | Attractive 3D shipyard, ten mission storylines | Stylised physics, thin scoring, no team mode, no tests, needs a network for Three.js |
| Marsbound, NASA JPL classroom activity | Card and spreadsheet mass/power/budget trade study | The educational model the challenge echoes | Not a game or simulation |
| The organisers' own starter repo | PlayCanvas lunar-base walk-around with a Go/No-Go console | Official | A starter, not a solution |

No public 2026 submissions for this challenge were found, so there is nothing to compare against beyond the projects above.

## Where TRAJECTIQ stands

Strengths: sourced NASA/JPL parameters with every assumption labelled; a deterministic engine; **causal debrief that replays decisions**; direction-only previews that keep decisions meaningful; crew mode with role-owned subsystems, negotiation and collaboration scoring; scoring that mirrors the stated rubric; verified shareable designs; offline play; 327 automated tests; strict security headers.

Weaknesses to be honest about: no physical-device testing yet; crew play is one device, not networked; less content depth than ORBITAL (four scenarios, no historical campaign); the assistant is rule-based; no audio.

## Judging

Space Apps judging has changed by year. Recent guidance names impact, creativity, validity (scientifically sound), relevance to the challenge and presentation, and stresses giving presentation equal attention. Taken from search snippets of https://spaceappschallenge.org/resources/judging-awards-guide and earlier guides, not verified against the pages themselves. Confirm the 2026 rubric on the official site before submitting.
