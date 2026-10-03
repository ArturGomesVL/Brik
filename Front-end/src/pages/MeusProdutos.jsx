import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import BrandHeader from '../components/BrandHeader.jsx'
import { PrecisaLogin } from '../components/PrecisaLogin.jsx'
import { ArrowLeftIcon } from '../components/icons.jsx'
import { STATUS, STATUS_SELETOR } from '../data/produtosData.js'
import { apagarProduto, capasEmCache, comCapas, linhasDoEstoque, mudarStatus } from '../lib/estoque.js'
import { formatBRL } from '../lib/format.js'
import { useFecharPainel } from '../lib/usePainel.js'
import { useUsuarioId } from '../stores/useAuthStore.js'

// "Meus Produtos": o estoque do usuário (public.estoque), aberto pelo "+" da
// navbar. As abas filtram por situação e o seletor de cada card move o produto
// entre elas (grava na hora). O ⋮ do card edita, marca como vendido ou exclui.

const dataCurta = (iso) => new Date(iso).toLocaleDateString('pt-BR')

// ⋮ do card: Editar leva ao formulário; Marcar como vendido move para a aba
// Vendidos; Excluir pede confirmação.
function Menu({ item, onStatus, onExcluir }) {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const raizRef = useRef(null)
  const botaoRef = useRef(null)
  useFecharPainel(aberto, setAberto, raizRef, botaoRef)

  return (
    <div ref={raizRef} className="relative -mr-1 -mt-1">
      <button
        ref={botaoRef}
        type="button"
        aria-label={`Opções de ${item.titulo}`}
        aria-haspopup="true"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/40 transition-colors hover:bg-surface-raise hover:text-ink"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ⋮
        </span>
      </button>

      {aberto && (
        <div className="painel-pop absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl bg-surface-card py-1 shadow-[0_12px_28px_-10px_rgba(0,0,0,0.35)] ring-1 ring-line [transform-origin:top_right]">
          <button
            type="button"
            onClick={() => navigate(`/adicionar/editar/${item.id}`, { viewTransition: true })}
            className="block w-full px-3.5 py-2 text-left text-sm text-ink hover:bg-surface-raise"
          >
            Editar
          </button>
          {item.status !== 'vendido' && (
            <button
              type="button"
              onClick={() => {
                setAberto(false)
                onStatus(item.id, 'vendido')
              }}
              className="block w-full px-3.5 py-2 text-left text-sm text-ink hover:bg-surface-raise"
            >
              Marcar como vendido
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setAberto(false)
              onExcluir(item)
            }}
            className="block w-full px-3.5 py-2 text-left text-sm text-loss hover:bg-loss/10"
          >
            Excluir
          </button>
        </div>
      )}
    </div>
  )
}

// `src` é a miniatura; se ela não existir (foto antiga), cai na `reserva`, a foto inteira.
function Foto({ src, reserva }) {
  const [falhou, setFalhou] = useState(false)
  if (src) {
    return (
      <img
        src={falhou ? reserva : src}
        alt=""
        decoding="async"
        onError={() => !falhou && reserva && reserva !== src && setFalhou(true)}
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

const reais = (valor) => (valor == null ? '—' : formatBRL(valor))

function Produto({ item, onStatus, onExcluir }) {
  return (
    <li className="rounded-2xl border border-line bg-surface-card p-3.5 shadow-[0_2px_8px_-4px_rgba(43,43,43,0.15)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-ink/70">{dataCurta(item.created_at)}</p>
        <Menu item={item} onStatus={onStatus} onExcluir={onExcluir} />
      </div>

      <div className="mt-2 flex gap-3">
        <Foto key={item.capa} src={item.capa} reserva={item.capaGrande} />

        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{item.titulo}</p>

          <dl className="mt-1 text-[11px] leading-relaxed">
            <div className="flex gap-1">
              <dt className="text-ink/60">Comprado por:</dt>
              <dd className="font-medium text-brik">{reais(item.custo)}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-ink/60">Valor da venda:</dt>
              <dd className="font-medium text-brik">{reais(item.venda)}</dd>
            </div>
          </dl>
        </div>

        {/* Seletor de situação: muda a aba em que o produto aparece. Vendido
            só pelo ⋮; num vendido ele aparece fixo e escolher outra desfaz a venda. */}
        <label className="shrink-0 self-start">
          <span className="sr-only">Situação de {item.titulo}</span>
          <select
            value={item.status}
            onChange={(event) => onStatus(item.id, event.target.value)}
            className="rounded-lg bg-gain-bg px-2 py-1 text-[11px] font-medium text-gain outline-none"
          >
            {item.status === 'vendido' && (
              <option value="vendido" disabled>
                Vendido
              </option>
            )}
            {STATUS_SELETOR.map(({ key, label }) => (
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
  const location = useLocation()
  const userId = useUsuarioId()
  // null enquanto carrega.
  const [itens, setItens] = useState(null)
  const [erro, setErro] = useState('')
  // Vindo do formulário, abre na aba do produto que acabou de ser salvo.
  const [aba, setAba] = useState(location.state?.aba ?? STATUS[0].key)

  useEffect(() => {
    if (!userId || userId === 'carregando') return
    let ativo = true
    // A lista aparece assim que as linhas chegam, já com as capas guardadas; as
    // que faltam entram depois, sem desfazer o que o usuário mudou nesse meio-tempo.
    linhasDoEstoque()
      .then((lista) => {
        if (!ativo) return
        setItens(capasEmCache(lista))
        comCapas(lista)
          .then((comFotos) => {
            if (!ativo) return
            const porId = new Map(comFotos.map((item) => [item.id, item]))
            setItens((atual) =>
              atual.map((item) => {
                const fotos = porId.get(item.id)
                return fotos ? { ...item, capa: fotos.capa, capaGrande: fotos.capaGrande } : item
              }),
            )
          })
          .catch((error) => console.error('Erro ao carregar as fotos do estoque:', error))
      })
      .catch((error) => {
        console.error('Erro ao carregar o estoque:', error)
        if (ativo) {
          setErro('Não foi possível carregar seus produtos. Tente de novo em instantes.')
          setItens([])
        }
      })
    return () => {
      ativo = false
    }
  }, [userId])

  const contagem = useMemo(() => {
    const total = {}
    itens?.forEach((item) => {
      total[item.status] = (total[item.status] ?? 0) + 1
    })
    return total
  }, [itens])

  const visiveis = itens?.filter((item) => item.status === aba) ?? []

  // Otimista: muda na tela e grava; se o banco recusar, volta.
  async function trocarStatus(id, status) {
    const antes = itens
    setItens((lista) => lista.map((item) => (item.id === id ? { ...item, status } : item)))
    try {
      await mudarStatus(id, status)
    } catch (error) {
      console.error('Erro ao mudar a situação:', error)
      setItens(antes)
      setErro('Não foi possível mudar a situação. Tente de novo.')
    }
  }

  async function excluir(item) {
    if (!window.confirm(`Excluir "${item.titulo}" do seu estoque?`)) return
    const antes = itens
    setItens((lista) => lista.filter((i) => i.id !== item.id))
    try {
      await apagarProduto(item)
    } catch (error) {
      console.error('Erro ao excluir o produto:', error)
      setItens(antes)
      setErro('Não foi possível excluir o produto. Tente de novo.')
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-surface pb-44 shadow-xl lg:max-w-4xl lg:pb-12 lg:shadow-none">
      <BrandHeader />

      <div className="flex items-center gap-2 px-4 pt-4 lg:px-8 lg:pt-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-raise"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-ink lg:text-[28px]">Meus Produtos</h1>
        {/* No desktop o botão sai do rodapé fixo e fica aqui, ao lado do título. */}
        <Link
          to="/adicionar/novo"
          viewTransition
          className="ml-auto hidden rounded-xl bg-brik px-5 py-2.5 text-sm font-bold text-paper transition-colors hover:bg-brik-dark lg:block"
        >
          Adicionar novo produto
        </Link>
      </div>

      {/* Abas roláveis: não cabem todas na largura do celular. */}
      <div
        role="tablist"
        aria-label="Situação dos produtos"
        className="mt-4 flex gap-5 overflow-x-auto border-b border-line px-4 lg:mx-8 lg:mt-6 lg:px-0"
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

      <main className="px-4 pt-4 lg:px-8 lg:pt-6">
        {erro && (
          <p role="alert" className="mb-3 rounded-lg bg-loss/10 px-3 py-2 text-sm text-loss">
            {erro}
          </p>
        )}

        {userId === null ? (
          <PrecisaLogin mensagem="Entre na sua conta para ver e adicionar produtos ao seu estoque." />
        ) : itens === null ? (
          <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2" aria-busy="true" aria-label="Carregando produtos">
            {[0, 1].map((i) => (
              <li key={i} className="skeleton h-36 rounded-2xl" />
            ))}
          </ul>
        ) : visiveis.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
            <p className="font-medium">{itens.length === 0 ? 'Você ainda não tem produtos' : 'Nada nesta aba'}</p>
            <p className="text-sm text-ink/60">
              {itens.length === 0
                ? 'Os produtos que você adicionar aparecem aqui.'
                : 'Seus produtos estão em outra situação.'}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
            {visiveis.map((item) => (
              <Produto key={item.id} item={item} onStatus={trocarStatus} onExcluir={excluir} />
            ))}
          </ul>
        )}
      </main>

      {/* Fica acima da navbar e não rola com a lista. Só no celular. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-40 mx-auto w-full max-w-md px-4 lg:hidden">
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
