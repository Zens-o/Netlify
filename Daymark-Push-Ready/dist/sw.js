const CACHE = 'daymark-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('/'))));
});
self.addEventListener('push', event => {
  let message = {}; try { message = event.data ? event.data.json() : {}; } catch {}
  event.waitUntil(self.registration.showNotification(message.title || 'Daymark', {body: message.body || 'Your next priority is ready.', icon: '/icon.svg', badge: '/icon.svg', tag: message.tag || 'daymark-reminder', data: {url: message.url || '/'}}));
});
self.addEventListener('notificationclick', event => {
  event.notification.close(); const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients => {const match = clients.find(client => client.url === target); return match ? match.focus() : self.clients.openWindow(target);}));
});
