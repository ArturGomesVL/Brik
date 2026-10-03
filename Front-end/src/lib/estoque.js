import { STATUS_PADRAO } from '../data/produtosData.js'
import { mascaraReais, reaisParaNumero } from './format.js'
import { comprimirImagem } from './imagem.js'
import { apagarImagens, chaveDaMiniatura, enviarImagens, urlsDoEstoque, urlsEmCache } from './r2.js'
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

// Lista do usuário, do mais novo para o mais antigo, sem as fotos: as telas
// mostram as linhas logo e põem as capas depois (capasEmCache / comCapas).
export async function linhasDoEstoque() {
  const { data, error } = await supabase.from('estoque').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Capa do card: a miniatura da 1ª foto (`capa`, poucos KB) e a foto inteira
// (`capaGrande`) para quando a miniatura não existe — fotos enviadas antes das
// miniaturas, ou se o envio dela falhou. Quem mostra troca no onError.
const chavesDasCapas = (linhas) =>
  linhas.flatMap((item) => (item.fotos[0] ? [chaveDaMiniatura(item.fotos[0]), item.fotos[0]] : []))

const aplicarCapas = (linhas, urls) =>
  linhas.map((item) => {
    const foto = item.fotos[0]
    if (!foto || !urls[foto]) return item
    return { ...item, capa: urls[chaveDaMiniatura(foto)] ?? urls[foto], capaGrande: urls[foto] }
  })

// As linhas com as capas que já têm link guardado (sem rede): a tela pode
// mostrar as fotos na hora quando o usuário volta.
export const capasEmCache = (linhas) => aplicarCapas(linhas, urlsEmCache(chavesDasCapas(linhas)))

// As linhas com todas as capas (pede à função só os links que faltam).
export async function comCapas(linhas) {
  const chaves = chavesDasCapas(linhas)
  if (chaves.length === 0) return linhas
  return aplicarCapas(linhas, await urlsDasFotos(chaves))
}

export async function buscarProduto(id) {
  const { data, error } = await supabase.from('estoque').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

// { caminho: link temporário (1 h) }.
export const urlsDasFotos = urlsDoEstoque

// Lado maior da miniatura: os cards mostram a capa com 56–64 px, e 240 cobre
// telas de densidade 3x.
const LADO_MINIATURA = 240

// Reduz as fotos e sobe todas de uma vez para a pasta do produto, cada uma com
// a sua miniatura.
async function enviarFotos(produtoId, arquivos) {
  if (arquivos.length === 0) return []
  const [imagens, miniaturas] = await Promise.all([
    Promise.all(arquivos.map((arquivo) => comprimirImagem(arquivo))),
    Promise.all(arquivos.map((arquivo) => comprimirImagem(arquivo, LADO_MINIATURA, 0.8))),
  ])
  const { chaves } = await enviarImagens('estoque', imagens, produtoId, miniaturas)
  return chaves
}

// Apagar uma foto leva junto a miniatura (a função ignora a que não existir).
const comMiniaturas = (chaves) => chaves.flatMap((chave) => [chave, chaveDaMiniatura(chave)])

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
  await apagarImagens('estoque', comMiniaturas(removidas))
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
  await apagarImagens('estoque', comMiniaturas(produto.fotos))
}
