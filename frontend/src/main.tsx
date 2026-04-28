/**
 * Entry point for the SoobApp React frontend.
 *
 * Mounts the root <App /> component into the DOM inside React StrictMode
 * (enables extra development warnings and double-renders for side-effect detection).
 * Global styles (Tailwind, @theme tokens, carrier colors) are loaded via index.css.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
