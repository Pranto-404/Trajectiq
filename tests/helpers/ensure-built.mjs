import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Tests that inspect the build output build it first when site/ is missing (CI and Vercel build before testing).
export function ensureBuilt() {
  if (!existsSync(path.join(root, 'site/index.html')) || !existsSync(path.join(root, 'site/sw.js')) || !existsSync(path.join(root, 'site/TRAJECTIQ_Play.html'))) {
    execFileSync(process.execPath, [path.join(root, 'scripts/build.mjs')], {cwd: root, stdio: 'inherit'});
  }
  return path.join(root, 'site');
}
