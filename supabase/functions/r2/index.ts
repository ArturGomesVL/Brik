// Fotos do Brik no Cloudflare R2. O site não pode ter a chave do R2 (ficaria
// exposta no navegador), então passa por aqui: esta função guarda a chave
// (secrets R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY), confere quem
// está logado e só mexe na pasta dele (<user_id>/...).
//
// POST multipart (campos: bucket, pasta?, arquivo[]) -> envia; devolve { chaves, urls }
// POST JSON { acao: 'urls', chaves }                  -> links temporários (bucket privado de estoque)
// POST JSON { acao: 'apagar', bucket, chaves }        -> apaga

import { createClient } from 'npm:@supabase/supabase-js@2'
import { AwsClient } from 'npm:aws4fetch@1.0.20'

const BUCKETS: Record<string, { nome: string; limite: number; publico?: string }> = {
  estoque: { nome: 'brik-estoque', limite: 5 * 1024 * 1024 },
  avatars: {
    nome: 'brik-avatars',
    limite: 2 * 1024 * 1024,
    publico: 'https://pub-2fc78e4fb117416f900a47b733153785.r2.dev',
  },
}
const TIPOS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const MAX_ARQUIVOS = 10
const MAX_CHAVES = 200
// Links das fotos privadas valem 1 h — sobra para a tela aberta.
const VALIDADE_URL = 60 * 60

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const responder = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const conta = Deno.env.get('R2_ACCOUNT_ID')
const chaveId = Deno.env.get('R2_ACCESS_KEY_ID')
const segredo = Deno.env.get('R2_SECRET_ACCESS_KEY')
const r2 = new AwsClient({ accessKeyId: chaveId ?? '', secretAccessKey: segredo ?? '', service: 's3', region: 'auto' })
const urlDoObjeto = (bucket: string, chave: string) =>
  `https://${conta}.r2.cloudflarestorage.com/${bucket}/${chave.split('/').map(encodeURIComponent).join('/')}`

const apikey =
  Deno.env.get('SUPABASE_ANON_KEY') ?? JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}').default ?? ''
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', apikey)

class ErroDoPedido extends Error {}

async function enviar(form: FormData, uid: string) {
  const config = BUCKETS[String(form.get('bucket'))]
  if (!config) throw new ErroDoPedido('Bucket inválido.')
  const pasta = String(form.get('pasta') ?? '')
  if (pasta && !/^[a-z0-9-]{1,64}$/.test(pasta)) throw new ErroDoPedido('Pasta inválida.')

  const arquivos = form.getAll('arquivo').filter((a): a is File => a instanceof File)
  if (arquivos.length === 0 || arquivos.length > MAX_ARQUIVOS) throw new ErroDoPedido('Envie de 1 a 10 fotos.')
  for (const arquivo of arquivos) {
    if (!TIPOS[arquivo.type]) throw new ErroDoPedido('Formato não aceito: use JPEG, PNG ou WebP.')
    if (arquivo.size > config.limite) throw new ErroDoPedido('Foto grande demais.')
  }

  const chaves = await Promise.all(
    arquivos.map(async (arquivo) => {
      const chave = `${uid}/${pasta ? `${pasta}/` : ''}${crypto.randomUUID()}.${TIPOS[arquivo.type]}`
      const resposta = await r2.fetch(urlDoObjeto(config.nome, chave), {
        method: 'PUT',
        body: await arquivo.arrayBuffer(),
        headers: { 'Content-Type': arquivo.type },
      })
      if (!resposta.ok) throw new Error(`R2 recusou o envio (${resposta.status}): ${await resposta.text()}`)
      return chave
    }),
  )
  return { chaves, urls: config.publico ? chaves.map((c) => `${config.publico}/${c}`) : null }
}

async function urls(chaves: string[]) {
  const pares = await Promise.all(
    chaves.map(async (chave) => {
      const pedido = new Request(`${urlDoObjeto(BUCKETS.estoque.nome, chave)}?X-Amz-Expires=${VALIDADE_URL}`)
      const assinado = await r2.sign(pedido, { aws: { signQuery: true } })
      return [chave, assinado.url]
    }),
  )
  return { urls: Object.fromEntries(pares) }
}

async function apagar(bucket: string, chaves: string[]) {
  const config = BUCKETS[bucket]
  if (!config) throw new ErroDoPedido('Bucket inválido.')
  await Promise.all(
    chaves.map(async (chave) => {
      const resposta = await r2.fetch(urlDoObjeto(config.nome, chave), { method: 'DELETE' })
      if (!resposta.ok && resposta.status !== 404) throw new Error(`R2 recusou apagar (${resposta.status})`)
    }),
  )
  return { ok: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return responder({ erro: 'Método não permitido.' }, 405)
  if (!conta || !chaveId || !segredo) {
    return responder({ erro: 'R2 não configurado: faltam os secrets R2_ACCOUNT_ID, R2_ACCESS_KEY_ID ou R2_SECRET_ACCESS_KEY.' }, 500)
  }

  // verify_jwt já barrou quem não mandou um JWT válido; aqui pega quem é.
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? ''
  const { data, error } = await supabase.auth.getClaims(token)
  const uid = data?.claims?.sub
  if (error || !uid || data.claims.role !== 'authenticated') return responder({ erro: 'Faça login.' }, 401)

  const doUsuario = (chave: unknown) =>
    typeof chave === 'string' && chave.startsWith(`${uid}/`) && !chave.includes('..') && chave.length <= 300

  try {
    if ((req.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
      return responder(await enviar(await req.formData(), uid))
    }

    const corpo = await req.json()
    const chaves: unknown[] = Array.isArray(corpo.chaves) ? corpo.chaves : []
    if (chaves.length > MAX_CHAVES || !chaves.every(doUsuario)) {
      throw new ErroDoPedido('Chaves inválidas.')
    }
    if (corpo.acao === 'urls') return responder(await urls(chaves as string[]))
    if (corpo.acao === 'apagar') return responder(await apagar(String(corpo.bucket), chaves as string[]))
    throw new ErroDoPedido('Ação desconhecida.')
  } catch (erro) {
    if (erro instanceof ErroDoPedido) return responder({ erro: erro.message }, 400)
    console.error(erro)
    return responder({ erro: 'Falha ao falar com o R2.' }, 502)
  }
})
