import { Link, useLocation } from 'react-router-dom'

// Estado de quem abriu, sem estar logado, uma tela que guarda dados da conta
// (estoque, salvos, cálculos, perfil). Com a proteção de rotas desligada
// (RotaProtegida) isso acontece; o banco recusa gravar sem dono, então a tela
// pede o login em vez de dar erro. O login volta para esta mesma tela.
export function PrecisaLogin({ mensagem = 'Entre na sua conta para ver e salvar seus dados.' }) {
  const { pathname } = useLocation()
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="font-medium text-ink">Você não está logado</p>
      <p className="text-sm text-ink/60">{mensagem}</p>
      <Link
        to="/login"
        state={{ de: pathname }}
        viewTransition
        className="rounded-full bg-brik px-5 py-2 text-sm font-medium text-paper transition-colors hover:bg-brik-dark"
      >
        Entrar na conta
      </Link>
    </div>
  )
}
