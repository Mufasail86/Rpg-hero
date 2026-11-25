const CACHE_PREFIX = "rpg-hero-shell-";
const CACHE = CACHE_PREFIX + "20261125-2";
const SCOPE = new URL(self.registration.scope);
const STATIC_SHELL = [
  "./", "./index.html", "./favicon.svg", "./manifest.webmanifest",
  "./art/small/hero-tavern-party-640.webp", "./art/small/hero-tavern-party-1280.webp",
  "./art/tactical/tavern.webp", "./art/tactical/arena.webp",
];

// Части сайта и справочника, которые грузятся по нужде. Скачиваем их заранее, чтобы всё работало без интернета.
async function precacheParts(cache) {
  try {
    const response = await fetch("./precache.json", { cache: "no-store" });
    if (!response.ok) return;
    const files = (await response.json()).filter(file => /^assets\/[\w.-]+\.(js|css)$/.test(file));
    let next = 0;
    async function worker() {
      while (next < files.length) {
        const file = files[next++];
        const url = `./${file}`;
        if (await cache.match(url)) continue;
        try {
          const part = await fetch(url);
          if (part.ok) await cache.put(url, part);
        } catch { /* остальные части всё равно доступны для скачивания */ }
      }
    }
    await Promise.allSettled([worker(), worker()]);
  } catch {
    /* без списка офлайн-копия соберётся по мере открытия экранов */
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await cache.addAll(STATIC_SHELL);
      await precacheParts(cache);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

async function serve(event, url) {
  const { request } = event;
  const cache = await caches.open(CACHE);
  const immutable = /^assets\/[\w.-]+-[\w-]+\.(js|css)$/.test(url.pathname.slice(SCOPE.pathname.length));
  if (immutable) {
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok && response.status !== 206) event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
    return response;
  } catch {
    return await cache.match(request, { ignoreVary: true })
      || (request.mode === "navigate" ? await cache.match("./index.html") : null)
      || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.headers.has("range")) return;
  const url = new URL(event.request.url);
  if (url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname) || url.pathname.endsWith("/sw.js")) return;
  event.respondWith(serve(event, url));
});
