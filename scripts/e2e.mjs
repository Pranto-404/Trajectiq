// npm run e2e: Playwright smoke tests (work package WP11). The dependency is added by WP11; until then this explains how.
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

if (!existsSync(new URL('../node_modules/@playwright/test', import.meta.url)) || !existsSync(new URL('../playwright.config.js', import.meta.url))) {
  console.log('Playwright is not installed yet (work package WP11 adds @playwright/test 1.64.1 and playwright.config.js).\nNothing to run.');
  process.exit(0);
}
const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['playwright', 'test', ...process.argv.slice(2)], {stdio: 'inherit', shell: process.platform === 'win32'});
process.exit(r.status ?? 1);
