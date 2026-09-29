import { useEffect, useState } from 'react'
import { DiscordIcon, GithubIcon, GoogleIcon } from '../components/icons.jsx'
import { useAuthStore } from '../stores/useAuthStore.js'
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

// Linha de public.profiles do usuário logado. `perfil` é null enquanto carrega;
// sem sessão (proteção de rotas desligada) volta vazio.
export function usePerfil() {
  const user = useAuthStore((state) => state.session?.user ?? null)
  const userId = user?.id
  const [perfil, setPerfil] = useState(null)

  useEffect(() => {
    if (!userId) return
    let ativo = true
    supabase
      .from('profiles')
      .select('nome, usuario, telefone, nascimento, localizacao')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!ativo) return
        if (error) console.error('Erro ao carregar o perfil:', error.message)
        setPerfil(data ?? {})
      })
    return () => {
      ativo = false
    }
  }, [userId])

  return { user, perfil: userId ? perfil : {}, social: contaSocial(user) }
}
