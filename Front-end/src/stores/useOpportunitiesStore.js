import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// Mesma referência usada pelo worker para classificar oportunidades.
const MIN_AMOSTRAS = 3

export const useOpportunitiesStore = create((set) => ({
  items: [],
  loading: false,

  fetchOpportunities: async () => {
    set({ loading: true })

    const { data, error } = await supabase
      .from('anuncios_ativos')
      .select('*')
      .neq('opportunity_level', 'nenhuma')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar oportunidades:', error.message)
      set({ items: [], loading: false })
      return
    }

    // A média de mercado não fica na tabela: vem da função media_precos_mercado,
    // uma chamada por combinação categoria+variante+condição.
    const combos = [...new Set(data.map((i) => `${i.category}|${i.variant}|${i.condition}`))]
    const medias = new Map()

    await Promise.all(
      combos.map(async (combo) => {
        const [category, variant, condition] = combo.split('|')
        const { data: rows, error: rpcError } = await supabase.rpc('media_precos_mercado', {
          p_category: category,
          p_variant: variant,
          p_condition: condition,
        })

        if (rpcError) {
          console.error('Erro ao buscar média de mercado:', rpcError.message)
          return
        }

        const row = rows?.[0]
        if (row && row.amostras >= MIN_AMOSTRAS && row.preco_mediano != null) {
          medias.set(combo, Number(row.preco_mediano))
        }
      }),
    )

    const items = data.map((item) => ({
      ...item,
      market_price: medias.get(`${item.category}|${item.variant}|${item.condition}`) ?? null,
    }))

    set({ items, loading: false })
  },
}))
