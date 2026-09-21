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
      { path: '/salvos', element: <EmBreve title="Salvos" /> },
      { path: '/perfil', element: <EmBreve title="Meu Perfil" /> },
      { path: '/adicionar', element: <EmBreve title="Adicionar" /> },
    ],
  },
  // Fora do Layout de propósito: a calculadora é uma tela cheia, sem navbar.
  // Entra pelo botão "Calcular Brique" do dashboard e sai pela seta do header.
  { path: '/calculadora', element: <Calculadora /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
