import { useEffect, useState } from 'react'
import { lembrarSessao, provedoresAtivos, supabase } from '../lib/supabase.js'
import { mensagemErro } from '../stores/useAuthStore.js'
import {
  DiscordIcon,
  EyeIcon,
  EyeOffIcon,
  GithubIcon,
  GoogleIcon,
  LockIcon,
  MailIcon,
} from './icons.jsx'

// Peças comuns do login e do cadastro. As duas telas são cheias, sem navbar, com
// fundo verde-petróleo — então nada aqui usa o azul royal: o botão principal
// inverte a regra da marca (marfim com texto petróleo), os ícones dos campos são
// petróleo sobre branco e os links são verde-água.

// provider: o nome do provedor no Supabase Auth.
const REDES = [
  { nome: 'Google', provider: 'google', Icon: GoogleIcon },
  { nome: 'Discord', provider: 'discord', Icon: DiscordIcon },
  { nome: 'GitHub', provider: 'github', Icon: GithubIcon },
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

export function BotaoPrincipal({ children, ...props }) {
  return (
    <button
      type="submit"
      className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-paper py-2.5 text-sm font-bold text-brik shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-70 disabled:hover:bg-paper"
      {...props}
    >
      {children}
    </button>
  )
}

// Erro de envio do formulário, logo acima do botão.
export function ErroForm({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="-mt-1 text-center text-[11px] text-loss-soft">
      {children}
    </p>
  )
}

// Login social: sai do app para o provedor e volta já logado em `destino`. Conta
// nova ganha perfil pelo trigger do banco e cai no quiz pela RotaProtegida.
export function RedesSociais({ acao = 'Entrar', lembrar = true, destino = '/' }) {
  const [indo, setIndo] = useState(null)
  const [erro, setErro] = useState('')

  async function entrarCom({ nome, provider }) {
    setErro('')
    setIndo(provider)

    const ativos = await provedoresAtivos()
    if (ativos && !ativos[provider]) {
      setErro(`${acao} com ${nome} ainda não está disponível.`)
      setIndo(null)
      return
    }

    lembrarSessao(lembrar)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${destino}` },
    })
    // Sem erro, o navegador já está saindo para o provedor.
    if (error) {
      setErro(mensagemErro(error))
      setIndo(null)
    }
  }

  return (
    <>
      <div className="mt-6 flex items-center gap-2.5 text-[10px] text-paper/70">
        <span className="h-px flex-1 bg-paper/35" />
        ou continue com
        <span className="h-px flex-1 bg-paper/35" />
      </div>

      <ul className="mt-3 flex justify-center gap-2.5">
        {REDES.map((rede) => (
          <li key={rede.provider}>
            <button
              type="button"
              onClick={() => entrarCom(rede)}
              disabled={indo !== null}
              aria-label={`${acao} com ${rede.nome}`}
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-paper text-brik shadow-[0_4px_12px_-6px_rgba(0,0,0,0.5)] transition-transform hover:scale-105 disabled:hover:scale-100 ${
                indo !== null && indo !== rede.provider ? 'opacity-50' : ''
              } ${indo === rede.provider ? 'animate-pulse' : ''}`}
            >
              <rede.Icon className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      {erro && (
        <p role="alert" className="mt-2.5 text-center text-[11px] text-loss-soft">
          {erro}
        </p>
      )}
    </>
  )
}

// Espera entre um reenvio e outro: o Supabase recusa pedidos mais próximos.
const ESPERA_REENVIO = 60

// Confirmação do e-mail por código: o e-mail de cadastro traz um código (o
// template do Supabase usa {{ .Token }}) que a pessoa digita aqui. Chega com o
// código acabado de enviar, por isso o reenvio começa bloqueado.
export function CodigoEmail({ email, onConfirmado, onVoltar }) {
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [espera, setEspera] = useState(ESPERA_REENVIO)

  useEffect(() => {
    if (espera === 0) return
    const timer = setTimeout(() => setEspera(espera - 1), 1000)
    return () => clearTimeout(timer)
  }, [espera])

  async function confirmar(event) {
    event.preventDefault()
    setEnviando(true)
    setErro('')
    setAviso('')

    const { error } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'email' })
    setEnviando(false)
    if (error) {
      setErro(mensagemErro(error))
      return
    }
    onConfirmado()
  }

  async function reenviar() {
    setErro('')
    setAviso('')
    setEspera(ESPERA_REENVIO)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) setErro(mensagemErro(error))
    else setAviso('Enviamos um novo código.')
  }

  return (
    <>
      <MailIcon aria-hidden="true" className="mx-auto h-9 w-9 text-mint" />
      <h1 className="mt-3 text-center text-base font-bold">Confirme seu e-mail</h1>
      <p className="mt-2 text-center text-xs leading-relaxed text-paper/80">
        Enviamos um código para <strong className="break-all text-paper">{email}</strong>. Digite-o abaixo para ativar
        sua conta.
      </p>

      <form onSubmit={confirmar} className="mt-5 flex flex-col gap-3">
        {/* O tamanho do código é configurável no Supabase (6 a 10 dígitos). */}
        <label className="flex h-11 items-center rounded-lg bg-white px-3 shadow-[0_4px_12px_-6px_rgba(0,0,0,0.4)] focus-within:ring-2 focus-within:ring-mint">
          <span className="sr-only">Código</span>
          <input
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            minLength={6}
            required
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-center text-lg font-bold tracking-[0.35em] text-ink outline-none placeholder:text-ink/25"
          />
        </label>

        <ErroForm>{erro}</ErroForm>
        {aviso && (
          <p role="status" className="-mt-1 text-center text-[11px] text-mint">
            {aviso}
          </p>
        )}

        <BotaoPrincipal disabled={enviando || codigo.length < 6}>{enviando ? 'Confirmando…' : 'Confirmar'}</BotaoPrincipal>
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-[11px] text-paper/80">
        <p>
          Não recebeu?{' '}
          {espera > 0 ? (
            <span>Reenvie em {espera}s</span>
          ) : (
            <button type="button" onClick={reenviar} className={linkAuth}>
              Reenviar código
            </button>
          )}
        </p>
        <button type="button" onClick={onVoltar} className={linkAuth}>
          Usar outro e-mail
        </button>
      </div>
    </>
  )
}

export const linkAuth = 'font-medium text-mint underline underline-offset-2 hover:text-paper'
