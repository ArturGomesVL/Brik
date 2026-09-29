import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { CallIcon, MailIcon, PersonIcon } from '../components/icons.jsx'
import { mascaraTelefone } from '../lib/format.js'
import { supabase } from '../lib/supabase.js'
import { mensagemErro } from '../stores/useAuthStore.js'

// Tela de cadastro: mesmo fundo e mesmo card de vidro do login. A conta é criada
// no Supabase Auth; usuário e telefone vão nos metadados e o trigger do banco
// copia para public.profiles.

const VAZIO = { usuario: '', email: '', telefone: '', senha: '', confirmar: '' }

// Mesma regra do check em profiles.usuario: minúsculas, números, "_" e ".".
const mascaraUsuario = (valor) => valor.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20)

function Cadastro() {
  const navigate = useNavigate()
  const [form, setForm] = useState(VAZIO)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  // E-mail para onde foi o código de confirmação, quando o projeto exige.
  const [confirmarEmail, setConfirmarEmail] = useState('')

  const campo = (key, mascara = (v) => v) => ({
    value: form[key],
    onChange: (event) => setForm((atual) => ({ ...atual, [key]: mascara(event.target.value) })),
  })

  // Só acusa depois que a confirmação começou a ser digitada.
  const senhasDiferentes = form.confirmar !== '' && form.confirmar !== form.senha

  async function cadastrar(event) {
    event.preventDefault()
    if (form.senha !== form.confirmar) return
    setEnviando(true)
    setErro('')

    const falhar = (mensagem) => {
      setErro(mensagem)
      setEnviando(false)
    }

    const { data: disponivel, error: erroUsuario } = await supabase.rpc('usuario_disponivel', {
      p_usuario: form.usuario,
    })
    if (erroUsuario) return falhar(mensagemErro(erroUsuario))
    if (!disponivel) return falhar('Esse nome de usuário já está em uso.')

    const email = form.email.trim()
    const { data, error } = await supabase.auth.signUp({
      email,
      password: form.senha,
      options: {
        data: { usuario: form.usuario, telefone: form.telefone.replace(/\D/g, '') },
      },
    })
    if (error) return falhar(mensagemErro(error))

    // Com confirmação de e-mail ligada, um e-mail já cadastrado não dá erro (para
    // não revelar quem tem conta): volta um usuário sem identidades.
    if (data.user?.identities?.length === 0) return falhar('Já existe uma conta com esse e-mail.')

    setEnviando(false)
    if (data.session) {
      navigate('/quiz', { viewTransition: true })
    } else {
      setConfirmarEmail(email)
    }
  }

  if (confirmarEmail) {
    return (
      <AuthLayout>
        <CodigoEmail
          email={confirmarEmail}
          onConfirmado={() => navigate('/quiz', { viewTransition: true })}
          onVoltar={() => setConfirmarEmail('')}
        />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-center text-lg font-bold uppercase tracking-wide">Cadastre-se</h1>

      <form onSubmit={cadastrar} className="mt-5 flex flex-col gap-3">
        <Campo
          label="Nome de usuário"
          Icon={PersonIcon}
          autoComplete="username"
          autoCapitalize="none"
          minLength={3}
          title="De 3 a 20 caracteres: letras minúsculas, números, _ e ."
          {...campo('usuario', mascaraUsuario)}
        />
        <Campo label="E-mail" Icon={MailIcon} type="email" autoComplete="email" {...campo('email')} />
        <Campo
          label="Telefone"
          Icon={CallIcon}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          pattern="\(\d{2}\) \d{4,5}-\d{4}"
          title="DDD e número, ex.: (81) 91234-5678"
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

        <ErroForm>{erro}</ErroForm>

        <BotaoPrincipal disabled={enviando}>{enviando ? 'Cadastrando…' : 'Cadastrar'}</BotaoPrincipal>
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
