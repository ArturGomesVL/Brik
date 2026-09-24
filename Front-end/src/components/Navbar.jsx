import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate, useViewTransitionState } from 'react-router-dom'
import { NAV_ITEMS, ADD_ITEM } from '../config/navItems.js'
import { PlusIcon } from './icons.jsx'

const SPRING = 'cubic-bezier(0.22, 1.12, 0.36, 1)'
const SMOOTH = 'cubic-bezier(0.32, 0.72, 0, 1)'
const GLIDE = 'cubic-bezier(0.33, 0.02, 0.15, 1)'
const DRAG_THRESHOLD = 6

// As abas ficam em uma única pílula de vidro, metade de cada lado do botão "+".
const SPLIT = NAV_ITEMS.length / 2
const LEFT_ITEMS = NAV_ITEMS.slice(0, SPLIT)
const RIGHT_ITEMS = NAV_ITEMS.slice(SPLIT)

function getActiveIndex(pathname) {
  return NAV_ITEMS.findIndex(({ path }) =>
    path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`),
  )
}

const at = (x, sx = 1, sy = 1) => `translateX(${x}px) scale(${sx}, ${sy})`
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const activeIndex = getActiveIndex(pathname)
  const [pressed, setPressed] = useState(false)
  // A conta da calculadora é tela cheia, sem navbar. Só nas navegações de/para ela
  // a barra ganha um view-transition-name, e o index.css a faz descer ao sair e
  // subir ao voltar. Nas trocas de aba o nome fica de fora, para não transformar a barra
  // em imagem durante a transição e esconder a bolha deslizando.
  const paraCalculadora = useViewTransitionState('/calculadora/nova')
  const paraNovoProduto = useViewTransitionState('/adicionar/novo')
  const paraEditarPerfil = useViewTransitionState('/perfil/editar')
  const toCalculator = paraCalculadora || paraNovoProduto || paraEditarPerfil
  // A barra só vira imagem (view-transition-name) quando está SAINDO. Na volta
  // ela entra viva, animada por CSS: dentro de uma view transition o vidro perde
  // o fundo que ele borra, e sobrava só o "+" verde aparecendo sozinho.
  // Nasce true se a barra montou no meio da transição (ou seja, ela é a que está
  // chegando) e volta a false assim que a transição termina.
  const [chegando, setChegando] = useState(toCalculator)
  if (chegando && !toCalculator) setChegando(false)

  const rowRef = useRef(null)
  const lensRef = useRef(null)
  const slots = useRef({ x: [], width: 0 }) // posição (px) de cada aba dentro da linha
  const previousIndex = useRef(activeIndex)
  const dragFrom = useRef(null) // posição (px) de onde a bolha foi solta
  const drag = useRef({ armed: false, moved: false, startX: 0, x0: 0, x: 0 })
  const swallowClick = useRef(false)

  // Mede onde cada aba está (o "+" no meio faz a bolha não andar em passos iguais) e dimensiona a bolha para caber em uma aba.
  function measure() {
    const row = rowRef.current
    const lens = lensRef.current
    if (!row || !lens) return
    const items = [...row.querySelectorAll('[data-index]')]
    if (items.length !== NAV_ITEMS.length) return

    const rowBox = row.getBoundingClientRect()
    const boxes = items.map((item) => item.getBoundingClientRect())
    slots.current = { x: boxes.map((box) => box.left - rowBox.left), width: boxes[0].width }
    lens.style.top = `${boxes[0].top - rowBox.top}px`
    lens.style.width = `${boxes[0].width}px`
    lens.style.height = `${boxes[0].height}px`
  }

  // A bolha de vidro desliza de uma aba à outra e o ícone recém-selecionado dá um
  // pulo. Roda a cada mudança de rota, então também vale para o botão voltar e
  // para o arrastar.
  useLayoutEffect(() => {
    const lens = lensRef.current
    const previous = previousIndex.current
    const dropped = dragFrom.current
    previousIndex.current = activeIndex
    dragFrom.current = null

    if (!lens) return
    measure()
    if (activeIndex === -1) return

    const toX = slots.current.x[activeIndex]
    lens.style.transform = at(toX) // posição final; as animações abaixo partem de onde ela estava

    if (previous === activeIndex) return

    // O deslize da bolha sempre acontece (é o feedback da navegação); só o pulo do
    // ícone e o alongamento respeitam "reduzir movimento".
    const calm = reducedMotion()

    if (!calm) {
      rowRef.current
        .querySelector(`[data-index="${activeIndex}"] svg`)
        ?.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(0.94)', offset: 0.3 },
            { transform: 'scale(1.05)', offset: 0.65 },
            { transform: 'scale(1)' },
          ],
          { duration: 700, easing: SMOOTH },
        )
    }

    if (previous === -1 && dropped === null) return

    // Se outra troca ainda está em andamento, parte de onde a bolha está agora.
    let fromX = dropped ?? slots.current.x[previous]
    const running = lens.getAnimations()
    if (dropped === null && running.length > 0) {
      fromX = new DOMMatrix(getComputedStyle(lens).transform).e
    }
    running.forEach((animation) => animation.cancel())
    const bubble = lens.firstElementChild
    bubble.getAnimations({ subtree: true }).forEach((animation) => animation.cancel())

    const distance = Math.abs(toX - fromX) / slots.current.width
    const duration = 760 + Math.min(distance, 3) * 110

    // Deslize contínuo: uma única curva de A até B, sem paradas no meio.
    lens.animate([{ transform: at(fromX) }, { transform: at(toX) }], {
      duration,
      easing: GLIDE,
    })

    // Em movimento a bolha "vira líquido": o anel de blur das bordas cresce e fica
    // mais denso enquanto o centro continua nítido sobre o ícone; ao chegar, relaxa.
    const ring = (blur, opacity) => {
      const filter = `blur(${blur}px) brightness(1.35) saturate(1.5)`
      return { backdropFilter: filter, WebkitBackdropFilter: filter, opacity }
    }
    bubble.animate([ring(6, 0.6), { ...ring(12, 0.85), offset: 0.45 }, ring(6, 0.6)], {
      duration,
      easing: 'ease-in-out',
      pseudoElement: '::after',
    })
    bubble.animate(
      [
        { boxShadow: 'var(--lens-rim-rest)' },
        { boxShadow: 'var(--lens-rim-move)', offset: 0.45 },
        { boxShadow: 'var(--lens-rim-rest)' },
      ],
      { duration, easing: 'ease-in-out', pseudoElement: '::before' },
    )

    if (calm) return

    // A gota se alonga no meio do caminho e volta ao normal, em curva própria.
    bubble.animate(
      [
        { transform: 'scale(1, 1)' },
        { transform: `scale(${Math.min(1 + distance * 0.07, 1.22)}, 0.97)`, offset: 0.5 },
        { transform: 'scale(1, 1)' },
      ],
      { duration, easing: 'ease-in-out' },
    )
  }, [activeIndex])

  // Reposiciona a bolha se a largura da tela (ou a fonte) mudar os tamanhos.
  useEffect(() => {
    const row = rowRef.current
    const replace = () => {
      if (drag.current.moved) return
      measure()
      const x = slots.current.x[previousIndex.current]
      if (x !== undefined && lensRef.current) lensRef.current.style.transform = at(x)
    }
    const observer = new ResizeObserver(replace)
    observer.observe(row)
    document.fonts?.ready.then(replace)
    return () => observer.disconnect()
  }, [])

  function onPointerDown(event) {
    const index = Number(event.target.closest('a')?.dataset.index)
    const grabbed = index === activeIndex
    const x0 = slots.current.x[activeIndex] ?? 0
    drag.current = { armed: grabbed, moved: false, startX: event.clientX, x0, x: x0 }
    setPressed(grabbed)
  }

  // Segurar a bolha da aba ativa e arrastar: ela acompanha o dedo e, ao soltar,
  // encaixa na aba mais próxima.
  function onPointerMove(event) {
    const state = drag.current
    const lens = lensRef.current
    if (!state.armed || !lens) return

    const dx = event.clientX - state.startX
    if (!state.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return
      state.moved = true
      rowRef.current.setPointerCapture(event.pointerId)
      lens.getAnimations().forEach((animation) => animation.cancel())
    }

    const { x } = slots.current
    state.x = Math.min(Math.max(state.x0 + dx, x[0]), x[x.length - 1])
    lens.style.transform = at(state.x, 1.04, 1)
  }

  function onPointerEnd() {
    const state = drag.current
    drag.current = { ...state, armed: false }
    setPressed(false)
    if (!state.moved) return

    swallowClick.current = true
    setTimeout(() => {
      swallowClick.current = false
    }, 50)

    const { x } = slots.current
    const target = x.reduce(
      (best, slot, index) => (Math.abs(slot - state.x) < Math.abs(x[best] - state.x) ? index : best),
      0,
    )
    if (target !== activeIndex) {
      dragFrom.current = state.x
      navigate(NAV_ITEMS[target].path, { viewTransition: true })
      return
    }

    const lens = lensRef.current
    lens.animate([{ transform: at(state.x, 1.04, 1) }, { transform: at(x[activeIndex]) }], {
      duration: 450,
      easing: SPRING,
    })
    lens.style.transform = at(x[activeIndex])
  }

  function onPointerLeave() {
    if (drag.current.moved) return
    drag.current.armed = false
    setPressed(false)
  }

  function onClickCapture(event) {
    // O clique que vem logo após um arrastar não deve navegar de novo.
    if (swallowClick.current) event.preventDefault()
  }

  const renderItems = (items, offset) =>
    items.map(({ path, label, Icon }, i) => (
      <li key={path} className="flex-1">
        <NavLink
          to={path}
          end={path === '/'}
          viewTransition
          data-index={offset + i}
          draggable={false}
          className={({ isActive }) =>
            `flex h-16 flex-col items-center justify-center gap-1 rounded-full text-[10px] font-medium text-white transition-opacity ${
              isActive ? 'opacity-100' : 'opacity-75'
            }`
          }
        >
          <Icon className="h-7 w-7" />
          <span>{label}</span>
        </NavLink>
      </li>
    ))

  return (
    <nav
      aria-label="Navegação principal"
      className="navbar-enter fixed inset-x-0 bottom-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-sm"
      style={toCalculator && !chegando ? { viewTransitionName: 'navbar' } : undefined}
    >
      <div
        ref={rowRef}
        className="relative flex touch-none select-none items-center "
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerLeave}
        onClickCapture={onClickCapture}
      >
        <div className="glass-bar absolute inset-0 rounded-full" aria-hidden="true" />

        <ul className="relative z-[2] flex w-full items-center p-1.5">
          {renderItems(LEFT_ITEMS, 0)}
          <li className="flex shrink-0 justify-center px-1">
            <NavLink
              to={ADD_ITEM.path}
              viewTransition
              aria-label={ADD_ITEM.label}
              draggable={false}
              className="glass-add flex h-14 w-14 items-center justify-center rounded-full text-paper"
            >
              <PlusIcon className="h-7 w-7" />
            </NavLink>
          </li>
          {renderItems(RIGHT_ITEMS, SPLIT)}
        </ul>

        <div
          ref={lensRef}
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 z-[1] transition-opacity duration-200 ${
            activeIndex === -1 ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="glass-lens h-full w-full rounded-full" data-pressed={pressed} />
        </div>
      </div>
    </nav>
  )
}

export default Navbar
