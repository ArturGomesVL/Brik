import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Calculadora from './pages/Calculadora.jsx'
import EmBreve from './pages/EmBreve.jsx'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/produto/:id', element: <ProductDetail /> },
      { path: '/dashboard', element: <Dashboard /> },
      // Tela cheia, aberta pelo botão no card "Investimento x Retorno".
      { path: '/calculadora', element: <Calculadora /> },
      { path: '/salvos', element: <EmBreve title="Salvos" /> },
      { path: '/perfil', element: <EmBreve title="Meu Perfil" /> },
      { path: '/adicionar', element: <EmBreve title="Adicionar" /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
