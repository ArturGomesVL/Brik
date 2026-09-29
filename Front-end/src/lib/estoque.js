import { mascaraReais, reaisParaNumero } from './format.js'
import { comprimirImagem } from './imagem.js'
import { supabase } from './supabase.js'

// Estoque do usuário (public.estoque) e as fotos dele (bucket privado
// "estoque", em <user_id>/<produto_id>/<arquivo>). O RLS garante que cada um só
// vê e mexe no que é seu; aqui é só o acesso.

const BUCKET = 'estoque'
// As URLs assinadas valem por 1 h — sobra para a tela aberta.
const VALIDADE_URL = 60 * 60

// Valores em reais: no formulário vão com a máscara ("1.234,56").
const reaisOuNull = (texto) => (texto ? reaisParaNumero(texto) : null)
const paraMascara = (valor) => (valor == null ? '' : mascaraReais(String(Math.round(Number(valor) * 100))))

export const FORM_VAZIO = {
  titulo: '',
  categoria: '',
  marca: '',
  quantidade: '',
  custo: '',
  status: '',
  venda: '',
  descricao: '',
}

// Formulário (strings) -> colunas da tabela.
function paraLinha(form) {
  return {
    titulo: form.titulo.trim(),
    categoria: form.categoria || null,
    marca: form.marca.trim() || null,
    quantidade: Number(form.quantidade) || 1,
    custo: reaisOuNull(form.custo),
    venda: reaisOuNull(form.venda),
    status: form.status || 'aguardando',
    descricao: form.descricao.trim() || null,
  }
}

// Linha da tabela -> formulário, para editar.
export function paraForm(produto) {
  return {
    titulo: produto.titulo,
    categoria: produto.categoria ?? '',
    marca: produto.marca ?? '',
    quantidade: String(produto.quantidade),
    custo: paraMascara(produto.custo),
    status: produto.status,
    venda: paraMascara(produto.venda),
    descricao: produto.descricao ?? '',
  }
}

// Lista do usuário, do mais novo para o mais antigo, com a URL da 1ª foto de
// cada produto (em `capa`).
export async function listarEstoque() {
  const { data, error } = await supabase.from('estoque').select('*').order('created_at', { ascending: false })
  if (error) throw error

  const capas = data.map((item) => item.fotos[0]).filter(Boolean)
  if (capas.length === 0) return data

  const urls = await urlsDasFotos(capas)
  return data.map((item) => ({ ...item, capa: item.fotos[0] ? urls[item.fotos[0]] : null }))
}

export async function buscarProduto(id) {
  const { data, error } = await supabase.from('estoque').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

// { caminho: url assinada }. Caminho sem URL (arquivo sumiu) fica de fora.
export async function urlsDasFotos(caminhos) {
  if (caminhos.length === 0) return {}
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(caminhos, VALIDADE_URL)
  if (error) throw error
  return Object.fromEntries(data.filter((f) => f.signedUrl).map((f) => [f.path, f.signedUrl]))
}

async function enviarFotos(userId, produtoId, arquivos) {
  return Promise.all(
    arquivos.map(async (arquivo) => {
      const blob = await comprimirImagem(arquivo)
      const caminho = `${userId}/${produtoId}/${crypto.randomUUID()}.jpg`
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, blob, { contentType: blob.type || 'image/jpeg' })
      if (error) throw error
      return caminho
    }),
  )
}

// Cria ou atualiza. `fotos` é a lista final na ordem da tela: caminhos já
// guardados (string) e arquivos novos (File). As fotos que saíram da lista são
// apagadas do bucket.
export async function salvarProduto({ id, userId, form, fotos, fotosAntes = [] }) {
  const linha = paraLinha(form)

  let produtoId = id
  if (!produtoId) {
    const { data, error } = await supabase.from('estoque').insert(linha).select('id').single()
    if (error) throw error
    produtoId = data.id
  }

  const novas = fotos.filter((f) => typeof f !== 'string')
  if (!id && novas.length === 0) return produtoId
  const enviadas = await enviarFotos(userId, produtoId, novas)
  let i = 0
  const caminhos = fotos.map((f) => (typeof f === 'string' ? f : enviadas[i++]))

  const { error } = await supabase
    .from('estoque')
    .update({ ...(id ? linha : {}), fotos: caminhos })
    .eq('id', produtoId)
  if (error) throw error

  const removidas = fotosAntes.filter((caminho) => !caminhos.includes(caminho))
  if (removidas.length) await supabase.storage.from(BUCKET).remove(removidas)
  return produtoId
}

export async function mudarStatus(id, status) {
  const { error } = await supabase.from('estoque').update({ status }).eq('id', id)
  if (error) throw error
}

// Apaga o produto e as fotos dele.
export async function apagarProduto(produto) {
  const { error } = await supabase.from('estoque').delete().eq('id', produto.id)
  if (error) throw error
  if (produto.fotos.length) await supabase.storage.from(BUCKET).remove(produto.fotos)
}
