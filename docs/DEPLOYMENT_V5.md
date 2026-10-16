# GitHub and Vercel deployment · v5

## Original deployment (16 October 2026); Git connection updated 17 October 2026

The user selected the connected **Pranto-404** GitHub account and its associated Vercel account for a new project. Vercel project `trajectiq` was successfully created in that connected account using its default account route. Explicit team-list access returned403, but default-account project creation and deployment succeeded.

- Production URL: **https://trajectiq-omega.vercel.app/**
- Vercel project: `prj_LyISYGwLw36E261jVIXvtl45BdlW`
- Deployment: `dpl_Eg8odXcRisPuwH3Bixv2XYHuKAvo`, **READY**.
- Build duration from deployment timestamps: approximately3.44seconds.
- Source: tested local v5 files submitted through the API, not Git-connected yet.
- The new project's first deployment was automatically classified as production by Vercel; no existing public game was replaced. A separate preview-before-promotion cycle did not occur.
- Managed Chrome live checks passed: Moon launch→crisis→refresh→paused restore→decision→completion;751/650units and115.6% shown. Mars selector,400km starter,125% battery forecast and unsupported-question fallback verified. Viewport1348×936 had no document horizontal overflow on the inspected hangar.

## GitHub source publication

The user created the public repository **https://github.com/Pranto-404/Trajectiq**. The connected GitHub account has write access. This release includes the full reviewed v5 source, tests, documentation, standalone game and build configuration, preserving the repository's initial README commit as its parent. Internal hosting metadata is excluded from the public source.

The existing Vercel project is now connected to **Pranto-404/Trajectiq** through the Vercel GitHub integration (17 October 2026, Asia/Dhaka). Its live domain remains **https://trajectiq-omega.vercel.app/**. Changes committed and pushed to the production branch `main` trigger deployment; saving a file locally alone does not publish it. Feature branches are used for preview deployments.

Build configuration: **Other** framework, repository root, **npm run build && npm test**, output **dist**. A failing test fails the deployment build. No runtime environment variables or paid API keys are required. The Git-triggered deployment result is verified separately after the maintenance commit is pushed.

For cached clients, close all game tabs and reopen after deployment to activate the new release. In-progress flights are not forcibly interrupted. The UI maintenance patch uses cache `trajectiq-5.0.0-ui1` while retaining the compatible 5.0.0 model/checkpoint schema.

## Alternative: preserve the previous repository history

1. Sign into an account with write access to `Sakib-183/trajectiq`, or have its owner grant the intended collaborator access. Connect that account to the integration used for publication.
2. Clone the existing repository using GitHub Desktop or Git. Create a branch named `trajectiq-v5`.
3. Extract the complete release ZIP and copy its project contents into the existing checkout. Preserve the checkout's `.git` directory/history. Do not initialize a new repository over it or force-push.
4. Run `npm run build` and `npm test` using Node.js22+. Inspect the diff; commit and push the branch. Open a pull request.
5. In Vercel, use the team that owns the existing TRAJECTIQ project. Verify its linked repository and production branch before changing anything. Connect the correct team access; the current403 is a scope authorization problem, not a build failure.
6. Framework: **Other**. Root: repository root. Build: **npm run build**. Output: **dist**. The included `vercel.json` supplies these settings and headers. No environment variables, paid services or API secrets are required.
7. Let the branch create a **preview deployment**. Verify it before merging/promoting. Confirm version5.0.0 in the navigation and the Moon/Mars selector.
8. Only after the following checks pass, merge/promote to the existing production project. Verify the actual returned production URL; do not assume a guessed hostname is assigned.

## Preview/production smoke checklist

- HTTPS, index, JS modules, CSS and icon load without404/MIME errors; no uncaught console errors.
- Moon balanced mission: launch → operations → decision → completion; debrief reflects returned science.
- Mars starter:400km orbit,586.2W/m² source, lower solar output, destination-specific assistant.
- Refresh during a crisis: checkpoint restored paused; decision applies once.
- Active-flight edits/relaunch/preset actions are guarded; cancel discard retains progress.
- Assistant125% battery experiment previews correctly; unrelated NASA career/temperature question is declined.
- Finish, inspect raw >100% result, compare and targeted-redesign without unrelated field changes.
- Uncertainty progress/cancel works without freezing navigation.
- Test widths and platforms listed in QA report; check touch scroll, keyboard modal focus,200% zoom and orientation.
- Wait for successful initial service-worker install; reload, then test offline. Close all tabs and reopen to adopt a new cache. Confirm old modules are not mixed with new ones.
- Download standalone HTML and open locally; export JSON is clearly read-only.

## Rollback and updates

Keep the prior known-working deployment. If preview/production smoke fails, roll back via Vercel's deployment controls and investigate before retrying. Restore only a reviewed commit; do not erase repository history. Model-version changes may block restoration of an incompatible in-progress checkpoint; the original is preserved for export/discard. Never promise automatic migration unless implemented and tested.

References: https://vercel.com/docs/project-configuration/vercel-json and https://vercel.com/docs/builds/configure-a-build .
