/**
 * Sangeet Service Worker
 * Enables offline caching with Network-First strategy so updates appear instantly.
 */

const CACHE_NAME = "sangeet-cache-v14";
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
    "./manifest.json",
    "./data/library.json",
    "./data/banners.json",
    "./data/songs.json"
];

self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS).catch(() => {});
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
    if (e.request.method !== "GET") return;

    // Network-First strategy: ALWAYS fetch fresh version from internet/GitHub first!
    // Falls back to offline cache ONLY when internet is disconnected.
    e.respondWith(
        fetch(e.request)
            .then((networkRes) => {
                if (networkRes && networkRes.status === 200) {
                    const resClone = networkRes.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
                }
                return networkRes;
            })
            .catch(() => {
                return caches.match(e.request).then((cached) => {
                    if (cached) return cached;
                    if (e.request.mode === "navigate") {
                        return caches.match("./index.html");
                    }
                });
            })
    );
});
