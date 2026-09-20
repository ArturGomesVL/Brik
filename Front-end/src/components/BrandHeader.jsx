// Cabeçalho com a logo. Na Home ele é azul e rola com a página, com a logo à esquerda
// e a busca abaixo. No Dashboard (dark) ele é preto, fica fixo no topo e leva só a logo
// no centro. O view-transition-name faz o navegador animar a logo de uma tela para a
// outra ao navegar (ver index.css).
function BrandHeader({ dark = false, className = '', children, ...props }) {
  // No dark o header tem só a altura da logo (mesmo tamanho da Home, h-9): ela não
  // encolhe nem sobe, apenas desliza da esquerda para o centro.
  const base = dark
    ? 'sticky top-0 z-40 bg-night px-5 py-2.5'
    : 'rounded-b-[2rem] bg-brik px-5 pb-6 pt-6'

  return (
    <header className={`${base} ${className}`} {...props}>
      <div className={`flex items-center ${dark ? 'justify-center' : ''} ${children ? 'mb-5' : ''}`}>
        <img
          src="/logoBrik.png"
          alt="Brik"
          className="h-9 w-auto"
          style={{ viewTransitionName: 'brik-logo' }}
        />
      </div>
      {children}
    </header>
  )
}

export default BrandHeader
