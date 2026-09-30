import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandHeader from '../components/BrandHeader.jsx'
import { FotoPerfil } from '../components/conta.jsx'
import {
  ArrowLeftIcon,
  CalendarIcon,
  CallIcon,
  CameraIcon,
  LockIcon,
  MailIcon,
  PencilIcon,
  PersonIcon,
  PinIcon,
  ShieldUserIcon,
  TrashIcon,
} from '../components/icons.jsx'
import { enviarAvatar, fotoDoProvedor, nomeDoProvedor, recarregarPerfil, removerAvatar, usePerfil } from '../lib/conta.js'
import { mascaraTelefone, mascaraUsuario } from '../lib/format.js'
import { supabase } from '../lib/supabase.js'
import { mensagemErro } from '../stores/useAuthStore.js'

// "Editar perfil", aberto pelo botão do Meu Perfil. Tela cheia, sem navbar (a
// rota fica fora do Layout). No desktop a foto fica numa coluna à esquerda e os
// dados à direita.
//
// Quem entrou por login social (Google, Discord...) tem nome, e-mail, telefone,
// data de nascimento e foto vindos do provedor: esses campos ficam travados e
// só a localização (e o nome de usuário, que é do Brik) se altera. O banco barra
// o resto também. O e-mail fica travado para todos: trocá-lo exige confirmar o
// novo endereço, fluxo que ainda não existe. A foto de quem entrou por e-mail vai
// para o Cloudflare R2 ao salvar.

// 21/08/2007 enquanto o usuário digita.
function mascaraData(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 8)
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/')
}

// "2007-08-21" (coluna date) -> "21/08/2007"
const isoParaData = (iso) => (iso ? iso.split('-').reverse().join('/') : '')

// "21/08/2007" -> "2007-08-21". Vazio vira null; data que não existe (31/02),
// futura ou anterior a 1900, undefined.
function dataParaIso(texto) {
  if (!texto) return null
  const [dia, mes, ano] = texto.split('/').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  const existe = data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  if (!existe || ano < 1900 || data > new Date()) return undefined
  return data.toISOString().slice(0, 10)
}

function Campo({ label, Icon, editavel = true, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-ink/50">{label}</span>
      <span
        className={`flex items-center gap-2.5 rounded-lg border border-line px-3 py-2.5 ${
          editavel ? 'bg-surface-card focus-within:border-brik' : 'bg-surface-raise'
        }`}
      >
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ink" />
        <input
          className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35 ${
            editavel ? 'text-ink' : 'cursor-not-allowed text-ink/60'
          }`}
          readOnly={!editavel}
          {...props}
        />
        {editavel ? (
          <PencilIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-ink/70" />
        ) : (
          <LockIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-ink/40" />
        )}
      </span>
    </label>
  )
}

function Secao({ Icon, titulo }) {
  return (
    <h2 className="flex items-center gap-1.5 text-sm font-bold text-brik">
      <Icon aria-hidden="true" className="h-4 w-4" />
      {titulo}
    </h2>
  )
}

// O formulário só nasce com o perfil carregado, já preenchido; a key o recria
// se outra conta entrar.
function EditarPerfil() {
  const conta = usePerfil()
  if (!conta.perfil) return null
  return <Formulario key={conta.user?.id} {...conta} />
}

// Nome e e-mail do login social vêm do provedor, que os mantém atualizados.
function formInicial(user, perfil, social) {
  return {
    nome: (social && nomeDoProvedor(user)) || perfil.nome || '',
    email: user?.email ?? '',
    telefone: mascaraTelefone(perfil.telefone ?? ''),
    nascimento: isoParaData(perfil.nascimento),
    localizacao: perfil.localizacao ?? '',
    usuario: perfil.usuario ?? '',
  }
}

function Formulario({ user, perfil, social }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(() => formInicial(user, perfil, social))
  // Foto nova escolhida (prévia + arquivo) e se a atual deve sair.
  const [foto, setFoto] = useState(null)
  const [arquivoFoto, setArquivoFoto] = useState(null)
  const [semFoto, setSemFoto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // A URL de pré-visualização precisa ser devolvida ao navegador quando troca.
  useEffect(() => () => foto && URL.revokeObjectURL(foto), [foto])

  const campo = (key, mascara = (v) => v) => ({
    value: form[key],
    onChange: (event) => setForm((atual) => ({ ...atual, [key]: mascara(event.target.value) })),
  })

  function trocarFoto(event) {
    const arquivo = event.target.files?.[0]
    if (arquivo) {
      setFoto(URL.createObjectURL(arquivo))
      setArquivoFoto(arquivo)
      setSemFoto(false)
    }
    event.target.value = ''
  }

  // Tira a foto recém-escolhida ou, sem ela, marca a atual para sair ao salvar.
  function tirarFoto() {
    if (foto) {
      setFoto(null)
      setArquivoFoto(null)
    } else {
      setSemFoto(true)
    }
  }

  const fotoMostrada = social ? fotoDoProvedor(user) : (foto ?? (semFoto ? null : perfil.avatar_url))

  async function salvar(event) {
    event.preventDefault()
    const voltar = () => navigate('/perfil', { viewTransition: true })
    if (!user) return voltar()
    setErro('')

    const usuario = form.usuario || null
    const dados = { localizacao: form.localizacao.trim() || null, usuario }

    if (!social) {
      const telefone = form.telefone.replace(/\D/g, '')
      if (telefone && telefone.length < 10) return setErro('Telefone incompleto: informe DDD e número.')
      const nascimento = dataParaIso(form.nascimento)
      if (nascimento === undefined) return setErro('Data de nascimento inválida.')
      Object.assign(dados, { nome: form.nome.trim() || null, telefone: telefone || null, nascimento })
    }

    setSalvando(true)
    const falhar = (mensagem) => {
      setErro(mensagem)
      setSalvando(false)
    }

    if (usuario && usuario !== perfil.usuario) {
      const { data: disponivel, error } = await supabase.rpc('usuario_disponivel', { p_usuario: usuario })
      if (error) return falhar(mensagemErro(error))
      if (!disponivel) return falhar('Esse nome de usuário já está em uso.')
    }

    // Foto (só login por e-mail): a nova sobe antes, e a antiga sai depois que
    // o perfil já aponta para a nova.
    const fotoAntiga = perfil.avatar_url
    if (!social && arquivoFoto) {
      try {
        dados.avatar_url = await enviarAvatar(arquivoFoto)
      } catch (error) {
        console.error('Erro ao enviar a foto:', error)
        return falhar('Não foi possível enviar a foto. Tente outra imagem.')
      }
    } else if (!social && semFoto) {
      dados.avatar_url = null
    }

    const { error } = await supabase.from('profiles').update(dados).eq('id', user.id)
    if (error) return falhar(error.code === '23505' ? 'Esse nome de usuário já está em uso.' : mensagemErro(error))
    if ('avatar_url' in dados && fotoAntiga) await removerAvatar(fotoAntiga)
    // Perfil e TopBar leem do cache: atualiza antes de voltar.
    await recarregarPerfil(user.id)
    voltar()
  }

  const travado = social ? { editavel: false, placeholder: 'Não informado' } : {}

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-surface pb-10 shadow-xl lg:max-w-4xl lg:pb-12 lg:shadow-none">
      <BrandHeader voltarPara="/perfil" />

      {/* No celular a seta e a logo estão no header verde, e o título é só para
          leitores de tela. No desktop o header some (a logo está na TopBar) e a
          seta com o título aparecem aqui. */}
      <div className="flex items-center gap-2 lg:px-8 lg:pb-8 lg:pt-10">
        <Link
          to="/perfil"
          viewTransition
          aria-label="Voltar"
          className="-ml-1 hidden h-9 w-9 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-raise lg:flex"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="sr-only text-[28px] font-bold tracking-tight text-ink lg:not-sr-only">Editar perfil</h1>
      </div>

      <form
        onSubmit={salvar}
        className="flex flex-col gap-4 px-4 lg:grid lg:grid-cols-[18rem_1fr] lg:items-start lg:gap-6 lg:px-8"
      >
        <section className="relative -mt-3 rounded-2xl bg-surface-card px-4 pb-4 pt-3 shadow-[0_6px_18px_-8px_rgba(43,43,43,0.35)] lg:mt-0">
          <h2 className="text-xs font-bold text-ink/50">Foto de Perfil</h2>

          <div className="mt-2 flex items-center gap-4">
            <FotoPerfil src={fotoMostrada} className="h-20 w-20" iconClassName="h-12 w-12" />

            {social ? (
              <p className="flex-1 border-l border-line pl-4 text-xs leading-relaxed text-ink/60">
                Sua foto vem da sua conta {social.nome}. Para trocá-la, altere lá.
              </p>
            ) : (
              <div className="flex flex-1 flex-col gap-2.5 border-l border-line pl-4">
                <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-brik py-1.5 text-xs font-medium text-brik transition-colors hover:bg-surface-raise">
                  <CameraIcon aria-hidden="true" className="h-4 w-4" />
                  Alterar Foto
                  <input type="file" accept="image/*" onChange={trocarFoto} className="sr-only" />
                </label>

                <button
                  type="button"
                  onClick={tirarFoto}
                  disabled={!fotoMostrada}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-loss py-1.5 text-xs font-medium text-loss transition-colors hover:bg-loss/10 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <TrashIcon aria-hidden="true" className="h-4 w-4" />
                  Remover Foto
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-surface-card p-4 shadow-[0_6px_18px_-8px_rgba(43,43,43,0.35)]">
          <Secao Icon={PersonIcon} titulo="Informações Pessoais" />

          {social && (
            <p className="-mt-1 text-[11px] leading-relaxed text-ink/60">
              Você entrou com {social.nome}: nome, e-mail, telefone e data de nascimento vêm de lá e não podem ser
              alterados aqui.
            </p>
          )}

          <Campo
            label="Nome Completo"
            Icon={PersonIcon}
            placeholder="Seu nome completo"
            autoComplete="name"
            {...campo('nome')}
            {...travado}
          />
          <Campo
            label="E-mail"
            Icon={MailIcon}
            type="email"
            editavel={false}
            placeholder="seuemail@exemplo.com"
            autoComplete="email"
            {...campo('email')}
          />
          <Campo
            label="Telefone"
            Icon={CallIcon}
            type="tel"
            inputMode="numeric"
            placeholder="(00) 00000-0000"
            autoComplete="tel"
            {...campo('telefone', mascaraTelefone)}
            {...travado}
          />
          <Campo
            label="Data de Nascimento"
            Icon={CalendarIcon}
            inputMode="numeric"
            placeholder="dd/mm/aaaa"
            autoComplete="bday"
            {...campo('nascimento', mascaraData)}
            {...travado}
          />
          <Campo
            label="Localização"
            Icon={PinIcon}
            placeholder="Rua, número"
            autoComplete="street-address"
            {...campo('localizacao')}
          />

          <div className="mt-2">
            <Secao Icon={ShieldUserIcon} titulo="Dados da Conta" />
          </div>

          <Campo
            label="Nome de Usuário"
            Icon={PersonIcon}
            placeholder="seu_usuario"
            autoComplete="username"
            autoCapitalize="none"
            minLength={3}
            title="De 3 a 20 caracteres: letras minúsculas, números, _ e ."
            {...campo('usuario', mascaraUsuario)}
          />
        </section>

        {erro && (
          <p role="alert" className="text-center text-xs text-loss lg:col-start-2 lg:text-right">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-brik py-3.5 text-center font-bold text-paper transition-colors hover:bg-brik-dark disabled:cursor-wait disabled:opacity-70 lg:col-start-2 lg:justify-self-end lg:px-12"
        >
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}

export default EditarPerfil
