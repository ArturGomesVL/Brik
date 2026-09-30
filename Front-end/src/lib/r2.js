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
// `urls` só no bucket público.
export async function enviarImagens(bucket, imagens, pasta = '') {
  const form = new FormData()
  form.append('bucket', bucket)
  if (pasta) form.append('pasta', pasta)
  imagens.forEach((imagem, i) => form.append('arquivo', imagem, `foto-${i}.jpg`))
  return chamar(form)
}

// { chave: link temporário } das fotos privadas do estoque.
export async function urlsDoEstoque(chaves) {
  if (chaves.length === 0) return {}
  const { urls } = await chamar({ acao: 'urls', chaves })
  return urls
}

export async function apagarImagens(bucket, chaves) {
  if (chaves.length) await chamar({ acao: 'apagar', bucket, chaves })
}
