> Historical document: this describes an earlier release. For current behavior, see README.md and docs/QA_V5.md.

# TRAJECTIQ v4 verification

Date: 2026-10-10. Model equations and v3 NASA snapshot are unchanged; v4 adds a simulation-backed copilot and interactive design experiments.

## Automated coverage

Run `npm run standalone` followed by `npm test`.

Result for this release: **56 tests passed; 0 failed**. Standalone generation and `git diff --check` also passed.

New copilot coverage exercises:

- Every catalog component and supported numeric experiment, Bangla digits, percentages, invalid bounds and ambiguous requests.
- Forecast equality with independently executed full game runs, blocked-launch output and absence of input mutation.
- Disclosure when a smaller propulsion tank normalizes fuel downward.
- Bounded reviewer candidate validity and blocking-constraint improvement.
- Exact-state crisis forecasts, disabled options, ended missions and unchanged active flight state.
- Topic follow-up, common typos/Banglish, current telemetry and recorder fill calculations.
- DOM interactions for preview, apply, stale-proposal rejection, flight lock, experiment picker/form, conversation clearing and escaped user input.

Existing coverage includes engineering/data conservation, NASA values feeding calculations, complete failure/redesign mission loops, corrupt saved-state handling, renderer adapters and standalone JavaScript syntax/asset embedding.

## Fixes found during this upgrade

- A stop-word guard discarded “why?” before the copilot could resolve its previous topic. Follow-ups now run before the empty-token fallback, while unsupported factual requests retain their guard.
- Constant-load battery estimates now use the current reduced instrument duty when a recovery action changed it.
- v4 completed runs are accepted by the persisted-run validator.
- Keyboard focus handling includes newly introduced expandable controls and the scrollable comparison table.

## Limits

These are Node engine tests, DOM adapters and a mocked WebGL adapter. No actual browser, touch-device, layout or GPU rendering QA was available in this environment. Do not describe these checks as a real-browser end-to-end pass. Browser visual verification was skipped in accordance with the Sites workflow when its browser-control skill is unavailable.

Single-variable reviews use one fixed policy and nominal environment, not uncertainty sampling or global optimization. Old conversation cards are snapshots; the UI labels that fact. Applying a forecasted change is separate from launching or choosing an in-flight response. Public project descriptions were reviewed, not independently played or judged.
