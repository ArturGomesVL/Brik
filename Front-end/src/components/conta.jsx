import { useState } from 'react'
import { AvatarIcon } from './icons.jsx'

// Peças visuais da conta logada. Os dados vêm de lib/conta.js.

// Foto redonda: a do provedor ou, sem ela (ou se não carregar), o avatar padrão.
// O Google recusa a imagem quando recebe o referrer.
export function FotoPerfil({ src, alt = 'Foto de perfil', className = '', iconClassName = 'h-3/5 w-3/5' }) {
  const [falhou, setFalhou] = useState(null)
  const mostrar = src && falhou !== src

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brik-dark text-white ${className}`}
    >
      {mostrar ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFalhou(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <AvatarIcon aria-hidden="true" className={iconClassName} />
      )}
    </span>
  )
}

// "Conectado com Google": de onde vêm os dados da conta.
export function SeloProvedor({ social, className = '' }) {
  if (!social) return null
  const { nome, Icon } = social
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-surface-raise px-2.5 py-1 text-[11px] font-medium text-ink/70 ${className}`}
    >
      {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5" />}
      Conectado com {nome}
    </span>
  )
}
