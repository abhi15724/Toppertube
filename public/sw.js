'use strict';
// Speed-up only: remembers thumbnails, the lesson list and the (version-stamped) scripts on the device.
// Pages and /api/ calls always go to the network, so nothing here can show old lessons for long.
const V = 'tt-v1', IMG = 'tt-img-v1', MAX_IMG = 400;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== V && k !== IMG) await caches.delete(k);
  await self.clients.claim();
})()));
async function trim(name, max) {
  const c = await caches.open(name), keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname === 'i.ytimg.com' && r.destination === 'image') {      // thumbnails: cache first
    e.respondWith((async () => {
      const c = await caches.open(IMG), hit = await c.match(r);
      if (hit) return hit;
      const res = await fetch(r);
      if (res && (res.ok || res.type === 'opaque')) { c.put(r, res.clone()); e.waitUntil(trim(IMG, MAX_IMG)); }
      return res;
    })());
    return;
  }
  if (u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  if (u.pathname === '/feed.json') {                                      // lesson list: show the saved copy at once, refresh in the background
    e.respondWith((async () => {
      const c = await caches.open(V), hit = await c.match(r);
      const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
    return;
  }
  if (/\.(js|png|ico|webmanifest)$/.test(u.pathname) && r.destination !== 'document') {   // scripts carry ?v=<stamp>, so a new deploy means a new address
    e.respondWith((async () => {
      const c = await caches.open(V), hit = await c.match(r);
      if (hit && u.search) return hit;
      const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
  }
});
