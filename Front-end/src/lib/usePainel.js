import { useEffect } from 'react'

// Os filtros do Início aparecem em dois lugares: no header verde do celular,
// como pílula de vidro sobre o petróleo, e na coluna lateral do desktop
// (`lateral`), como botão claro de largura cheia. No celular a pílula é mais
// baixa e mais justa; `soIcone` é o Filtros, que ali mostra só o ícone.
export function classeBotaoPainel(lateral, aberto, soIcone = false) {
  const base = 'flex items-center font-medium ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2'
  if (lateral) {
    return `${base} w-full gap-2 rounded-xl px-3 py-2.5 text-sm text-ink hover:bg-surface-raise focus-visible:ring-brik/40 ${
      aberto ? 'bg-surface-raise ring-brik/40' : 'bg-surface-card ring-line'
    }`
  }
  const espaco = soIcone ? 'p-2 sm:px-3.5' : 'py-1.5 pl-3 pr-2.5 sm:py-2 sm:pl-4 sm:pr-3.5'
  return `${base} ${espaco} gap-1.5 rounded-full text-[13px] text-paper hover:bg-white/20 focus-visible:ring-mint sm:gap-2 sm:text-sm ${
    aberto ? 'bg-white/25 ring-white/40' : 'bg-white/15 ring-white/25'
  }`
}

// No header, o painel flutua sob o botão. Na coluna lateral, que fica presa no
// topo da tela, um painel flutuante passaria da borda de baixo sem ter como
// rolar até ele; lá ele abre no fluxo, empurrando o resto, e a coluna rola.
export const classePosicaoPainel = (lateral) =>
  lateral
    ? 'mt-2 w-full'
    : 'absolute left-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2.5rem))] shadow-[0_24px_48px_-16px_rgba(0,0,0,0.5)]'

// Painel que abre sob um botão (os filtros do Início): enquanto aberto, fecha
// com clique fora da raiz e com Esc — este devolve o foco ao botão.
export function useFecharPainel(aberto, setAberto, raizRef, botaoRef) {
  useEffect(() => {
    if (!aberto) return

    function fora(event) {
      if (!raizRef.current?.contains(event.target)) setAberto(false)
    }
    function tecla(event) {
      if (event.key !== 'Escape') return
      setAberto(false)
      botaoRef.current?.focus()
    }
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto, setAberto, raizRef, botaoRef])
}
