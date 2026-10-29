import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import App from './App.tsx'

localStorage.removeItem('followup-domain');

createRoot(document.getElementById('root')!).render(<App />)
