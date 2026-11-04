import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

export const PRECACHE_EXCLUDE = new Set(['sw.js', 'TRAJECTIQ_Play.html']);

// Every emitted file of the hosted build, as service-worker-relative URLs ('./assets/x.js'), plus the entry URL './'.
export async function listPrecache(siteDir) {
  const out = [];
  async function walk(dir, prefix) {
    for (const entry of await readdir(dir, {withFileTypes: true})) {
      const rel = prefix + entry.name;
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), rel + '/');
      else if (!PRECACHE_EXCLUDE.has(rel)) out.push('./' + rel);
    }
  }
  await walk(siteDir, '');
  return ['./', ...out.sort()];
}

export function cacheName(version, assets, indexHtml) {
  const hash = createHash('sha256').update(assets.join('\n')).update(indexHtml).digest('hex').slice(0, 10);
  return `trajectiq-${version}-${hash}`;
}

export function renderServiceWorker(template, {cache, assets}) {
  if (!/\/\*ASSETS\*\/\[\]/.test(template) || !template.includes("const CACHE = 'trajectiq-dev';")) throw new Error('Service worker template markers not found.');
  return template.replace(/\/\*ASSETS\*\/\[\]/, () => JSON.stringify(assets)).replace("const CACHE = 'trajectiq-dev';", () => `const CACHE = '${cache}';`);
}

export async function renderFromDisk(root, siteDir, version) {
  const template = (await readFile(path.join(root, 'src/sw/sw.template.js'), 'utf8')).replace(/\r\n/g, '\n');
  const assets = await listPrecache(siteDir);
  const indexHtml = await readFile(path.join(siteDir, 'index.html'), 'utf8');
  return {assets, source: renderServiceWorker(template, {cache: cacheName(version, assets, indexHtml), assets})};
}
