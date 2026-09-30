import { Outlet } from 'react-router-dom'
import TopBar from './TopBar.jsx'
import { ComTopBar } from './layoutContext.js'

// Telas cheias (a conta da calculadora, o formulário de estoque, a edição do
// perfil): no celular não têm navbar, porque são tarefas com começo e fim. No
// desktop a TopBar continua em cima, para não perder a navegação.
function LayoutTelaCheia() {
  return (
    <ComTopBar.Provider value={true}>
      <TopBar />
      <Outlet />
    </ComTopBar.Provider>
  )
}

export default LayoutTelaCheia
