// Minimal service worker: caches the app shell so the site opens instantly
// (and still opens, showing a friendly offline message) even with no signal.
// Trial build: live data (waiting count, bookings, records) lives in the browser's local
// storage, not a network backend — this cache only covers the static app shell.
const CACHE_NAME = 'clinic-trial-shell-v1';
const SHELL_FILES = ['./index.html', './records.html', './firebase-mock.js', './seed-demo-data.js', './header.jpg', './icon-192.png', './icon-512.png', './manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Network-first for navigations/data so live booking info is never stale;
    // falls back to the cached shell only when there's no connection at all.
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request).then((res) => res || caches.match('./index.html')))
    );
});
