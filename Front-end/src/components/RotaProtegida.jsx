import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore.js'

// Porteiro das rotas do app. Sem sessão, vai para o login (guardando de onde
// veio, para voltar depois de entrar). Com sessão mas sem o quiz respondido,
// vai para o quiz — exceto na rota do próprio quiz (exigirQuiz={false}).
// Enquanto a sessão ou o quiz ainda estão sendo consultados, não mostra nada:
// na abertura a splash está por cima.

// Desligada durante o desenvolvimento, para navegar pelas telas sem login nem
// quiz. Voltar para true antes de publicar o site.
const PROTECAO_ATIVA = false

function RotaProtegida({ exigirQuiz = true }) {
  const location = useLocation()
  const session = useAuthStore((state) => state.session)
  const carregando = useAuthStore((state) => state.carregando)
  const quizRespondido = useAuthStore((state) => state.quizRespondido)

  if (!PROTECAO_ATIVA) return <Outlet />
  if (carregando) return null
  if (!session) return <Navigate to="/login" replace state={{ de: location.pathname }} />
  if (!exigirQuiz) return <Outlet />
  if (quizRespondido === null) return null
  if (!quizRespondido) return <Navigate to="/quiz" replace />
  return <Outlet />
}

export default RotaProtegida
