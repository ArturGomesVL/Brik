import { useEffect } from 'react'
import { create } from 'zustand'
import { DiscordIcon, GithubIcon, GoogleIcon } from '../components/icons.jsx'
import { useAuthStore } from '../stores/useAuthStore.js'
import { comprimirImagem } from './imagem.js'
import { supabase } from './supabase.js'

// Dados da conta logada. Quem entrou por login social (Google, Discord...) tem
// nome, e-mail e foto vindos do provedor — o Supabase os atualiza nos metadados
// a cada login — e não pode alterá-los aqui (o banco também barra). Quem entrou
// por e-mail e senha tem tudo em public.profiles.

// provider do Supabase Auth -> nome para mostrar e ícone (quando temos).
const PROVEDORES = {
  google: { nome: 'Google', Icon: GoogleIcon },
  discord: { nome: 'Discord', Icon: DiscordIcon },
  github: { nome: 'GitHub', Icon: GithubIcon },
  linkedin_oidc: { nome: 'LinkedIn' },
  facebook: { nome: 'Facebook' },
  apple: { nome: 'Apple' },
  azure: { nome: 'Microsoft' },
  twitter: { nome: 'X' },
}

// A plataforma com que a conta foi criada ({ provider, nome, Icon }), ou null
// para e-mail e senha.
export function contaSocial(user) {
  const provider = user?.app_metadata?.provider
  if (!provider || provider === 'email' || provider === 'phone') return null
  return { provider, nome: provider, ...PROVEDORES[provider] }
}

// Nome e foto como o provedor mandou. O GitHub só tem user_name quando a pessoa
// não preencheu o nome.
export function nomeDoProvedor(user) {
  const meta = user?.user_metadata ?? {}
  return meta.full_name || meta.name || meta.user_name || null
}

export function fotoDoProvedor(user) {
  const meta = user?.user_metadata ?? {}
  return meta.avatar_url || meta.picture || null
}

// Foto a mostrar: a do provedor no login social; a enviada em Editar perfil
// (profiles.avatar_url, bucket "avatars") no login por e-mail.
export function fotoDaConta(user, perfil) {
  return contaSocial(user) ? fotoDoProvedor(user) : (perfil?.avatar_url ?? null)
}

// Linha de public.profiles do usuário logado, guardada para todas as telas
// (Perfil, TopBar, Editar perfil): uma consulta por login, e de novo quando
// Editar perfil salva (recarregarPerfil).
const usePerfilCache = create(() => ({ userId: null, perfil: null }))
let buscando = null

export async function recarregarPerfil(userId) {
  buscando = userId
  const { data, error } = await supabase
    .from('profiles')
    .select('nome, usuario, telefone, nascimento, localizacao, avatar_url')
    .eq('id', userId)
    .maybeSingle()
  if (buscando !== userId) return
  buscando = null
  if (error) console.error('Erro ao carregar o perfil:', error.message)
  usePerfilCache.setState({ userId, perfil: data ?? {} })
}

// `perfil` é null enquanto carrega; sem sessão (proteção de rotas desligada)
// volta vazio.
export function usePerfil() {
  const user = useAuthStore((state) => state.session?.user ?? null)
  const userId = user?.id
  const { userId: doCache, perfil } = usePerfilCache()

  useEffect(() => {
    if (userId && doCache !== userId && buscando !== userId) recarregarPerfil(userId)
  }, [userId, doCache])

  return { user, perfil: !userId ? {} : doCache === userId ? perfil : null, social: contaSocial(user) }
}

// Foto de perfil (login por e-mail): sobe reduzida para <user_id>/<arquivo>.jpg
// e devolve a URL pública. A anterior só é apagada (removerAvatar) depois que o
// perfil já aponta para a nova, para não ficar um link quebrado se algo falhar.
const BUCKET_AVATAR = 'avatars'
const caminhoNoBucket = (url) => url?.split(`/object/public/${BUCKET_AVATAR}/`)[1] ?? null

export async function enviarAvatar(userId, arquivo) {
  const blob = await comprimirImagem(arquivo, 512)
  const caminho = `${userId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from(BUCKET_AVATAR)
    .upload(caminho, blob, { contentType: blob.type || 'image/jpeg' })
  if (error) throw error
  return supabase.storage.from(BUCKET_AVATAR).getPublicUrl(caminho).data.publicUrl
}

// Apaga do bucket a foto dessa URL (se for dele; a do provedor fica).
export async function removerAvatar(url) {
  const caminho = caminhoNoBucket(url)
  if (caminho) await supabase.storage.from(BUCKET_AVATAR).remove([caminho])
}
