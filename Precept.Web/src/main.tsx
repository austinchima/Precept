import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('Precept PWA ServiceWorker registered with scope:', registration.scope);
        },
        (err) => {
          console.error('Precept PWA ServiceWorker registration failed:', err);
        }
      );
    });
  } else {
    // In dev the SW caches Vite's hashed chunks and serves stale ones,
    // breaking HMR and causing duplicate-React errors. Unregister and purge.
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    if (window.caches) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
