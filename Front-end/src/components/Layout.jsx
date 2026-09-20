import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'

function Layout() {
  return (
    <>
      <Outlet />
      <Navbar />
    </>
  )
}

export default Layout
