import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// Começa a acompanhar a sessão do Supabase Auth já na abertura.
import './stores/useAuthStore.js'
// E a carregar/gravar no banco os dados do usuário que entrar.
import './lib/sincronizarConta.js'
import { usePreferenciasStore } from './stores/usePreferenciasStore.js'

// Modo escuro (Configurações): vira data-tema no <html>, e o index.css troca os
// tokens de cor. Aplica antes de montar, para a primeira tela já vir no tema
// certo, e de novo a cada vez que o interruptor muda.
function aplicarTema({ modoEscuro }) {
  document.documentElement.dataset.tema = modoEscuro ? 'escuro' : 'claro'
}
aplicarTema(usePreferenciasStore.getState())
usePreferenciasStore.subscribe(aplicarTema)

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
