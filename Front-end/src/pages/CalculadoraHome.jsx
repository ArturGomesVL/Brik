import { Link } from 'react-router-dom'
import BrandHeader from '../components/BrandHeader.jsx'
import { CalculatorIcon, ChevronRightIcon } from '../components/icons.jsx'

// Porta de entrada da calculadora, aberta pelo botão flutuante do Dashboard.
// Fica no tema azul da Home (e não no tema claro do Dashboard) porque é uma tela
// de navegação, com navbar; quem faz a conta é /calculadora/nova.
function CalculadoraHome() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-white pb-28 shadow-xl">
      <BrandHeader />

      <main className="px-4 pt-6">
        <h1 className="text-[28px] font-bold leading-none tracking-tight text-ink">Calculadora</h1>
        <p className="mt-2.5 text-sm text-ink/60">
          Simule e descubra o lucro estimado do seu brique
        </p>

        <Link
          to="/calculadora/nova"
          viewTransition
          className="mt-6 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-brik-dark to-brik p-4 text-white shadow-[0_10px_24px_-12px_rgba(0,70,216,0.8)] transition-opacity hover:opacity-95"
        >
          <CalculatorIcon className="h-11 w-11 shrink-0" />

          <span className="min-w-0 flex-1">
            <span className="block font-bold">Calcular novo Brique</span>
            <span className="mt-1 block text-xs leading-snug text-white/75">
              Preencha as informações e veja seu lucro estimado
            </span>
          </span>

          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-brik"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </span>
        </Link>
      </main>
    </div>
  )
}

export default CalculadoraHome
