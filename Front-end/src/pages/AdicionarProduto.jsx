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
  'w-full rounded-lg border border-line bg-white px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-ink/40 focus:border-brik'

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

// O quadrado de adicionar fica sozinho, grande e centralizado. As fotos
// escolhidas aparecem embaixo, três por linha, também em 1:1 e recortadas no
// centro para caber.
// Um terço da linha, descontados os dois espaços de 0,5rem.
const QUADRADO = 'w-[calc((100%-1rem)/3)]'

function Fotos({ fotos, onAdd }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <label className="flex aspect-square w-3/5 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-ink/25 bg-white text-center transition-colors hover:border-brik focus-within:border-brik">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-raise text-ink/50">
          <CameraIcon className="h-7 w-7" />
        </span>
        <span className="text-sm font-bold text-ink">Adicionar fotos</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            onAdd([...event.target.files])
            event.target.value = ''
          }}
        />
      </label>

      {fotos.length > 0 && (
        <ul className="flex w-full flex-wrap justify-center gap-2">
          {fotos.map(({ url, nome }) => (
            <li key={url} className={QUADRADO}>
              <img src={url} alt={nome} className="aspect-square w-full rounded-lg object-cover" />
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
    <div className="mx-auto min-h-screen w-full max-w-md bg-paper pb-10 shadow-xl">
      <BrandHeader />

      <div className="flex items-center gap-2 px-4 pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-raise"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="flex-1 pr-9 text-center text-base font-bold text-ink">
          Adicionar produto no estoque
        </h1>
      </div>

      <form onSubmit={enviar} className="mx-auto mt-5 flex w-full max-w-[20rem] flex-col gap-3 px-4 sm:px-0">
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
          className="mt-3 rounded-lg bg-brik py-3.5 text-center font-bold text-paper transition-colors hover:bg-brik-dark"
        >
          Adicionar Produto
        </button>
      </form>
    </div>
  )
}

export default AdicionarProduto
