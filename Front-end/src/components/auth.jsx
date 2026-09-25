import { useState } from 'react'
import {
  DiscordIcon,
  EyeIcon,
  EyeOffIcon,
  FacebookIcon,
  GithubIcon,
  GoogleIcon,
  LinkedinIcon,
  LockIcon,
} from './icons.jsx'

// Peças comuns do login e do cadastro. As duas telas são cheias, sem navbar, com
// fundo verde-petróleo — então nada aqui usa o azul royal: o botão principal
// inverte a regra da marca (marfim com texto petróleo), os ícones dos campos são
// petróleo sobre branco e os links são verde-água.

const REDES = [
  { nome: 'Google', Icon: GoogleIcon },
  { nome: 'Facebook', Icon: FacebookIcon },
  { nome: 'Discord', Icon: DiscordIcon },
  { nome: 'GitHub', Icon: GithubIcon },
  { nome: 'LinkedIn', Icon: LinkedinIcon },
]

export function AuthLayout({ children }) {
  return (
    <div className="login-bg relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      {/* Manchas de luz atrás do card: sem nada contrastando por trás, o vidro
          liso não mostra o desfoque. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-y-[11rem] translate-x-8 rounded-full bg-mint/60 blur-2xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-[12rem] translate-y-16 rounded-full bg-[#1f7a5c]/70 blur-2xl"
      />

      <main className="glass-card w-full max-w-[18.5rem] rounded-3xl px-5 pb-6 pt-7 text-paper">{children}</main>
    </div>
  )
}

export function Campo({ label, Icon, invalido = false, children, ...props }) {
  return (
    <label
      className={`flex h-9 items-center gap-2 rounded-lg bg-white px-3 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.4)] ${
        invalido ? 'ring-2 ring-loss-soft' : 'focus-within:ring-2 focus-within:ring-mint'
      }`}
    >
      <span className="sr-only">{label}</span>
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-brik" />
      <input
        className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-ink/45"
        placeholder={label}
        aria-invalid={invalido || undefined}
        required
        {...props}
      />
      {children}
    </label>
  )
}

// Campo de senha com o olho para mostrar/ocultar. Cada campo controla o seu.
export function CampoSenha(props) {
  const [mostrar, setMostrar] = useState(false)

  return (
    <Campo Icon={LockIcon} type={mostrar ? 'text' : 'password'} {...props}>
      <button
        type="button"
        onClick={() => setMostrar((atual) => !atual)}
        aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={mostrar}
        className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-brik transition-colors hover:bg-brik/10"
      >
        {mostrar ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
      </button>
    </Campo>
  )
}

export function BotaoPrincipal({ children }) {
  return (
    <button
      type="submit"
      className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-paper py-2.5 text-sm font-bold text-brik shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)] transition-colors hover:bg-white"
    >
      {children}
    </button>
  )
}

export function RedesSociais({ acao = 'Entrar' }) {
  return (
    <>
      <div className="mt-6 flex items-center gap-2.5 text-[10px] text-paper/70">
        <span className="h-px flex-1 bg-paper/35" />
        ou continue com
        <span className="h-px flex-1 bg-paper/35" />
      </div>

      <ul className="mt-3 flex justify-center gap-2.5">
        {REDES.map(({ nome, Icon }) => (
          <li key={nome}>
            {/* TODO: login social pelo Supabase (signInWithOAuth). */}
            <button
              type="button"
              aria-label={`${acao} com ${nome}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-paper text-brik shadow-[0_4px_12px_-6px_rgba(0,0,0,0.5)] transition-transform hover:scale-105"
            >
              <Icon className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

export const linkAuth = 'font-medium text-mint underline underline-offset-2 hover:text-paper'
