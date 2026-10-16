const CACHE='trajectiq-5.0.0-ui1';
const ASSETS=['./','./index.html','./styles.css','./icon.svg','./ui/app.js','./ui/scene.js','./ui/space3d.js','./data/nasa.js','./data/catalog.js','./engine/model.js','./engine/assistant.js','./engine/copilot.js'];
// Install the complete version before making it eligible to activate. Do not
// force activation over a running flight: close all game tabs to adopt updates.
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('trajectiq-')&&k!==CACHE).map(k=>caches.delete(k))))));
// Cache-first pins the shell to a coherent release instead of mixing modules.
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 const scope=new URL(self.registration.scope);
 const relative='./'+url.pathname.slice(scope.pathname.length);
 if(!url.pathname.startsWith(scope.pathname)||!ASSETS.includes(relative))return;
 event.respondWith(caches.open(CACHE).then(cache=>cache.match(new URL(relative,scope).href)).then(cached=>cached||fetch(event.request)).catch(()=>new Response('This game version is not cached yet. Reconnect once to load it.',{status:503,headers:{'Content-Type':'text/plain'}})));
});
