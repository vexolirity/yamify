// ============================================
// YAMIFY ULTIMATE - Service Worker
// PWA Support, Offline Cache
// ============================================

const CACHE_NAME = 'yamify-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/guest.html',
    '/assets/style.css',
    '/assets/mobile.css',
    '/assets/js/supabase-config.js',
    '/assets/js/auth.js',
    '/assets/js/library.js',
    '/assets/js/player.js',
    '/assets/js/playlist.js',
    '/assets/js/social.js',
    '/assets/js/upload.js',
    '/assets/js/stats.js',
    '/assets/js/effects.js',
    '/assets/js/lyrics.js',
    '/assets/js/radio.js',
    '/assets/js/realtime.js',
    '/assets/js/search.js',
    '/assets/js/settings.js',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
            .catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                return new Response('Offline', { status: 503 });
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});