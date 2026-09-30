import { useAuthStore } from '../stores/useAuthStore.js'
import { PREFERENCIAS_PADRAO, usePreferenciasStore } from '../stores/usePreferenciasStore.js'
import { useSalvosStore } from '../stores/useSalvosStore.js'
import { supabase } from './supabase.js'

// Liga os dados do usuário ao banco conforme a sessão muda (importado em
// main.jsx). No login: carrega os ajustes (public.configuracoes) e os salvos.
// Depois, cada mudança de ajuste é gravada. No logout: volta tudo ao padrão,
// para a próxima conta neste navegador não herdar nada.

// Campo do store -> coluna de public.configuracoes.
const COLUNAS = {
  modoEscuro: 'modo_escuro',
  ocultarValores: 'ocultar_valores',
  categorias: 'categorias',
  nivelMinimo: 'nivel_minimo',
  cidade: 'cidade',
  niveis: 'niveis',
  precoMaximo: 'preco_maximo',
  notificacoes: 'notificacoes',
  passosFeitos: 'passos_feitos',
}

const paraLinha = (estado) => Object.fromEntries(Object.entries(COLUNAS).map(([campo, col]) => [col, estado[campo]]))

function paraEstado(linha) {
  const estado = Object.fromEntries(Object.entries(COLUNAS).map(([campo, col]) => [campo, linha[col]]))
  // numeric chega como string; notificações novas ganham o padrão.
  estado.precoMaximo = linha.preco_maximo == null ? null : Number(linha.preco_maximo)
  estado.notificacoes = { ...PREFERENCIAS_PADRAO.notificacoes, ...linha.notificacoes }
  return estado
}

let usuario = null
// O que está no banco, para só gravar quando algo mudou de fato.
let gravado = null
// Enquanto aplica o que veio do banco, a mudança no store não volta para ele.
let aplicandoDoBanco = false
let timer = null

async function gravar() {
  const linha = paraLinha(usePreferenciasStore.getState())
  const texto = JSON.stringify(linha)
  if (!usuario || texto === gravado) return
  const { error } = await supabase.from('configuracoes').upsert({ user_id: usuario, ...linha })
  if (error) console.error('Erro ao salvar as configurações:', error.message)
  else gravado = texto
}

async function carregarConfiguracoes(userId) {
  const { data, error } = await supabase.from('configuracoes').select('*').eq('user_id', userId).maybeSingle()
  if (usuario !== userId) return
  if (error) {
    console.error('Erro ao carregar as configurações:', error.message)
    return
  }
  if (!data) {
    // Primeira vez com a tabela: leva o que já estava neste navegador.
    gravar()
    return
  }
  aplicandoDoBanco = true
  usePreferenciasStore.setState(paraEstado(data))
  aplicandoDoBanco = false
  gravado = JSON.stringify(paraLinha(usePreferenciasStore.getState()))
}

function aoMudarSessao({ session }) {
  const id = session?.user.id ?? null
  if (id === usuario) return
  const saiu = usuario !== null
  usuario = id
  gravado = null
  clearTimeout(timer)

  if (!id) {
    if (saiu) {
      aplicandoDoBanco = true
      usePreferenciasStore.getState().resetar()
      aplicandoDoBanco = false
      useSalvosStore.getState().limpar()
    }
    return
  }

  // Fora do callback do Auth: chamar o Supabase dentro dele trava o cliente.
  setTimeout(() => {
    carregarConfiguracoes(id)
    useSalvosStore.getState().carregar()
  }, 0)
}

usePreferenciasStore.subscribe(() => {
  if (aplicandoDoBanco || !usuario || gravado === null) return
  // Junta mudanças seguidas (arrastar a régua de preço, por exemplo).
  clearTimeout(timer)
  timer = setTimeout(gravar, 600)
})

aoMudarSessao(useAuthStore.getState())
useAuthStore.subscribe(aoMudarSessao)
