import { useState } from 'react'
import { formatBRL, formatInt } from '../../lib/format.js'
import { COLOR } from './palette.js'
import { useReveal } from './reveal.js'
import { Card, Eyebrow, Masked, Segmented } from './ui.jsx'

// Três estados, três tons: neutro enquanto espera, âmbar quando está preso a
// alguém, azul quando virou resultado.
const STATUS = {
  anunciado: { label: 'Anunciado', className: 'text-mute' },
  reservado: { label: 'Reservado', className: 'text-warn' },
  vendido: { label: 'Vendido', className: 'text-profit' },
}

const TABS = [
  { value: 'estoque', label: 'Estoque' },
  { value: 'vendidos', label: 'Vendidos' },
]

const EMPTY_TEXT = {
  estoque: { title: 'Você ainda não tem nada', hint: 'Os itens que você comprar para revender aparecem aqui.' },
  vendidos: { title: 'Nenhuma venda ainda', hint: 'Os itens que você vender aparecem aqui.' },
}

function Photo({ src }) {
  if (src) {
    return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-line font-mono text-[9px] tracking-widest text-mute"
      style={{ backgroundImage: `repeating-linear-gradient(45deg, ${COLOR.raise} 0 6px, ${COLOR.surface} 6px 12px)` }}
    >
      FOTO
    </span>
  )
}

function Row({ item }) {
  const status = STATUS[item.status]

  return (
    <li>
      <Card as="div" className="flex items-center gap-3 p-3">
        <Photo src={item.imagem} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{item.titulo}</p>
          <p className="mt-1 truncate text-xs text-mute">
            Compra <Masked>{formatBRL(item.compra)}</Masked> · há {formatInt(item.dias)} {item.dias === 1 ? 'dia' : 'dias'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className={`flex items-center justify-end gap-1.5 text-[11px] font-medium ${status.className}`}>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
            {status.label}
          </p>
          <p className="mt-1 text-[15px] font-bold tracking-tight">
            <Masked>{formatBRL(item.preco)}</Masked>
          </p>
        </div>
      </Card>
    </li>
  )
}

function MeuEstoque({ step, data }) {
  const [tab, setTab] = useState('estoque')
  const reveal = useReveal(step)
  const items = tab === 'estoque' ? data.itens : data.vendidosItens

  return (
    <section aria-labelledby="estoque-titulo">
      <div {...reveal(0, 'mb-3 flex items-center justify-between px-1')}>
        <h2 id="estoque-titulo" className="text-base font-bold">
          Meu estoque
        </h2>
        <Eyebrow>
          {formatInt(data.ativos)} ativos · {formatInt(data.vendidos)} vendidos
        </Eyebrow>
      </div>

      <Segmented label="Lista" options={TABS} value={tab} onChange={setTab} {...reveal(1, 'mb-3')} />

      {items.length === 0 ? (
        <Card as="div" {...reveal(2, 'flex flex-col items-center gap-1 px-6 py-10 text-center')}>
          <p className="font-medium">{EMPTY_TEXT[tab].title}</p>
          <p className="text-sm text-mute">{EMPTY_TEXT[tab].hint}</p>
        </Card>
      ) : (
        <ul {...reveal(2, 'flex flex-col gap-3')}>
          {items.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  )
}

export default MeuEstoque
