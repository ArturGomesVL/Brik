import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AuthLayout,
  BotaoPrincipal,
  Campo,
  CampoSenha,
  CodigoEmail,
  ErroForm,
  RedesSociais,
  linkAuth,
} from '../components/auth.jsx'
import { ArrowRightIcon, MailIcon } from '../components/icons.jsx'
import { lembrarSessao, supabase } from '../lib/supabase.js'
import { mensagemErro } from '../stores/useAuthStore.js'

// Tela de login. Fundo, card de vidro e campos vêm de components/auth.jsx,
// compartilhados com o cadastro.

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [lembrar, setLembrar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  // Conta criada mas e-mail nunca confirmado: pede o código antes de entrar.
  const [confirmarEmail, setConfirmarEmail] = useState('')
  // Volta para onde a pessoa tentou ir antes de cair no login. Se ainda não
  // respondeu o quiz, a RotaProtegida desvia para ele.
  const destino = location.state?.de ?? '/'

  async function entrar(event) {
    event.preventDefault()
    setEnviando(true)
    setErro('')

    // Antes do login: é na hora de gravar a sessão que o cliente decide onde.
    lembrarSessao(lembrar)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })

    if (error?.code === 'email_not_confirmed') {
      // Manda um código novo; se o Supabase recusar por ser cedo demais, o
      // anterior ainda vale.
      await supabase.auth.resend({ type: 'signup', email: email.trim() })
      setEnviando(false)
      setConfirmarEmail(email.trim())
      return
    }

    setEnviando(false)
    if (error) {
      setErro(mensagemErro(error))
      return
    }
    entrou()
  }

  function entrou() {
    navigate(destino, { replace: true, viewTransition: true })
  }

  if (confirmarEmail) {
    return (
      <AuthLayout>
        <CodigoEmail email={confirmarEmail} onConfirmado={entrou} onVoltar={() => setConfirmarEmail('')} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <img src="/logoBrik.png" alt="Brik" className="mx-auto h-9 w-auto" />

      <h1 className="mt-3.5 text-center text-base font-medium">Seja bem-vindo!</h1>
      <p className="text-center text-xs text-paper/75">Faça login para continuar</p>

      <form onSubmit={entrar} className="mt-5 flex flex-col gap-3">
        <Campo
          label="E-mail"
          Icon={MailIcon}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <CampoSenha
          label="Senha"
          autoComplete="current-password"
          value={senha}
          onChange={(event) => setSenha(event.target.value)}
        />

        <div className="flex items-center justify-between text-[11px]">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={lembrar}
              onChange={(event) => setLembrar(event.target.checked)}
              className="peer sr-only"
            />
            {/* Caixa própria: a nativa marcada ficaria petróleo sobre o card verde. */}
            <span
              aria-hidden="true"
              className="flex h-3.5 w-3.5 items-center justify-center rounded border border-paper/70 bg-white/10 transition-colors peer-checked:border-paper peer-checked:bg-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mint"
            >
              {lembrar && (
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-brik" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m2.5 6.2 2.3 2.3 4.7-4.9" />
                </svg>
              )}
            </span>
            Lembrar-me
          </label>

          <Link to="/recuperar-senha" className="text-mint underline underline-offset-2 hover:text-paper">
            Esqueci minha senha
          </Link>
        </div>

        <ErroForm>{erro}</ErroForm>

        <BotaoPrincipal disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
          <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
        </BotaoPrincipal>
      </form>

      <RedesSociais lembrar={lembrar} destino={destino} />

      <p className="mt-6 text-center text-[11px] text-paper/80">
        Não tem uma conta?{' '}
        <Link to="/cadastro" viewTransition className={linkAuth}>
          Cadastre-se
        </Link>
      </p>
    </AuthLayout>
  )
}

export default Login
