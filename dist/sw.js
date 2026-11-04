const CACHE='trajectiq-6.0.0-ui2';
const ASSETS=['./','./index.html','./styles.css','./icon.svg','./ui/app.js','./ui/scene.js','./ui/space3d.js','./ui/panels.js','./data/nasa.js','./data/catalog.js','./data/scenarios.js','./data/learn.js','./engine/model.js','./engine/review.js','./engine/crew.js','./engine/share.js','./engine/assistant.js','./engine/copilot.js'];
// Precache the complete version so the game works offline after one visit.
// Online, the network wins so a returning player (or a judge) always gets the latest release;
// the cache is only the offline fallback. Old caches are removed on activation.
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('trajectiq-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 const scope=new URL(self.registration.scope);
 const relative='./'+url.pathname.slice(scope.pathname.length);
 if(!url.pathname.startsWith(scope.pathname)||!ASSETS.includes(relative))return;
 const key=new URL(relative,scope).href;
 event.respondWith(fetch(event.request).then(response=>{
  if(response&&response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(key,copy)).catch(()=>{}));}
  return response;
 }).catch(()=>caches.open(CACHE).then(cache=>cache.match(key)).then(cached=>cached||new Response('This game version is not cached yet. Reconnect once to load it.',{status:503,headers:{'Content-Type':'text/plain'}}))));
});
