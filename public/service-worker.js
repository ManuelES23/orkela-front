// Se sube la versión para descartar la caché anterior, que guardaba cualquier
// página visitada (incluidas las URLs /portal/access/{token}).
const CACHE_NAME = "orkela-v2";
const RUNTIME_CACHE = "orkela-runtime-v2";

// Único documento que se guarda: el shell de la SPA para el modo sin conexión.
const APP_SHELL = "/index.html";

// Solo se guardan archivos estáticos propios. Nunca páginas por su URL: una
// URL puede llevar un token (enlaces del portal, callbacks de login).
const isCacheableAsset = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/img/") ||
    /^\/[^/]+\.(js|css|png|svg|ico|json|woff2?)$/.test(url.pathname));

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activación - Limpieza de cachés antiguos
self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => !currentCaches.includes(cacheName))
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Navegación: siempre a la red; sin conexión, el shell guardado.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(APP_SHELL, { cacheName: CACHE_NAME }).then(
          (cached) => cached || new Response("Offline", { status: 503, statusText: "Sin conexión" })
        )
      )
    );
    return;
  }

  // API, otros orígenes, etc.: sin interceptar.
  if (!isCacheableAsset(url)) return;

  // Estáticos: red primero, con respaldo en caché.
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) =>
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() =>
          cache.match(request).then(
            (cached) => cached || new Response("Offline", { status: 503, statusText: "Sin conexión" })
          )
        )
    )
  );
});

// Escuchar mensajes desde el cliente
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
