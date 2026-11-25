/**
 * Sangeet Service Worker
 * Enables offline caching for application assets.
 */

const CACHE_NAME = "sangeet-cache-v1";
const ASSETS = [
    "./",
    "./index.html",
    "./css/style.css",
    "./js/db.js",
    "./js/id3.js",
    "./js/synth.js",
    "./js/audio.js",
    "./js/ui.js",
    "./js/app.js",
    "./manifest.json"
];

self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (e) => {
    // Only handle GET requests
    if (e.request.method !== "GET") return;

    e.respondWith(
        caches.match(e.request).then((cached) => {
            return cached || fetch(e.request).catch(() => {
                // If offline and request is HTML navigation, return cached index
                if (e.request.mode === "navigate") {
                    return caches.match("./index.html");
                }
            });
        })
    );
});
