> Historical document: this describes an earlier release. For current behavior, see README.md and docs/QA_V5.md.

# TRAJECTIQ — team demo and submission draft

## One-line pitch

TRAJECTIQ lets students design a space mission, experience the consequences of engineering trade-offs, and redesign with evidence.

## Project abstract

Spacecraft decisions are connected, but students often learn their subsystems separately. TRAJECTIQ turns those connections into an interactive mission-design game. Players build a Lunar Polar Mapper within mass and budget constraints, choose its instrument, power, propulsion, communications and avionics, then operate it through launch, transfer, capture and a simulated mapping campaign. A deterministic first-order engine tracks battery energy, propellant, storage, downlink and returned science. Weak reserves create design-dependent crises; recovery choices change subsequent outcomes. A causal debrief links architecture decisions to subsystem stress and science loss. Players redesign and compare saved missions in a cost/science trade-space. NASA engineering references and JPL lunar constants are visible alongside explicit educational assumptions. The browser-based game works without paid APIs and keeps its core model offline. It teaches iterative systems thinking without claiming flight certification or real-world mission reliability.

## 90-second demonstration

| Time | Screen/action | Narration |
| --- | --- | --- |
| 0–10 s | Mission brief | “The goal is not just reaching the Moon. Our observations must reach Earth.” |
| 10–25 s | Pitch mode: interactive fragile spacecraft hangar | “We bought a high-science instrument but saved credits on power and communications.” |
| 25–40 s | Launch readiness modal, then flight scene | “Launch is allowed. The warnings show what we are accepting.” |
| 40–55 s | Fast-forward, keep collecting/mapping | “Data generation outruns downlink; eclipse consumes the weak battery.” |
| 55–65 s | Causal debrief | “Here is the original choice, subsystem consequence and lost science.” |
| 65–80 s | Apply power + comms fix; relaunch | “We keep the instrument and improve its supporting architecture.” |
| 80–90 s | Result and comparison | “The corrected mission returns more science. The player understands why.” |

This timing is a rehearsal target, not a measured achievement. Fast-forward pauses at every crisis. Select Keep mapping, Keep collecting and Wait for next contact as applicable, then fast-forward again. Do not narrate the robustness index as mission-success probability.

## Team ownership

1. Product/integration: audit final challenge, verify scope, manage submission.
2. Simulation: review units, equations and tests; tune teaching assumptions transparently.
3. Game logic: validate phase transitions and recovery consequences.
4. Frontend/visuals: browser/device QA; screenshot capture; optional real 3D only after P0 stability.
5. Data/evidence: strengthen challenge-specific NASA resources, record exact parameter sources, audit all claims.
6. UX/pitch: fresh-user feedback, timing, recording, project page and contribution statements.

## Evidence to bring to judging

- Two exported runs using the same instrument and operating mode, with only power/comms changed.
- Causal debrief and before/after metrics.
- Test results and model limitations.
- NASA/JPL source map, equations and educational assumption register.
- A working local HTTP copy and a pre-recorded demo.

## Submission checklist

- Final challenge requirement audit and event-rule compliance.
- Correct project title and team/contributor details.
- Working URL with access configured for the intended judges.
- Public repository only if team/event sharing requirements call for it.
- README, source map, limitations, credits and model equations.
- Timed 90-second to 3-minute demo video and 3–5 actual screenshots.
- Actual learning/user feedback, if collected; never invent results.
- Confirm submission deadline and verify every submitted link.
