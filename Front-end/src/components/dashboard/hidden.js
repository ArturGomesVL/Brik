import { createContext, useContext } from 'react'

// Valor = true quando o usuário pediu para ocultar os valores em reais.
const HiddenContext = createContext(false)

export const HiddenProvider = HiddenContext.Provider
export const useHidden = () => useContext(HiddenContext)
