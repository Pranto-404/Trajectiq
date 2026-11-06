# Feature requests and notes for shared code

Each feature engineer appends a section. Shared files (`src/store`, `src/ds`, `src/shell`, `package.json`) are only edited by their owners.

## WP9 Report and WP10 Sheets (branch `feat-report-sheets`)

### For the store owner (WP1)

1. **Stage an imported code.** Report > Share lets the player paste a `TQ6.` code and load it. There is no action that turns a code into `pendingImport`, so the UI validates with `decodeDesign` and then does `useGame.setState({pendingImport: design})` followed by `openSheet('import-confirm')`. Please add `stage-import({code})` (decode, set `pendingImport`, open the sheet, toast the decoder error) and I will switch to it.
2. **Spend the one forecast.** `answerQuestion` returns `consumesForecast: true` for the exact-range forecast, but nothing increments `run.forecasts` (the v6 app never did either), so "one forecast per mission" is not enforced. The assistant sheet shows the provenance and ranges; the store should set `run.forecasts = 1` when `answer.consumesForecast` and the run has a pending crisis. `selectCrisis().forecastAvailable` then updates the button by itself.
3. **`game-redesign` throws when `state.run` is null** (it reads `s.run.design`). The report uses `game-redesign` only when `state.run.done`, else `redesign`. Consider making `game-redesign` fall back to `runs.at(-1)`.
4. **`setDestination` still hard-codes `['moon','mars']`** (`createGame.js`) and `export-nasa` writes the old Moon/Mars-only CSV. The sheets do not use them: the NASA sheets export through the engine's `datasetCSV(bodyId)` for every body.
5. `selectTrade` and `selectPreviousRun` filter by destination. The report filters runs by scenario (`missionFor(design).scenarioId`) and model version itself; you may want selectors that do the same.

### For the shell owner (WP1)

6. **The header is wider than a 375 px viewport.** At 375x812 `.right` (Assistant label plus Menu button) overflows to about 487 px, the page becomes 496 px wide and every fixed layer (dialogs, toasts) is 496 px wide instead of 375. Hide the Assistant label under about 480 px, or let the header shrink.
7. **Two features may register `menu`.** WP10 registers a full `menu` (preferences as switches, tools, sheet shortcuts). WP4 owns `menu` in `SHEET_OWNERS`. Features are loaded in alphabetical folder order, so `sheets` wins over `board`. Delete one of them when merging.
8. `tests-ui/shell/app.test.jsx` asserted that `assistant` is unregistered. It now uses the id `demo-sheet` (a one-line rename in three places), because WP10 registers `assistant`.

### For the stage engineer (WP6)

9. **Asset credits slot.** The NASA data and credits sheet reads an optional `src/features/stage/credits.js` through `import.meta.glob` (`src/features/sheets/assetCredits.js`). Export `ASSET_CREDITS = [{id, title, credit, url?, licence?}]` there. Until then the sheet says no NASA imagery or 3D models are bundled.

### Design-system notes (WP2)

10. `.layer` in `Dialog.module.css` sizes its single grid track to the content. Wide content can make a dialog wider than the viewport on phones. Adding `grid-template-columns: minmax(0, 1fr)` to `.layer` (and to the Sheet layer) fixes it for every feature.
11. A scroll container (`overflow: auto`) that holds `position: absolute` children, for example the `.sr-only` utility inside a table, needs `position: relative`, otherwise the hidden text widens the page. `.sr-only` could be made `position: absolute` with a `contain` hint, or tables should always be wrapped by a positioned scroll container (the report and sheets packages now do this).
