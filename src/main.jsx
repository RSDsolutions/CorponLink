import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Debug instrumentation: log visibility/focus/unload events to sessionStorage
if (import.meta.env.DEV) {
  const logEvent = (evt) => {
    try {
      const entry = { type: evt.type, time: new Date().toISOString() };
      console.debug('[debug-event]', entry);
      const prev = JSON.parse(sessionStorage.getItem('debug_events') || '[]');
      prev.push(entry);
      sessionStorage.setItem('debug_events', JSON.stringify(prev.slice(-50)));
      sessionStorage.setItem('last_debug_event', JSON.stringify(entry));
    } catch (e) { /* ignore */ }
  };

  ['visibilitychange', 'focus', 'blur', 'beforeunload', 'pagehide', 'pageshow', 'unload'].forEach(ev => {
    window.addEventListener(ev, logEvent, true);
  });

  // Print last event on startup
  try {
    const last = sessionStorage.getItem('last_debug_event');
    if (last) console.info('[debug-event] last:', JSON.parse(last));
  } catch (e) {}
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
