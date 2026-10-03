import { STATUS_PADRAO } from '../data/produtosData.js'
import { mascaraReais, reaisParaNumero } from './format.js'
import { comprimirImagem } from './imagem.js'
import { apagarImagens, enviarImagens, urlsDoEstoque } from './r2.js'
import { supabase } from './supabase.js'

// Estoque do usuário (public.estoque) e as fotos dele (Cloudflare R2, bucket
// privado de estoque, em <user_id>/<produto_id>/<arquivo> — ver lib/r2.js). O
// RLS garante que cada um só vê e mexe no que é seu; aqui é só o acesso.

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
    status: form.status || STATUS_PADRAO,
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
  return comCapas(await linhasDoEstoque())
}

// Só as linhas, sem as fotos: uma consulta a menos para quem precisa dos
// números logo (o Dashboard) e pode pôr as capas depois.
export async function linhasDoEstoque() {
  const { data, error } = await supabase.from('estoque').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// As mesmas linhas com a URL da 1ª foto de cada uma (em `capa`).
export async function comCapas(linhas) {
  const capas = linhas.map((item) => item.fotos[0]).filter(Boolean)
  if (capas.length === 0) return linhas

  const urls = await urlsDasFotos(capas)
  return linhas.map((item) => ({ ...item, capa: item.fotos[0] ? urls[item.fotos[0]] : null }))
}

export async function buscarProduto(id) {
  const { data, error } = await supabase.from('estoque').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

// { caminho: link temporário (1 h) }.
export const urlsDasFotos = urlsDoEstoque

// Reduz as fotos e sobe todas de uma vez para a pasta do produto.
async function enviarFotos(produtoId, arquivos) {
  if (arquivos.length === 0) return []
  const imagens = await Promise.all(arquivos.map((arquivo) => comprimirImagem(arquivo)))
  const { chaves } = await enviarImagens('estoque', imagens, produtoId)
  return chaves
}

// Cria ou atualiza. `fotos` é a lista final na ordem da tela: caminhos já
// guardados (string) e arquivos novos (File). As fotos que saíram da lista são
// apagadas do bucket.
export async function salvarProduto({ id, form, fotos, fotosAntes = [] }) {
  const linha = paraLinha(form)

  let produtoId = id
  if (!produtoId) {
    const { data, error } = await supabase.from('estoque').insert(linha).select('id').single()
    if (error) throw error
    produtoId = data.id
  }

  const novas = fotos.filter((f) => typeof f !== 'string')
  if (!id && novas.length === 0) return produtoId
  const enviadas = await enviarFotos(produtoId, novas)
  let i = 0
  const caminhos = fotos.map((f) => (typeof f === 'string' ? f : enviadas[i++]))

  const { error } = await supabase
    .from('estoque')
    .update({ ...(id ? linha : {}), fotos: caminhos })
    .eq('id', produtoId)
  if (error) throw error

  const removidas = fotosAntes.filter((caminho) => !caminhos.includes(caminho))
  await apagarImagens('estoque', removidas)
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
  await apagarImagens('estoque', produto.fotos)
}
