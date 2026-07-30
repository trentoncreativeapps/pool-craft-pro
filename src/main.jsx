import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Registered after load so it never delays the initial paint. Wrapped in a
// try/catch-free feature check since some embedded/preview contexts don't
// expose navigator.serviceWorker at all.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});

    // sw.js calls skipWaiting()+clients.claim() on every install, so a new
    // version takes over almost immediately in the background - but the page
    // already open in this tab is still running the OLD code in memory until
    // it's reloaded. "controllerchange" fires exactly when that handover
    // happens (never on a plain first-ever visit, since there's no prior
    // controller to change from), so it's a reliable "you're stale now" signal
    // App.jsx listens for to show a refresh prompt instead of leaving people
    // stuck on an old build with no way to know.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.dispatchEvent(new Event('pcp-update-available'));
    });
  });
}
