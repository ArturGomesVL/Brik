import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Faltam VITE_SUPABASE_URL e/ou VITE_SUPABASE_PUBLISHABLE_KEY. Crie Front-end/.env (veja .env.example) e reinicie o `npm run dev`.',
  )
}

// "Lembrar-me" do login: marcado, a sessão fica no localStorage e sobrevive a
// fechar o navegador; desmarcado, vai para o sessionStorage e some com a aba.
// Sem escolha feita (cadastro, link do e-mail), lembra.
const LEMBRAR = 'brik:lembrar'

const armazenamento = {
  getItem: (key) => localStorage.getItem(key) ?? sessionStorage.getItem(key),
  setItem: (key, value) => {
    const lembrar = localStorage.getItem(LEMBRAR) !== '0'
    ;(lembrar ? localStorage : sessionStorage).setItem(key, value)
    ;(lembrar ? sessionStorage : localStorage).removeItem(key)
  },
  removeItem: (key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export function lembrarSessao(lembrar) {
  localStorage.setItem(LEMBRAR, lembrar ? '1' : '0')
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { storage: armazenamento },
})

// Quais logins sociais estão ligados no painel do Supabase ({ google: true, ... }).
// Um provedor desligado leva a uma página de erro em JSON do Supabase, então o
// botão confere antes. Uma consulta por visita; se falhar, devolve null.
let provedores
export function provedoresAtivos() {
  provedores ??= fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabasePublishableKey } })
    .then((resposta) => resposta.json())
    .then((settings) => settings.external ?? {})
    .catch(() => {
      provedores = undefined
      return null
    })
  return provedores
}
