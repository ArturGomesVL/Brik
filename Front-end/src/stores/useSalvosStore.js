import { create } from 'zustand'
import { supabase } from '../lib/supabase.js'

// Ofertas salvas com a estrela (public.salvos). Carrega no login (ver
// lib/sincronizarConta.js) e a estrela grava na hora: muda na tela e, se o
// banco recusar, volta.

// Retrato do anúncio guardado junto: o que o card precisa para ser desenhado
// mesmo depois de o anúncio sair do feed.
const CAMPOS_DO_RETRATO = [
  'id',
  'url',
  'title',
  'category',
  'variant',
  'condition',
  'price',
  'market_price',
  'location_city',
  'location_neighborhood',
  'opportunity_level',
  'image_url',
  'defeito',
  'first_seen_at',
]

const retrato = (item) => Object.fromEntries(CAMPOS_DO_RETRATO.map((campo) => [campo, item[campo] ?? null]))

export const useSalvosStore = create((set, get) => ({
  // Linhas de public.salvos, da mais nova para a mais antiga.
  itens: [],
  carregado: false,
  erro: null,

  carregar: async () => {
    const { data, error } = await supabase
      .from('salvos')
      .select('anuncio_url, anuncio, created_at')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Erro ao carregar os salvos:', error.message)
      set({ carregado: true, erro: 'Não foi possível carregar seus salvos.' })
      return
    }
    set({ itens: data, carregado: true, erro: null })
  },

  limpar: () => set({ itens: [], carregado: false, erro: null }),

  alternar: async (item) => {
    const antes = get().itens
    const salvo = antes.some((s) => s.anuncio_url === item.url)

    if (salvo) {
      set({ itens: antes.filter((s) => s.anuncio_url !== item.url) })
      const { error } = await supabase.from('salvos').delete().eq('anuncio_url', item.url)
      if (error) {
        console.error('Erro ao remover dos salvos:', error.message)
        set({ itens: antes })
      }
      return
    }

    const linha = { anuncio_url: item.url, anuncio: retrato(item), created_at: new Date().toISOString() }
    set({ itens: [linha, ...antes] })
    const { error } = await supabase.from('salvos').insert({ anuncio_url: linha.anuncio_url, anuncio: linha.anuncio })
    if (error) {
      console.error('Erro ao salvar a oferta:', error.message)
      set({ itens: antes })
    }
  },
}))
