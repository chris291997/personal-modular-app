// Service Worker - Workbox will inject the manifest here
// The self.__WB_MANIFEST will be replaced during build

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' ||
               url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
    ],
  })
);

// Completely bypass service worker for API routes
// Use fetch event listener to intercept and bypass API calls
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // If it's an API route, fetch directly without service worker caching
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Network error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return; // Don't process further
  }
  
  // For all other routes, let Workbox handle them
});

// Skip waiting on update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
