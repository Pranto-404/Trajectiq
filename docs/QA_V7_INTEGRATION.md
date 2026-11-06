# V7 integration QA — 2026-11-06

Work is on `ux-v7`, not production. Browser work used the owner's local Microsoft Edge. No remote browser was used.

## Fixes and improvements

- Mission board: interactive persistent 3D preview, destination filters, difficulty near the top, fixed mobile entry action, translated new controls.
- Header: responsive wrapping and constrained grid width.
- Hangar: improved fill lighting; canonical all-body destination action.
- Store: retain mission settings across preset changes; respect damaged-save protection; spend forecasts once through either assistant entry point; preserve the roll-call panel; safely redesign before a run exists; reset guidance.
- NASA exports: use the shared RFC 4180 CSV exporter, with correct destination filenames and per-row source dates. Image attribution links now resolve the stage's `source` property.
- Build: preserve the committed v6 offline artifact. A missing end-to-end test setup now exits with failure, not a false green.

## Source verification

Read https://ssd.jpl.nasa.gov/planets/phys_par.html in local Edge on 2026-11-06. Confirmed mean radii: Mercury 2439.4 km, Venus 6051.8 km, Earth 6371.0084 km, Mars 3389.50 km, Ceres 469.7 km. The game retains Earth's rounded 6371.0 km and labels the rounding as derived. Updated only the corresponding provenance records; no orbital constants changed. Other existing scientific fields were not reverified in this pass. Fictional equipment, costs and mission conditions remain teaching assumptions.

## Observed browser results

- Desktop: destination filtering and scenario selection; Balanced build retains Mars Dust Season; 12 launch checks pass; keyboard confirmation launches; actual WebGL stage renders.
- Mars Dust Season: reached dust-storm crisis at T+135; requested forecast; assistant marks it spent and the crisis forecast button disables. Committed Keep observing. Finished with 669 science, 82% battery, 862/1000 (A). Decision review ranks the alternatives.
- Crew: selected four players, opened animated roll call, signed all four roles; panel stayed open and reported all consoles ready.
- Mobile: Edge DevTools responsive mode at 375px; document scroll width also 375px on board, hangar and report. Visually inspected navigation, filters, fixed mission entry, hangar stage and parts tray, and report. This is desktop emulation, not a physical-phone test.
- Vendor warning: THREE.Clock is deprecated in favor of THREE.Timer. No first-party runtime errors observed during the desktop flow.

## Verification and limits

Final result: **371 Node tests and 342 UI tests passed**. Hosted build passed, including the 240 KB initial gzip budget check; total JavaScript across lazy chunks is 553.7 KB gzip. Single-file output is 1105.0 KB, with its generated SHA-256 CSP. A final build after the layout-only card-width adjustment also passed. Logs are in ignored `test-results/codex-*.log`.

`npm run build` and `npm test` verify hosted and single-file output, CSP hashes, security patterns, bundle budgets, engine behavior and UI regressions. The new regression cases cover settings retention, every destination, concurrent forecast use, empty-run redesign, roll-call persistence and filtering.

Not completed: physical devices, Safari, screen readers, axe audit, full crew crisis game in browser, offline reload, opening the standalone via file://, Linux CI, or production deployment. The repository's standalone build excludes WebGL and intentionally uses the SVG fallback. The browser e2e suite is not configured; manual Edge testing does not replace that release gate.
