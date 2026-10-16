import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(path.join(root,p),'utf8');
const css=await read('dist/styles.css');
const icon='data:image/svg+xml,'+encodeURIComponent(await read('dist/icon.svg'));
const strip=s=>s.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
const nasa=strip(await read('dist/data/nasa.js'));
const copilot=strip(await read('dist/engine/copilot.js'));
const assistant=strip(await read('dist/engine/assistant.js'));
const catalog=strip(await read('dist/data/catalog.js'));
const engine=strip(await read('dist/engine/model.js'));
const scene=strip(await read('dist/ui/scene.js'));
const scene3d=strip(await read('dist/ui/space3d.js'));
const app=strip(await read('dist/ui/app.js')).replace(/^if\('serviceWorker' in navigator\).*$/m,'').replaceAll('./icon.svg',icon);
const script=[nasa,catalog,'const M = MISSION;',engine,copilot,assistant,scene,scene3d,app].join('\n');
if(/^import |^export /m.test(script))throw new Error('Standalone file contains unresolved module imports or exports.');
const html=`<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#080d15"><meta name="description" content="The complete TRAJECTIQ mission design game. Standalone offline edition."><title>TRAJECTIQ — Complete offline game</title><link rel="icon" href="${icon}"><style>${css}</style></head><body><div id="app"></div><div id="modal-root"></div><div id="toast" role="status"></div><script type="module">${script.replaceAll('</script','<\\/script')}</script></body></html>`;
await writeFile(path.join(root,'dist/TRAJECTIQ_Play.html'),html);
console.log(`Standalone game generated: ${Buffer.byteLength(html).toLocaleString()} bytes. No runtime imports, external assets or server required.`);
