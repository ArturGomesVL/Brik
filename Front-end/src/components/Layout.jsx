import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import TopBar from './TopBar.jsx'
import { ComTopBar } from './layoutContext.js'

// No celular a navegação é a Navbar, embaixo; a partir de lg ela some e entra a
// TopBar, no topo.
function Layout() {
  return (
    <ComTopBar.Provider value={true}>
      <TopBar />
      <Outlet />
      <Navbar />
    </ComTopBar.Provider>
  )
}

export default Layout
