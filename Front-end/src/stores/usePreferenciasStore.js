import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CATEGORIAS, NIVEIS } from '../config/categorias.js'
import { TODAS } from '../config/cidades.js'

// Ajustes do app: telas do Meu Perfil e filtros do Início. A fonte é a linha
// do usuário em public.configuracoes (lib/sincronizarConta.js carrega no login e
// grava a cada mudança); o localStorage guarda uma cópia, para a tela já abrir
// com os ajustes certos antes de o banco responder.

// Valores de quem ainda não mexeu em nada. É para eles que o app volta no logout.
export const PREFERENCIAS_PADRAO = {
  // Configurações > Aparência: o app inteiro no modo escuro (main.jsx aplica).
  modoEscuro: false,

  // Privacidade: o Dashboard já abre com os valores escondidos.
  ocultarValores: false,

  // Configurações: o que o Início mostra.
  categorias: CATEGORIAS.map((c) => c.value),
  nivelMinimo: 'boa',

  // Início: filtro de cidade (TODAS, um grupo como 'grande-recife' ou o nome
  // da cidade). Fica guardado para o Início reabrir na cidade de sempre.
  cidade: TODAS,

  // Início: botão Filtros. Quais selos aparecem (dentro do mínimo das
  // Configurações) e o máximo que a pessoa quer gastar (null = sem limite).
  niveis: NIVEIS.map((n) => n.value),
  precoMaximo: null,

  // Notificações: só as escolhas; os avisos ainda não são enviados.
  notificacoes: {
    oportunidades: true,
    extraordinarias: true,
    estoqueParado: false,
    novidades: false,
  },

  // Passos para seu primeiro Brique: índices dos passos marcados.
  passosFeitos: [],
}

export const usePreferenciasStore = create(
  persist(
    (set) => ({
      ...PREFERENCIAS_PADRAO,

      resetar: () => set(PREFERENCIAS_PADRAO),
      setModoEscuro: (modoEscuro) => set({ modoEscuro }),
      setOcultarValores: (ocultarValores) => set({ ocultarValores }),
      setNivelMinimo: (nivelMinimo) => set({ nivelMinimo }),
      setCidade: (cidade) => set({ cidade }),
      setNiveis: (niveis) => set({ niveis }),
      setPrecoMaximo: (precoMaximo) => set({ precoMaximo }),
      // Pelo menos uma categoria fica ligada, senão o Início ficaria sempre vazio.
      alternarCategoria: (value) =>
        set(({ categorias }) => {
          if (!categorias.includes(value)) return { categorias: [...categorias, value] }
          return categorias.length > 1 ? { categorias: categorias.filter((c) => c !== value) } : {}
        }),
      setNotificacao: (key, ligada) =>
        set(({ notificacoes }) => ({ notificacoes: { ...notificacoes, [key]: ligada } })),
      alternarPasso: (indice) =>
        set(({ passosFeitos }) => ({
          passosFeitos: passosFeitos.includes(indice)
            ? passosFeitos.filter((i) => i !== indice)
            : [...passosFeitos, indice],
        })),
    }),
    { name: 'brik-preferencias' },
  ),
)
