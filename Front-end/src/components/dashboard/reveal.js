import { createContext, useCallback, useContext } from 'react'

// Entrada progressiva do Dashboard: cada elemento recebe a sua posição na sequência
// (--step) e o CSS transforma isso em animation-delay (ver .reveal no index.css).
// A ordem global fica em Dashboard.jsx (a prop `step` de cada bloco) e cada bloco
// numera os próprios elementos a partir dela — assim dá para reordenar mexendo em
// um lugar só.

// true só enquanto a montagem inicial acontece. Depois disso nenhum elemento novo
// (troca de aba, de período, de filtro) entra animado.
export const RevealContext = createContext(false)

// Tempo total da sequência, com folga para o último elemento terminar.
export const ENTRANCE_MS = 2400

export function revealProps(step, on, className = '') {
  if (!on) return { className }
  return { className: `reveal ${className}`.trim(), style: { '--step': step } }
}

// useReveal(base) devolve reveal(offset, classes) com as props do elemento.
export function useReveal(base = 0) {
  const on = useContext(RevealContext)
  return useCallback((offset = 0, className = '') => revealProps(base + offset, on, className), [base, on])
}
