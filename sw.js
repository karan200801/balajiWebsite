'use strict';
// The version covers the HTML, manifest, icons and worker source.
const CACHE='balaji-shell-ab155345f939e6b2';
const CORE=['/index.html','/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png','/icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    try{await cache.addAll(CORE.map(url=>new Request(url,{cache:'reload'})));}
    catch(error){await caches.delete(CACHE);throw error;}
    // Updates wait for the visitor's consent. First installations activate normally.
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
async function navigation(request){
  const cache=await caches.open(CACHE),controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4000);
  try{
    const response=await fetch(request,{signal:controller.signal});
    // Never persist redirects, authentication screens or failed responses.
    if(!response.ok||response.redirected)throw new Error('Navigation not cacheable');
    if(!response.headers.get('content-type')?.includes('text/html'))throw new Error('Unexpected navigation response');
    await cache.put('/index.html',response.clone()).catch(()=>{});
    return response;
  }catch(_){
    return (await cache.match('/index.html'))||new Response('Balaji is offline. Please reconnect once to save the website.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }finally{clearTimeout(timer);}
}
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  // No caching of forms, third-party links, APIs or non-GET requests.
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html')){
    event.respondWith(navigation(request));return;
  }
  if(CORE.includes(url.pathname)&&url.pathname!=='/index.html'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE),saved=await cache.match(url.pathname);
      if(saved)return saved;
      const response=await fetch(request);if(response.ok&&!response.redirected)await cache.put(url.pathname,response.clone());return response;
    })());
  }
});
