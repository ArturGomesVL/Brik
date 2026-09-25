import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout, BotaoPrincipal, Campo, CampoSenha, RedesSociais, linkAuth } from '../components/auth.jsx'
import { CallIcon, MailIcon, PersonIcon } from '../components/icons.jsx'
import { mascaraTelefone } from '../lib/format.js'

// Tela de cadastro: mesmo fundo e mesmo card de vidro do login.

const VAZIO = { login: '', email: '', telefone: '', senha: '', confirmar: '' }

function Cadastro() {
  const navigate = useNavigate()
  const [form, setForm] = useState(VAZIO)

  const campo = (key, mascara = (v) => v) => ({
    value: form[key],
    onChange: (event) => setForm((atual) => ({ ...atual, [key]: mascara(event.target.value) })),
  })

  // Só acusa depois que a confirmação começou a ser digitada.
  const senhasDiferentes = form.confirmar !== '' && form.confirmar !== form.senha

  function cadastrar(event) {
    event.preventDefault()
    if (form.senha !== form.confirmar) return
    // TODO: criar a conta no Supabase (signUp com e-mail e senha; login e telefone no perfil).
    navigate('/quiz', { viewTransition: true })
  }

  return (
    <AuthLayout>
      <h1 className="text-center text-lg font-bold uppercase tracking-wide">Cadastre-se</h1>

      <form onSubmit={cadastrar} className="mt-5 flex flex-col gap-3">
        <Campo label="Login" Icon={PersonIcon} autoComplete="username" {...campo('login')} />
        <Campo label="E-mail" Icon={MailIcon} type="email" autoComplete="email" {...campo('email')} />
        <Campo
          label="Telefone"
          Icon={CallIcon}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          {...campo('telefone', mascaraTelefone)}
        />
        <CampoSenha label="Senha" autoComplete="new-password" minLength={6} {...campo('senha')} />
        <CampoSenha
          label="Confirme sua senha"
          autoComplete="new-password"
          invalido={senhasDiferentes}
          aria-describedby={senhasDiferentes ? 'senhas-diferentes' : undefined}
          {...campo('confirmar')}
        />
        {senhasDiferentes && (
          <p id="senhas-diferentes" role="alert" className="-mt-1.5 text-[11px] text-loss-soft">
            As senhas não conferem.
          </p>
        )}

        <BotaoPrincipal>Cadastrar</BotaoPrincipal>
      </form>

      <RedesSociais acao="Cadastrar" />

      <p className="mt-6 text-center text-[11px] text-paper/80">
        Já tem uma conta?{' '}
        <Link to="/login" viewTransition className={linkAuth}>
          Faça login
        </Link>
      </p>
    </AuthLayout>
  )
}

export default Cadastro
