/// <reference lib="webworker" />

const SW_VERSION = "1.0.0";
const CACHE_NAME = `ignite-cache-v${SW_VERSION}`;

const OFFLINE_URL = "/offline";

const PRECACHE_URLS = ["/offline"];

// Install: precache offline page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch: network-first with offline fallback for navigation requests
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches
        .match(OFFLINE_URL)
        .then((cached) => cached || new Response("Offline", { status: 503 })),
    ),
  );
});

// Push: show notification from server payload
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Ignite", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: data.tag || "ignite-notification",
    data: {
      url: data.url || "/",
      entityType: data.entityType,
      entityId: data.entityId,
    },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title || "Ignite", options));
});

// Notification click: focus or open the target URL
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) {
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
