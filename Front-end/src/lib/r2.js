import { supabase } from './supabase.js'

// Fotos no Cloudflare R2, pela Edge Function "r2" (supabase/functions/r2): o
// site não tem a chave do R2; a função tem, confere quem está logado e só mexe
// na pasta dele. Buckets: "estoque" (privado, links temporários) e "avatars"
// (público).

// Endereço público do bucket de avatares (o mesmo configurado na função).
export const URL_PUBLICA_AVATARS = 'https://pub-2fc78e4fb117416f900a47b733153785.r2.dev'

async function chamar(body) {
  const { data, error } = await supabase.functions.invoke('r2', { body })
  if (error) {
    // A função responde { erro } nos casos que ela mesma recusa.
    const detalhe = await error.context?.json?.().catch(() => null)
    throw new Error(detalhe?.erro ?? error.message)
  }
  return data
}

// Sobe as imagens (Blobs) para <user_id>/<pasta>/. Devolve { chaves, urls }:
// `urls` só no bucket público. `miniaturas[i]`, se vierem, são as versões
// pequenas de `imagens[i]` e ficam em chaveDaMiniatura(chave).
export async function enviarImagens(bucket, imagens, pasta = '', miniaturas = []) {
  const form = new FormData()
  form.append('bucket', bucket)
  if (pasta) form.append('pasta', pasta)
  imagens.forEach((imagem, i) => form.append('arquivo', imagem, `foto-${i}.jpg`))
  miniaturas.forEach((imagem, i) => form.append('miniatura', imagem, `mini-${i}.jpg`))
  return chamar(form)
}

// A mesma regra da função: "<…>/<uuid>.jpg" -> "<…>/<uuid>-mini.jpg".
export const chaveDaMiniatura = (chave) => chave.replace(/(\.\w+)$/, '-mini$1')

// Links temporários já pedidos, para não chamar a função de novo (nem baixar a
// foto de novo: o mesmo link cai no cache do navegador). A função assina por
// 1 h; guardamos por menos, para nunca usar um link perto de vencer. Fica no
// localStorage para valer também depois de recarregar a página.
const VALIDADE_CACHE_MS = 55 * 60 * 1000
const CHAVE_CACHE = 'brik:urls-estoque'

function lerCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(CHAVE_CACHE) ?? '{}')
    const agora = Date.now()
    return Object.fromEntries(Object.entries(cache).filter(([, { ate }]) => ate > agora))
  } catch {
    return {}
  }
}

function gravarCache(cache) {
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(cache))
  } catch {
    // Sem localStorage (aba anônima, cota): só não guarda.
  }
}

// { chave: link } das chaves que já têm link válido guardado, sem rede.
export function urlsEmCache(chaves) {
  const cache = lerCache()
  return Object.fromEntries(chaves.filter((chave) => cache[chave]).map((chave) => [chave, cache[chave].url]))
}

// { chave: link temporário } das fotos privadas do estoque. Só pede à função as
// que não estão no cache.
export async function urlsDoEstoque(chaves) {
  const guardadas = urlsEmCache(chaves)
  const faltam = [...new Set(chaves.filter((chave) => !guardadas[chave]))]
  if (faltam.length === 0) return guardadas

  const { urls } = await chamar({ acao: 'urls', chaves: faltam })
  const ate = Date.now() + VALIDADE_CACHE_MS
  const cache = lerCache()
  for (const [chave, url] of Object.entries(urls)) cache[chave] = { url, ate }
  gravarCache(cache)
  return { ...guardadas, ...urls }
}

export async function apagarImagens(bucket, chaves) {
  if (chaves.length) await chamar({ acao: 'apagar', bucket, chaves })
}
