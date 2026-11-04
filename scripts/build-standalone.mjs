import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Normalise line endings so the output (and its CSP hash) is identical on Windows, macOS and Linux.
const read=async p=>(await readFile(path.join(root,p),'utf8')).replace(/\r\n/g,'\n');
const css=await read('dist/styles.css');
const icon='data:image/svg+xml,'+encodeURIComponent(await read('dist/icon.svg'));
const strip=s=>s.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const nasa=strip(await read('dist/data/nasa.js'));
const scenarios=strip(await read('dist/data/scenarios.js'));
const learn=strip(await read('dist/data/learn.js'));
const copilot=strip(await read('dist/engine/copilot.js'));
const assistant=strip(await read('dist/engine/assistant.js'));
const catalog=strip(await read('dist/data/catalog.js'));
const engine=strip(await read('dist/engine/model.js'));
const review=strip(await read('dist/engine/review.js'));
const crew=strip(await read('dist/engine/crew.js'));
const share=strip(await read('dist/engine/share.js'));
const panels=strip(await read('dist/ui/panels.js'));
const scene=strip(await read('dist/ui/scene.js'));
const scene3d=strip(await read('dist/ui/space3d.js'));
const app=strip(await read('dist/ui/app.js')).replace(/^if\('serviceWorker' in navigator\).*$/m,'').replaceAll('./icon.svg',icon);
const script=[nasa,scenarios,learn,catalog,'const M = MISSION;',engine,review,crew,share,copilot,assistant,panels,scene,scene3d,app].join('\n');
if(/^import |^export /m.test(script))throw new Error('Standalone file contains unresolved module imports or exports.');
// The standalone file is one document, so its policy lives in a meta tag and pins the exact inline script by hash.
const inlineScript=script.replaceAll('</script','<\\/script');
const scriptHash=createHash('sha256').update(inlineScript).digest('base64');
const policy=`default-src 'none'; script-src 'sha256-${scriptHash}'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'`;
const html=`<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#080d15"><meta name="description" content="The complete TRAJECTIQ mission design game. Standalone offline edition."><title>TRAJECTIQ — Complete offline game</title><link rel="icon" href="${icon}"><style>${css}</style></head><body><div id="app"></div><div id="modal-root"></div><div id="toast" role="status"></div><script type="module">${inlineScript}</script></body></html>`;
await writeFile(path.join(root,'dist/TRAJECTIQ_Play.html'),html);
console.log(`Standalone game generated: ${Buffer.byteLength(html).toLocaleString()} bytes. No runtime imports, external assets or server required.`);
