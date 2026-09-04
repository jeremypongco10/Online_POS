// Intentionally does nothing. This exists purely because Android Chrome's
// "installable" check — the thing that decides whether "Add to Home
// Screen" launches a real chrome-free standalone app versus just a
// bookmark shortcut that still shows the address bar — looks for a
// registered service worker, on top of the manifest + HTTPS this app
// already has. See main.tsx for the registration and fullscreen.ts for
// why standalone-via-manifest is what this app relies on instead of the
// Fullscreen API on touch devices.
//
// No caching, no offline support, no interception: the fetch listener
// never calls event.respondWith(), so every request is left to proceed
// exactly as if this file didn't exist at all — including in the Vite dev
// server, where anything that DID intercept requests would break hot
// module reload.
self.addEventListener('fetch', () => {});
