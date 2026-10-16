import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('Standalone output embeds the full game, resolves all assets and parses without imports',async()=>{
  const html=await readFile(new URL('../dist/TRAJECTIQ_Play.html',import.meta.url),'utf8');
  const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(()=>new vm.Script(script));
  assert.doesNotMatch(script,/^import |^export /m);
  assert.doesNotMatch(html,/href="\.\/|src="\.\//);
  assert.doesNotMatch(script,/serviceWorker\.register/);
  for(const s of ['function calculate','function newRun','function advance','function resolve','function debrief','function architect','function control','function debriefPage','function trade','function sources','function mentor','function quiz'])assert.ok(script.includes(s),s);
  assert.ok(html.includes('data:image/svg+xml,'));
});
