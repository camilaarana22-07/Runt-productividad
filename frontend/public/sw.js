// Service worker mínimo: habilita la instalación de la PWA.
// No cachea la API (los datos siempre se piden frescos al servidor).
const CACHE = 'runt-v1';
const BASE = ['/', '/index.html', '/manifest.webmanifest', '/icono-192.png', '/icono-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Nunca cachear llamadas al API: siempre en vivo.
  if (url.pathname.startsWith('/api/')) return;
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html')))
  );
});
