/**
 * Service worker mínimo de SavR.
 *
 * Objetivo: que la app abra instantáneamente y que el shell siga disponible sin
 * red. NO cachea respuestas de Supabase ni rutas autenticadas: los datos de
 * dinero siempre se piden frescos, y así evitamos servir el estado de otra
 * sesión tras un cambio de cuenta.
 */
const CACHE = "savr-shell-v1";
const SHELL = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase y terceros: siempre red
  if (url.pathname.startsWith("/auth")) return;

  // sólo estáticos: cache-first
  if (SHELL.includes(url.pathname) || url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request)));
  }
});

/**
 * Web Push (pendiente de backend): cuando exista el cron que envía los
 * recordatorios, este handler ya sabe pintarlos.
 */
self.addEventListener("push", (event) => {
  const data = (() => {
    try {
      return event.data?.json() ?? {};
    } catch {
      return {};
    }
  })();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "SavR", {
      body: data.body ?? "Tu cuota de hoy sigue pendiente.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "savr-daily",
      data: { url: data.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? "/"));
});
