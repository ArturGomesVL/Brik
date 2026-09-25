import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// Começa a acompanhar a sessão do Supabase Auth já na abertura.
import './stores/useAuthStore.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Splash (ver index.html): fica 5 segundos, contados desde a abertura da página
// — se o JS demorou a chegar, não soma espera. O app já monta por baixo, então
// os dados carregam enquanto ela está na tela.
const SPLASH_MINIMO = 5000
const splash = document.getElementById('splash')
if (splash) {
  setTimeout(() => {
    splash.classList.add('splash-hide')
    setTimeout(() => splash.remove(), 500)
  }, Math.max(0, SPLASH_MINIMO - performance.now()))
}
