import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BrandHeader from '../components/BrandHeader.jsx'
import { ArrowLeftIcon, CameraIcon } from '../components/icons.jsx'
import { STATUS } from '../data/produtosData.js'
import { buscarProduto, FORM_VAZIO, paraForm, salvarProduto, urlsDasFotos } from '../lib/estoque.js'
import { mascaraReais } from '../lib/format.js'
import { mensagemErro } from '../stores/useAuthStore.js'

// Formulário do estoque: entrada de produto (/adicionar/novo, pelo botão
// "Adicionar novo produto") e edição (/adicionar/editar/:id, pelo menu do card
// em Meus Produtos). Grava em public.estoque e as fotos no Cloudflare R2.
// Tela cheia, sem navbar: é uma tarefa com começo e fim. No desktop as fotos
// ficam à esquerda e os campos à direita.

const CATEGORIAS = [
  { value: 'iphone', label: 'Celular' },
  { value: 'videogame_console', label: 'Videogame / Console' },
  { value: 'audio', label: 'Áudio' },
  { value: 'outros', label: 'Outros' },
]

// Mesmo limite do check em estoque.fotos.
const MAX_FOTOS = 10

const CAMPO =
  'w-full rounded-lg border border-line bg-surface-card px-4 py-3.5 text-[15px] text-ink outline-none placeholder:text-ink/40 focus:border-brik'

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
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23808080' stroke-opacity='0.8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")",
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
// centro para caber, cada uma com o × para tirar.
// Um terço da linha, descontados os dois espaços de 0,5rem.
const QUADRADO = 'w-[calc((100%-1rem)/3)]'

function Fotos({ fotos, onAdd, onRemove }) {
  const cheio = fotos.length >= MAX_FOTOS
  return (
    <div className="flex flex-col items-center gap-3">
      <label
        className={`flex aspect-square w-3/5 flex-col items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-ink/25 bg-surface-card text-center transition-colors lg:w-full ${
          cheio ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-brik focus-within:border-brik'
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-raise text-ink/50">
          <CameraIcon className="h-7 w-7" />
        </span>
        <span className="text-sm font-bold text-ink">Adicionar fotos</span>
        <span className="text-xs text-ink/50">
          {fotos.length}/{MAX_FOTOS}
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={cheio}
          className="sr-only"
          onChange={(event) => {
            onAdd([...event.target.files])
            event.target.value = ''
          }}
        />
      </label>

      {fotos.length > 0 && (
        <ul className="flex w-full flex-wrap justify-center gap-2">
          {fotos.map((foto, i) => (
            <li key={foto.chave} className={`relative ${QUADRADO}`}>
              <img src={foto.url} alt={`Foto ${i + 1}`} className="aspect-square w-full rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => onRemove(foto.chave)}
                aria-label={`Tirar a foto ${i + 1}`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-sm leading-none text-white transition-colors hover:bg-black/75"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Carrega o produto (na edição) antes de montar o formulário, já preenchido.
function AdicionarProduto() {
  const { id } = useParams()
  const [inicial, setInicial] = useState(id ? null : { form: FORM_VAZIO, fotos: [] })
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!id) return
    let ativo = true
    ;(async () => {
      const produto = await buscarProduto(id)
      if (!produto) throw new Error('Produto não encontrado.')
      const urls = await urlsDasFotos(produto.fotos)
      if (!ativo) return
      setInicial({
        form: paraForm(produto),
        fotos: produto.fotos.map((caminho) => ({ chave: caminho, caminho, url: urls[caminho] })),
      })
    })().catch((error) => ativo && setErro(error.message))
    return () => {
      ativo = false
    }
  }, [id])

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-surface pb-10 shadow-xl lg:max-w-4xl lg:pb-12 lg:shadow-none">
      <BrandHeader />
      {inicial ? (
        <Formulario key={id ?? 'novo'} id={id} inicial={inicial} />
      ) : (
        <p role={erro ? 'alert' : 'status'} className="px-4 py-16 text-center text-sm text-ink/60">
          {erro || 'Carregando produto…'}
        </p>
      )}
    </div>
  )
}

function Formulario({ id, inicial }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(inicial.form)
  // { chave, url, caminho } das já guardadas; { chave, url, arquivo } das novas.
  const [fotos, setFotos] = useState(inicial.fotos)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // As URLs de pré-visualização das fotos novas precisam ser devolvidas ao
  // navegador na saída.
  const fotosRef = useRef(fotos)
  useEffect(() => {
    fotosRef.current = fotos
  }, [fotos])
  useEffect(
    () => () => fotosRef.current.forEach((foto) => foto.arquivo && URL.revokeObjectURL(foto.url)),
    [],
  )

  const campo = (key, mascara = (v) => v) => ({
    value: form[key],
    onChange: (event) => setForm((atual) => ({ ...atual, [key]: mascara(event.target.value) })),
  })

  function adicionarFotos(arquivos) {
    setFotos((atual) => [
      ...atual,
      ...arquivos.slice(0, MAX_FOTOS - atual.length).map((arquivo) => {
        const url = URL.createObjectURL(arquivo)
        return { chave: url, url, arquivo }
      }),
    ])
  }

  function tirarFoto(chave) {
    setFotos((atual) => {
      const foto = atual.find((f) => f.chave === chave)
      if (foto?.arquivo) URL.revokeObjectURL(foto.url)
      return atual.filter((f) => f.chave !== chave)
    })
  }

  async function enviar(event) {
    event.preventDefault()
    setSalvando(true)
    setErro('')
    try {
      await salvarProduto({
        id,
        form,
        fotos: fotos.map((foto) => foto.caminho ?? foto.arquivo),
        fotosAntes: inicial.fotos.map((foto) => foto.caminho),
      })
      // Volta para a lista já na aba do produto (sem situação, ele vai para Aguardando).
      navigate('/adicionar', { replace: true, viewTransition: true, state: { aba: form.status || 'aguardando' } })
    } catch (error) {
      console.error('Erro ao salvar o produto:', error)
      setErro(mensagemErro(error))
      setSalvando(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 px-4 pt-4 lg:px-8 lg:pt-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-raise"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="flex-1 pr-9 text-center text-base font-bold text-ink lg:pr-0 lg:text-left lg:text-[28px] lg:tracking-tight">
          {id ? 'Editar produto' : 'Adicionar produto no estoque'}
        </h1>
      </div>

      <form
        onSubmit={enviar}
        className="mx-auto mt-5 flex w-full max-w-[20rem] flex-col gap-3 px-4 sm:px-0 lg:mt-8 lg:grid lg:max-w-none lg:grid-cols-[18rem_1fr] lg:items-start lg:gap-10 lg:px-8"
      >
        <Fotos fotos={fotos} onAdd={adicionarFotos} onRemove={tirarFoto} />

        <div className="flex flex-col gap-3">
          <Campo label="Título:" required maxLength={120} {...campo('titulo')} />
          <Selecao label="Categoria" options={CATEGORIAS} {...campo('categoria')} />
          <Campo label="Marca:" maxLength={60} {...campo('marca')} />
          <Selecao
            label="Estoque"
            options={Array.from({ length: 10 }, (_, i) => ({
              value: String(i + 1),
              label: `${i + 1} ${i === 0 ? 'unidade' : 'unidades'}`,
            }))}
            {...campo('quantidade')}
          />
          <Campo label="Custo (R$):" inputMode="numeric" {...campo('custo', mascaraReais)} />
          <Selecao
            label="Status"
            options={STATUS.map(({ key, label }) => ({ value: key, label }))}
            {...campo('status')}
          />
          <Campo label="Valor de venda (R$):" inputMode="numeric" {...campo('venda', mascaraReais)} />

          <label className="block">
            <span className="sr-only">Descrição</span>
            <textarea rows={4} maxLength={2000} placeholder="Descrição:" className={CAMPO} {...campo('descricao')} />
          </label>

          {erro && (
            <p role="alert" className="text-center text-sm text-loss">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="mt-3 rounded-lg bg-brik py-3.5 text-center font-bold text-paper transition-colors hover:bg-brik-dark disabled:cursor-wait disabled:opacity-70"
          >
            {salvando ? 'Salvando…' : id ? 'Salvar alterações' : 'Adicionar Produto'}
          </button>
        </div>
      </form>
    </>
  )
}

export default AdicionarProduto
