import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/app.css'
import App from './App.tsx'

// Clear the save left by older builds; current data persists under DOMAIN_STORAGE_KEY.
try { localStorage.removeItem('followup-domain'); } catch { /* storage blocked */ }

createRoot(document.getElementById('root')!).render(<App />)
