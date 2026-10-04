'use strict';
/* Balaji Pauva House — service worker v2
   Goal: open the app instantly, every time, even on a weak network.
   How: the saved page is shown immediately; a fresh copy downloads
   quietly in the background for the NEXT open. No spinner, no error page. */
const CACHE='balaji-shell-v2-c9f4e1ab';
const CORE=['/index.html','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png','/icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    /* Best effort: one failed asset must never wipe the whole shell. */
    await Promise.all(CORE.map(async url=>{
      try{
        if(await cache.match(url))return;
        const response=await fetch(new Request(url,{cache:'reload'}));
        if(response.ok&&!response.redirected)await cache.put(url,response.clone());
      }catch(_){}
    }));
    /* Updates wait for the visitor's consent (Update banner). First installs activate normally. */
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('balaji-shell-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
async function navigation(event){
  const cache=await caches.open(CACHE);
  const cached=await cache.match('/index.html');
  /* Quiet background refresh — keeps the next open fresh. Never blocks this one. */
  const freshen=fetch(event.request).then(async response=>{
    if(response.ok&&!response.redirected&&(response.headers.get('content-type')||'').includes('text/html')){
      await cache.put('/index.html',response.clone()).catch(()=>{});
    }
    return response;
  }).catch(()=>null);
  if(cached){
    try{event.waitUntil(freshen);}catch(_){}
    return cached; /* instant open — always */
  }
  /* First ever visit: wait for the network (generously). */
  const response=await freshen;
  if(response)return response;
  return new Response('Balaji is offline. Reconnect once and the app will be saved for instant opens.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html')){
    event.respondWith(navigation(event));return;
  }
  if(CORE.includes(url.pathname)&&url.pathname!=='/index.html'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE),saved=await cache.match(url.pathname);
      if(saved)return saved;
      try{
        const response=await fetch(request);
        if(response.ok&&!response.redirected)await cache.put(url.pathname,response.clone());
        return response;
      }catch(_){return new Response('',{status:504});}
    })());
  }
});
