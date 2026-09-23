import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandHeader from '../components/BrandHeader.jsx'
import {
  AvatarIcon,
  CalendarIcon,
  CallIcon,
  CameraIcon,
  MailIcon,
  PencilIcon,
  PersonIcon,
  PinIcon,
  ShieldUserIcon,
  TrashIcon,
} from '../components/icons.jsx'

// "Editar perfil", aberto pelo botão do Meu Perfil. Ainda não existe login,
// então os campos começam vazios e salvar só volta para o perfil. Tela cheia,
// sem navbar (a rota fica fora do Layout).

const VAZIO = {
  nome: '',
  email: '',
  telefone: '',
  nascimento: '',
  localizacao: '',
  usuario: '',
}

// (12) 34567-8910 enquanto o usuário digita.
function mascaraTelefone(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  const meio = d.length === 11 ? 7 : 6
  return `(${d.slice(0, 2)}) ${d.slice(2, meio)}-${d.slice(meio)}`
}

// 21/08/2007 enquanto o usuário digita.
function mascaraData(valor) {
  const d = valor.replace(/\D/g, '').slice(0, 8)
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/')
}

function Campo({ label, Icon, editavel = true, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-ink/50">{label}</span>
      <span className="flex items-center gap-2.5 rounded-lg border border-black/15 bg-white px-3 py-2.5 focus-within:border-brik">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-ink" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/35"
          {...props}
        />
        {editavel && <PencilIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-ink/70" />}
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

function EditarPerfil() {
  const navigate = useNavigate()
  const [form, setForm] = useState(VAZIO)
  const [foto, setFoto] = useState(null)

  // A URL de pré-visualização precisa ser devolvida ao navegador quando troca.
  useEffect(() => () => foto && URL.revokeObjectURL(foto), [foto])

  const campo = (key, mascara = (v) => v) => ({
    value: form[key],
    onChange: (event) => setForm((atual) => ({ ...atual, [key]: mascara(event.target.value) })),
  })

  function trocarFoto(event) {
    const arquivo = event.target.files?.[0]
    if (arquivo) setFoto(URL.createObjectURL(arquivo))
    event.target.value = ''
  }

  function salvar(event) {
    event.preventDefault()
    // TODO: gravar no perfil do usuário quando existir login.
    navigate('/perfil', { viewTransition: true })
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-white pb-10 shadow-xl">
      <BrandHeader voltarPara="/perfil" />

      <h1 className="sr-only">Editar perfil</h1>

      <form onSubmit={salvar} className="flex flex-col gap-4 px-4">
        <section className="relative -mt-3 rounded-2xl bg-white px-4 pb-4 pt-3 shadow-[0_6px_18px_-8px_rgba(11,27,77,0.35)]">
          <h2 className="text-xs font-bold text-ink/50">Foto de Perfil</h2>

          <div className="mt-2 flex items-center gap-4">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brik-dark text-white">
              {foto ? (
                <img src={foto} alt="Foto de perfil" className="h-full w-full object-cover" />
              ) : (
                <AvatarIcon aria-hidden="true" className="h-12 w-12" />
              )}
            </span>

            <div className="flex flex-1 flex-col gap-2.5 border-l border-black/10 pl-4">
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-brik py-1.5 text-xs font-medium text-brik transition-colors hover:bg-paper">
                <CameraIcon aria-hidden="true" className="h-4 w-4" />
                Alterar Foto
                <input type="file" accept="image/*" onChange={trocarFoto} className="sr-only" />
              </label>

              <button
                type="button"
                onClick={() => setFoto(null)}
                disabled={!foto}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-red-600 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <TrashIcon aria-hidden="true" className="h-4 w-4" />
                Remover Foto
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-[0_6px_18px_-8px_rgba(11,27,77,0.35)]">
          <Secao Icon={PersonIcon} titulo="Informações Pessoais" />

          <Campo
            label="Nome Completo"
            Icon={PersonIcon}
            editavel={false}
            placeholder="Seu nome completo"
            autoComplete="name"
            {...campo('nome')}
          />
          <Campo
            label="E-mail"
            Icon={MailIcon}
            type="email"
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
          />
          <Campo
            label="Data de Nascimento"
            Icon={CalendarIcon}
            inputMode="numeric"
            placeholder="dd/mm/aaaa"
            autoComplete="bday"
            {...campo('nascimento', mascaraData)}
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
            {...campo('usuario')}
          />
        </section>

        <button type="submit" className="rounded-lg bg-brik py-3.5 text-center font-bold text-white">
          Salvar alterações
        </button>
      </form>
    </div>
  )
}

export default EditarPerfil
