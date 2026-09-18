import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Home from './pages/Home.jsx'
import ProductDetail from './pages/ProductDetail.jsx'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/produto/:id', element: <ProductDetail /> },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
