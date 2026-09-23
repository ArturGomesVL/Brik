import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandHeader from '../components/BrandHeader.jsx'
import { ArrowLeftIcon, CameraIcon } from '../components/icons.jsx'
import { STATUS } from '../data/produtosData.js'

// Formulário de entrada no estoque, aberto pelo botão "Adicionar novo produto".
// Tela cheia, sem navbar: é uma tarefa com começo e fim.

const CATEGORIAS = [
  { value: 'iphone', label: 'Celular' },
  { value: 'videogame_console', label: 'Videogame / Console' },
  { value: 'audio', label: 'Áudio' },
  { value: 'outros', label: 'Outros' },
]

const VAZIO = {
  titulo: '',
  categoria: '',
  marca: '',
  estoque: '',
  custo: '',
  status: '',
  venda: '',
  descricao: '',
}

const CAMPO =
  'w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-brik'

function Campo({ label, value, onChange, ...props }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input className={CAMPO} placeholder={label} value={value} onChange={onChange} {...props} />
    </label>
  )
}

// O select nasce com o rótulo em cinza, como um placeholder, até ter escolha.
function Selecao({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className={`${CAMPO} appearance-none bg-[length:18px] bg-[right_1rem_center] bg-no-repeat ${
          value === '' ? 'text-ink/40' : ''
        }`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%230b1b4d' stroke-opacity='0.4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")",
        }}
      >
        <option value="" disabled>
          {label}
        </option>
        {options.map(({ value: option, label: texto }) => (
          <option key={option} value={option}>
            {texto}
          </option>
        ))}
      </select>
    </label>
  )
}

function Fotos({ fotos, onAdd }) {
  return (
    <div className="rounded-xl border border-dashed border-black/15 p-5">
      <label className="flex cursor-pointer flex-col items-center gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper text-ink/50">
          <CameraIcon className="h-6 w-6" />
        </span>
        <span className="text-xs font-bold text-ink">Adicionar fotos</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => onAdd([...event.target.files])}
        />
      </label>

      {fotos.length > 0 && (
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {fotos.map(({ url, nome }) => (
            <li key={url}>
              <img src={url} alt={nome} className="h-16 w-16 rounded-lg object-cover" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AdicionarProduto() {
  const navigate = useNavigate()
  const [form, setForm] = useState(VAZIO)
  const [fotos, setFotos] = useState([])

  // As URLs de pré-visualização precisam ser devolvidas ao navegador na saída.
  const fotosRef = useRef(fotos)
  useEffect(() => {
    fotosRef.current = fotos
  }, [fotos])
  useEffect(() => () => fotosRef.current.forEach(({ url }) => URL.revokeObjectURL(url)), [])

  const campo = (key) => ({
    value: form[key],
    onChange: (event) => setForm((atual) => ({ ...atual, [key]: event.target.value })),
  })

  function adicionarFotos(arquivos) {
    setFotos((atual) => [
      ...atual,
      ...arquivos.map((arquivo) => ({ url: URL.createObjectURL(arquivo), nome: arquivo.name })),
    ])
  }

  function enviar(event) {
    event.preventDefault()
    // TODO: gravar o produto no estoque. Ainda não existe onde guardar (não há
    // tabela de estoque no Supabase), então por enquanto só volta para a lista.
    navigate('/adicionar')
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-white pb-10 shadow-xl">
      <BrandHeader />

      <div className="flex items-center gap-2 px-4 pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-paper"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="flex-1 pr-9 text-center text-base font-bold text-ink">
          Adicionar produto no estoque
        </h1>
      </div>

      <form onSubmit={enviar} className="mt-5 flex flex-col gap-3 px-4">
        <Fotos fotos={fotos} onAdd={adicionarFotos} />

        <Campo label="Título:" required {...campo('titulo')} />
        <Selecao label="Categoria" options={CATEGORIAS} {...campo('categoria')} />
        <Campo label="Marca:" {...campo('marca')} />
        <Selecao
          label="Estoque"
          options={Array.from({ length: 10 }, (_, i) => ({
            value: String(i + 1),
            label: `${i + 1} ${i === 0 ? 'unidade' : 'unidades'}`,
          }))}
          {...campo('estoque')}
        />
        <Campo label="Custo:" inputMode="decimal" {...campo('custo')} />
        <Selecao
          label="Status"
          options={STATUS.map(({ key, label }) => ({ value: key, label }))}
          {...campo('status')}
        />
        <Campo label="Valor de venda:" inputMode="decimal" {...campo('venda')} />

        <label className="block">
          <span className="sr-only">Descrição</span>
          <textarea rows={4} placeholder="Descrição:" className={CAMPO} {...campo('descricao')} />
        </label>

        <button
          type="submit"
          className="mt-3 rounded-lg bg-gain py-3.5 text-center font-bold text-white"
        >
          Adicionar Produto
        </button>
      </form>
    </div>
  )
}

export default AdicionarProduto
