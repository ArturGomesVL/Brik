import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandHeader from '../components/BrandHeader.jsx'
import { ArrowLeftIcon } from '../components/icons.jsx'
import { produtosExemplo, produtosVazio, STATUS } from '../data/produtosData.js'
import { formatBRL } from '../lib/format.js'

// "Meus Produtos": o estoque do usuário, aberto pelo "+" da navbar. As abas
// filtram por situação e o seletor de cada card move o produto entre elas.
// A lista ainda não vem do Supabase (ver data/produtosData.js).

// Sem fonte real de estoque, a tela abre vazia. /adicionar?exemplo preenche com
// os produtos do mockup durante o desenvolvimento.
function useProdutos() {
  const { search } = useLocation()
  const exemplo = import.meta.env.DEV && new URLSearchParams(search).has('exemplo')
  return exemplo ? produtosExemplo() : produtosVazio()
}

function Menu() {
  return (
    <button
      type="button"
      aria-label="Opções do produto"
      className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/40 transition-colors hover:bg-surface-raise hover:text-ink"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        ⋮
      </span>
    </button>
  )
}

function Foto({ src }) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-16 w-16 shrink-0 rounded-xl object-cover"
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-raise font-mono text-[9px] tracking-widest text-ink/30"
    >
      FOTO
    </span>
  )
}

function Produto({ item, onStatus }) {
  return (
    <li className="rounded-2xl border border-line bg-white p-3.5 shadow-[0_2px_8px_-4px_rgba(43,43,43,0.15)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-ink/70">{item.data}</p>
        <Menu />
      </div>

      <div className="mt-2 flex gap-3">
        <Foto src={item.imagem} />

        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{item.titulo}</p>

          <dl className="mt-1 text-[11px] leading-relaxed">
            <div className="flex gap-1">
              <dt className="text-ink/60">Comprado por:</dt>
              <dd className="font-medium text-brik">{formatBRL(item.compra)}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-ink/60">Valor da venda:</dt>
              <dd className="font-medium text-brik">{formatBRL(item.venda)}</dd>
            </div>
          </dl>
        </div>

        {/* Seletor de situação: muda a aba em que o produto aparece. */}
        <label className="shrink-0 self-start">
          <span className="sr-only">Situação de {item.titulo}</span>
          <select
            value={item.status}
            onChange={(event) => onStatus(item.id, event.target.value)}
            className="rounded-lg bg-gain-bg px-2 py-1 text-[11px] font-medium text-gain outline-none"
          >
            {STATUS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-2 text-[11px] text-ink/60">
        Quantidade:{' '}
        <span className="font-medium text-brik">
          {item.quantidade} {item.quantidade === 1 ? 'Unidade' : 'Unidades'}
        </span>
      </p>
    </li>
  )
}

function MeusProdutos() {
  const navigate = useNavigate()
  const iniciais = useProdutos()
  const [itens, setItens] = useState(iniciais)
  const [aba, setAba] = useState(STATUS[0].key)

  const contagem = useMemo(() => {
    const total = {}
    itens.forEach((item) => {
      total[item.status] = (total[item.status] ?? 0) + 1
    })
    return total
  }, [itens])

  const visiveis = itens.filter((item) => item.status === aba)

  function mudarStatus(id, status) {
    setItens((lista) => lista.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-paper pb-44 shadow-xl">
      <BrandHeader />

      <div className="flex items-center gap-2 px-4 pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-raise"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-ink">Meus Produtos</h1>
      </div>

      {/* Abas roláveis: não cabem todas na largura do celular. */}
      <div
        role="tablist"
        aria-label="Situação dos produtos"
        className="mt-4 flex gap-5 overflow-x-auto border-b border-line px-4"
      >
        {STATUS.map(({ key, label }) => {
          const ativa = key === aba
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setAba(key)}
              className={`shrink-0 border-b-2 pb-2.5 text-sm transition-colors ${
                ativa ? 'border-brik font-medium text-brik' : 'border-transparent text-ink/50'
              }`}
            >
              {label}({contagem[key] ?? 0})
            </button>
          )
        })}
      </div>

      <main className="px-4 pt-4">
        {visiveis.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
            <p className="font-medium">
              {itens.length === 0 ? 'Você ainda não tem produtos' : 'Nada nesta aba'}
            </p>
            <p className="text-sm text-ink/60">
              {itens.length === 0
                ? 'Os produtos que você adicionar aparecem aqui.'
                : 'Seus produtos estão em outra situação.'}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {visiveis.map((item) => (
              <Produto key={item.id} item={item} onStatus={mudarStatus} />
            ))}
          </ul>
        )}
      </main>

      {/* Fica acima da navbar e não rola com a lista. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-40 mx-auto w-full max-w-md px-4">
        <Link
          to="/adicionar/novo"
          viewTransition
          className="pointer-events-auto block rounded-2xl bg-brik py-3.5 text-center font-bold text-paper transition-colors hover:bg-brik-dark"
        >
          Adicionar novo produto
        </Link>
      </div>
    </div>
  )
}

export default MeusProdutos
