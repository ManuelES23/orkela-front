const CACHE_NAME = "orkela-v1";
const RUNTIME_CACHE = "orkela-runtime";

// Archivos esenciales para cachear durante la instalación
const PRECACHE_URLS = ["/", "/index.html", "/src/main.jsx", "/src/index.css"];

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activación - Limpieza de cachés antiguos
self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return cacheNames.filter(
          (cacheName) => !currentCaches.includes(cacheName)
        );
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map((cacheToDelete) => {
            return caches.delete(cacheToDelete);
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Estrategia de fetch: Network First con fallback a Cache
self.addEventListener("fetch", (event) => {
  // Solo cachear peticiones GET
  if (event.request.method !== "GET") return;

  // Ignorar peticiones a la API (dejarlas pasar sin interceptar)
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("orkela.localhost")
  ) {
    return; // No interceptar, dejar que el navegador las maneje
  }

  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) => {
      return fetch(event.request)
        .then((response) => {
          // Si la respuesta es válida, clonarla y guardarla en caché
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar obtener de caché
          return cache.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si no está en caché, devolver página offline personalizada
            if (event.request.mode === "navigate") {
              return cache.match("/index.html");
            }
            return new Response("Offline", {
              status: 503,
              statusText: "Sin conexión",
            });
          });
        });
    })
  );
});

// Escuchar mensajes desde el cliente
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
