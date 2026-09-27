import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import LayoutTelaCheia from './components/LayoutTelaCheia.jsx'
import RotaProtegida from './components/RotaProtegida.jsx'
import Home from './pages/Home.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CalculadoraHome from './pages/CalculadoraHome.jsx'
import Calculadora from './pages/Calculadora.jsx'
import MeusProdutos from './pages/MeusProdutos.jsx'
import Salvos from './pages/Salvos.jsx'
import Perfil from './pages/Perfil.jsx'
import EditarPerfil from './pages/EditarPerfil.jsx'
import AdicionarProduto from './pages/AdicionarProduto.jsx'
import Login from './pages/Login.jsx'
import Cadastro from './pages/Cadastro.jsx'
import Quiz from './pages/Quiz.jsx'
import EmBreve from './pages/EmBreve.jsx'
import Privacidade from './pages/perfil/Privacidade.jsx'
import Notificacoes from './pages/perfil/Notificacoes.jsx'
import Configuracoes from './pages/perfil/Configuracoes.jsx'
import Ajuda from './pages/perfil/Ajuda.jsx'
import Termos from './pages/perfil/Termos.jsx'
import PrimeiroBrique from './pages/perfil/PrimeiroBrique.jsx'

const router = createBrowserRouter([
  // O app inteiro exige login e o quiz respondido (ver RotaProtegida).
  {
    element: <RotaProtegida />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Home /> },
          { path: '/produto/:id', element: <ProductDetail /> },
          { path: '/dashboard', element: <Dashboard /> },
          // Porta de entrada da calculadora: tem navbar, por isso fica no Layout.
          { path: '/calculadora', element: <CalculadoraHome /> },
          { path: '/salvos', element: <Salvos /> },
          { path: '/perfil', element: <Perfil /> },
          // O "+" da navbar abre o estoque do usuário.
          { path: '/adicionar', element: <MeusProdutos /> },
          // Itens da lista do Meu Perfil. Ficam no Layout (com navbar, e a aba
          // Meu Perfil acesa) e voltam para o perfil pela seta do título.
          { path: '/perfil/privacidade', element: <Privacidade /> },
          { path: '/perfil/notificacoes', element: <Notificacoes /> },
          { path: '/perfil/configuracoes', element: <Configuracoes /> },
          { path: '/perfil/ajuda', element: <Ajuda /> },
          { path: '/perfil/termos', element: <Termos /> },
          { path: '/perfil/primeiro-brique', element: <PrimeiroBrique /> },
        ],
      },
      // Fora do Layout de propósito: telas cheias, sem navbar no celular (no
      // desktop o LayoutTelaCheia mantém a TopBar).
      {
        element: <LayoutTelaCheia />,
        children: [
          // A conta em si. Entra pelo card "Calcular novo Brique" e sai pela seta do header.
          { path: '/calculadora/nova', element: <Calculadora /> },
          // Formulário de entrada no estoque.
          { path: '/adicionar/novo', element: <AdicionarProduto /> },
          // Edição do perfil. Sai pela seta do header.
          { path: '/perfil/editar', element: <EditarPerfil /> },
        ],
      },
    ],
  },
  // Quiz de boas-vindas: exige login, mas não o quiz — é para onde manda quem
  // ainda não respondeu.
  {
    element: <RotaProtegida exigirQuiz={false} />,
    children: [{ path: '/quiz', element: <Quiz /> }],
  },
  // Autenticação: tela cheia, sem navbar. A recuperação de senha ainda não existe.
  { path: '/login', element: <Login /> },
  { path: '/cadastro', element: <Cadastro /> },
  { path: '/recuperar-senha', element: <EmBreve title="Recuperar senha" /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
