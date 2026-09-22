import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CalculadoraHome from './pages/CalculadoraHome.jsx'
import Calculadora from './pages/Calculadora.jsx'
import EmBreve from './pages/EmBreve.jsx'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/produto/:id', element: <ProductDetail /> },
      { path: '/dashboard', element: <Dashboard /> },
      // Porta de entrada da calculadora: tem navbar, por isso fica no Layout.
      { path: '/calculadora', element: <CalculadoraHome /> },
      { path: '/salvos', element: <EmBreve title="Salvos" /> },
      { path: '/perfil', element: <EmBreve title="Meu Perfil" /> },
      { path: '/adicionar', element: <EmBreve title="Adicionar" /> },
    ],
  },
  // Fora do Layout de propósito: a conta em si é tela cheia, sem navbar. Entra
  // pelo card "Calcular novo Brique" e sai pela seta do header.
  { path: '/calculadora/nova', element: <Calculadora /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
