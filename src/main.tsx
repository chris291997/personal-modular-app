import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize theme based on preference
const stored = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const shouldBeDark = stored === 'dark' || (!stored && prefersDark);

if (shouldBeDark) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

// Force service worker update and unregister old ones that might be caching API calls
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      // Unregister old service workers that might have cached API routes
      registration.unregister().then((success) => {
        if (success) {
          console.log('Old service worker unregistered');
        }
      });
    });
  });

  // Register new service worker
  window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
          // Force update
          registration.update();
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
