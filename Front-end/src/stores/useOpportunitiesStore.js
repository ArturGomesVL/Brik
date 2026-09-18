import { create } from 'zustand'
import { supabase } from '../lib/supabase'

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

    set({ items: data, loading: false })
  },
}))
