import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');
function worker({cached=true,offline=false}={}){
 const events={},removed=[],network=[],installs=[];
 const context={URL,Response,self:{location:{origin:'https://game.test'},registration:{scope:'https://game.test/'},addEventListener:(k,v)=>events[k]=v},caches:{open:async()=>({addAll:async assets=>installs.push(...assets),match:async url=>cached?new Response('pinned-v5:'+url):null}),keys:async()=>['trajectiq-4.0.0','trajectiq-5.0.0','trajectiq-5.0.0-ui1','unrelated-cache'],delete:async key=>removed.push(key)},fetch:async req=>{network.push(req);if(offline)throw Error('offline');return new Response('network');}};
 vm.runInNewContext(source,context);return {events,removed,network,installs};
}
test('Offline update waits for open clients and installs every module before activation',async()=>{
 const w=worker();let pending;w.events.install({waitUntil:p=>pending=p});await pending;
 assert.ok(w.installs.includes('./engine/copilot.js'));assert.ok(w.installs.includes('./data/nasa.js'));
 assert.doesNotMatch(source,/self\.skipWaiting\(|clients\.claim\(/);
 w.events.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(w.removed,['trajectiq-4.0.0','trajectiq-5.0.0']);
});
test('Cached shell remains one version online/offline, including query-string module requests',async()=>{
 for(const offline of [false,true]){const w=worker({offline});let result;w.events.fetch({request:{method:'GET',url:'https://game.test/engine/model.js?v=5'},respondWith:p=>result=p});assert.equal(await(await result).text(),'pinned-v5:https://game.test/engine/model.js');assert.equal(w.network.length,0);}
});
test('Offline cache miss produces an honest 503; external and export files are not intercepted',async()=>{
 const w=worker({cached:false,offline:true});let result;w.events.fetch({request:{method:'GET',url:'https://game.test/'},respondWith:p=>result=p});assert.equal((await result).status,503);
 for(const url of ['https://nasa.gov/','https://game.test/report.json']){let handled=false;w.events.fetch({request:{method:'GET',url},respondWith:()=>handled=true});assert.equal(handled,false);}
});
