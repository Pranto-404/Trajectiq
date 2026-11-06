# TRAJECTIQ: instructions for every session

## Resume rule (always)

If a session ended because of a usage or session limit, or you are starting fresh, **do not start over and do not ask what to do**. Read `docs/plan/PROGRESS.md`, check `git status`, `git log --oneline -15`, the current branch, and any running or finished agent outputs, then continue from "Next steps" in PROGRESS.md. Briefly tell the user where you are resuming from.

While working, keep `docs/plan/PROGRESS.md` up to date after every milestone, agent launch and agent result, and commit and push it, so the next session can resume without this conversation.

## Project

Space Mission Design Game for the NASA International Space Apps Challenge 2026 (event 2026-11-14). Live: https://trajectiq-omega.vercel.app/. Repo: https://github.com/Pranto-404/Trajectiq. `main` deploys to Vercel (`npm run build && npm test` runs first). Work on feature branches (currently `ux-v7`), merge to `main` only after full verification.

## Rules

- Pure engine and data (`dist/engine`, `dist/data`) are tested sources of truth; change them only in an engine-focused task and keep tests green.
- NASA data: every number needs a source URL and a verification date. If unverified, say so. Never invent values. Show NASA attribution for any NASA imagery or model. No runtime network access except the AI backup (automatic when the verified assistant refuses; the player can turn it off in the assistant's Tools & preferences), which only calls this site's own `/api/assist` function (strict CSP `connect-src 'self'` stays; the game works offline). The Gemini key exists only as the Vercel env var `GEMINI_API_KEY`; never write it to a file, a commit, a log or a chat reply.
- Security: strict CSP, no inline scripts, hostile-input tests; never `dangerouslySetInnerHTML`.
- Do not put team names or contributions in the web app. They belong in the README only, when the owner supplies them.
- Report honestly: say what was not tested (physical devices, other browsers, screen readers) and what failed.
- Git: commit with the `Co-Authored-By` trailer given in the session attribution; use new commits, not amends; never force-push.
- Shell: Python patch scripts sent through the shell mangle backslashes. Use the Edit tool for text containing backslashes.
- Use subagents for large independent work packages with exclusive file ownership, and verify their results yourself before reporting them as done.
