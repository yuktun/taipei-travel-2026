const CACHE='taipei-shell-v11';
const SHELL=['./index.html','./styles.css?v=11','./app.js?v=11','./slow-days.js?v=11','./core.js?v=6','./offline.js?v=8','./device-offline.js?v=10','./place-stories.js?v=10','./touch-guard.js?v=10','./firebase-client.js?v=8','./icon-night-180.png','./icon-night-192.png','./icon-night-512.png','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(p=>new Request(new URL(p,self.registration.scope),{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('taipei-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const request=e.request, url=new URL(request.url), scope=new URL(self.registration.scope);
  if(request.method!=='GET'||url.origin!==scope.origin)return;
  const nav=request.mode==='navigate'&&[scope.pathname,new URL('index.html',scope).pathname].includes(url.pathname);
  if(!nav&&!SHELL.some(p=>new URL(p,scope).href===url.href))return;
  const cached=()=>caches.match(nav?new URL('index.html',scope):request,{cacheName:CACHE});
  e.respondWith(fetch(request).then(r=>r.ok?r:cached().then(c=>c||r)).catch(()=>cached().then(c=>c||Response.error())));
});
