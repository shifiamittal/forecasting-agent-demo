import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

// Log uncaught errors to console — the ErrorBoundary handles React render errors.
// We intentionally do NOT replace root.innerHTML here: doing so wipes the React
// DOM and causes the app to lose all state (empty clients, null cycleData).
window.onerror = function (message, source, lineno, colno, error) {
  console.error('[uncaught error]', message, `${source}:${lineno}:${colno}`, error)
}

window.onunhandledrejection = function (event) {
  console.error('[unhandled rejection]', event.reason)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
