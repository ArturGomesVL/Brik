import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout.jsx'
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

const router = createBrowserRouter([
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
      { path: '/perfil/editar', element: <EditarPerfil /> },
      // O "+" da navbar abre o estoque do usuário.
      { path: '/adicionar', element: <MeusProdutos /> },
    ],
  },
  // Fora do Layout de propósito: a conta em si é tela cheia, sem navbar. Entra
  // pelo card "Calcular novo Brique" e sai pela seta do header.
  { path: '/calculadora/nova', element: <Calculadora /> },
  // Formulário de entrada no estoque: também tela cheia, sem navbar.
  { path: '/adicionar/novo', element: <AdicionarProduto /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
