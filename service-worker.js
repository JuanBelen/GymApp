const CACHE_NAME = "gymapp-v2";
const ASSETS = [
  "/GymApp/",
  "/GymApp/index.html",
  "/GymApp/styles.css",
  "/GymApp/app.js",
  "/GymApp/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).catch(
        () =>
          new Response("Sin conexión y recurso no cacheado.", {
            status: 503,
          })
      );
    })
  );
});
