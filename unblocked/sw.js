// Study Hub service worker.
// Strategy: cache-first for same-origin, network-first for cross-origin.
// Takes over immediately on install/activate.

const VERSION = 'studyhub-v2';
const SHELL = [
  './',
  'index.html',
  'music.html',
  'movies.html',
  'settings.html',
  'styles.css',
  'games.js',
  'main.js',
  'music.js',
  'movies.js',
  'settings.js',
  'cloak-inherit.js',
];
// Self-coded game entry points.
const SELF_GAMES = [
  'games/snake.html',
  'games/2048.html',
  'games/tetris.html',
  'games/pong.html',
  'games/breakout.html',
  'games/flappy.html',
];
// Vendored game entry HTML files. Child assets are cached on first fetch.
const VENDORED_ENTRIES = [
  'games/centipede/index.html',
  'games/missile-command/index.html',
  'games/tetris-canvas/index.html',
  'games/pacman/index.html',
  'games/frogger/index.html',
  'games/asteroids/index.html',
  'games/fifteen/index.html',
  'games/memory/index.html',
  'games/lights-out/index.html',
  'games/reversi/index.html',
  'games/tictactoe/index.html',
  'games/solitaire/index.html',
  'games/tower/index.html',
  'games/bullet-hell/index.html',
  'games/physics/index.html',
  'games/codemonkey/index.html',
  'games/hangman/index.html',
];
const PRECACHE = SHELL.concat(SELF_GAMES).concat(VENDORED_ENTRIES);

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(VERSION).then((cache) => {
      // Pre-cache best-effort; a single 404 shouldn't block install.
      return Promise.all(PRECACHE.map(url =>
        cache.add(url).catch(() => null)
      ));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k === VERSION ? null : caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    // Cache-first. On miss, go to network and store a copy.
    event.respondWith(
      caches.match(req).then(hit => {
        if (hit) return hit;
        return fetch(req).then(resp => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const copy = resp.clone();
            caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
          }
          return resp;
        }).catch(() => hit);
      })
    );
  } else {
    // Network-first. Audio streams and cross-origin assets.
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
  }
});
