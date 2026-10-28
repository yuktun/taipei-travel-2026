const CACHE='taipei-shell-v1';const SHELL=['./','./index.html','./styles.css','./app.js','./core.js','./firebase-client.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('taipei-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!SHELL.some(path=>new URL(path,self.registration.scope).pathname===url.pathname))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
