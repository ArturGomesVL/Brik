import { Link } from 'react-router-dom'
import { ChevronDownIcon } from '../../components/icons.jsx'
import { EmBreveSelo, Grupo, Linha, SubPagina } from '../../components/SubPagina.jsx'
import { NIVEIS } from '../../config/categorias.js'

// Ajuda e Suporte. As respostas descrevem o que o app faz hoje: se mudar a regra
// no worker (limiares dos selos, strikes) ou na calculadora, atualize aqui.
const PERGUNTAS = [
  {
    pergunta: 'De onde vêm as ofertas do Início?',
    resposta: (
      <>
        O Brik acompanha os anúncios de usados da OLX em Pernambuco — por enquanto, iPhones e video
        games. No Início, o filtro de cidade mostra só a sua região (o Grande Recife junta Recife e
        Olinda). Tocar numa oferta abre o anúncio original na OLX, onde você fala direto com o
        vendedor.
      </>
    ),
  },
  {
    pergunta: 'O que significam os selos Bom, Ótimo e Extraordinário?',
    resposta: (
      <>
        Eles dizem quanto o preço do anúncio está abaixo do preço de mercado:{' '}
        {NIVEIS.map(({ label, desconto }, i) => (
          <span key={label}>
            {i > 0 && (i === NIVEIS.length - 1 ? ' e ' : ', ')}
            <strong>{label}</strong> a partir de {desconto}%
          </span>
        ))}
        . Só ganha selo o anúncio que tem pelo menos 3 outros do mesmo modelo e condição para
        comparar.
      </>
    ),
  },
  {
    pergunta: 'Como é calculado o preço de mercado e o lucro estimado?',
    resposta: (
      <>
        O preço de mercado é a mediana dos preços anunciados para o mesmo modelo, variante e condição.
        O lucro estimado do card é a diferença entre esse preço e o preço pedido no anúncio — antes de
        reparos, transporte e outros custos, que você pode somar na calculadora.
      </>
    ),
  },
  {
    pergunta: 'Por que uma oferta sumiu do Início?',
    resposta: (
      <>
        As ofertas são atualizadas a cada nova leitura da OLX. Quando um anúncio deixa de aparecer em
        três leituras seguidas (vendido ou removido pelo vendedor), ele sai do Brik.
      </>
    ),
  },
  {
    pergunta: 'Como uso a calculadora?',
    resposta: (
      <>
        Preencha o preço de compra, os reparos e peças, o transporte, outros custos e o preço de venda.
        O Brik mostra na hora o lucro líquido, a margem e quanto o preço de venda ainda pode cair até
        empatar.{' '}
        <Link to="/calculadora/nova" viewTransition className="font-medium text-brik underline">
          Abrir a calculadora
        </Link>
        .
      </>
    ),
  },
  {
    pergunta: 'Posso esconder meus valores?',
    resposta: (
      <>
        Sim. No Dashboard, o botão com o olho esconde lucro, capital e preços. Para o Dashboard já abrir
        escondido, ligue a opção em{' '}
        <Link to="/perfil/privacidade" viewTransition className="font-medium text-brik underline">
          Privacidade
        </Link>
        .
      </>
    ),
  },
]

function Ajuda() {
  return (
    <SubPagina titulo="Ajuda e Suporte" descricao="Dúvidas frequentes sobre o Brik.">
      <section>
        <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.14em] text-ink/50">Perguntas frequentes</h2>
        <div className="flex flex-col gap-2.5">
          {PERGUNTAS.map(({ pergunta, resposta }) => (
            <details
              key={pergunta}
              className="group rounded-2xl bg-surface-card ring-1 ring-line open:ring-brik/40"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
                <span className="flex-1">{pergunta}</span>
                <ChevronDownIcon
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-brik transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="px-4 pb-4 text-sm leading-relaxed text-ink/70">{resposta}</p>
            </details>
          ))}
        </div>
      </section>

      <Grupo titulo="Ainda precisa de ajuda?">
        <Linha titulo="Fale com a gente" detalhe="Atendimento pelo app.">
          <EmBreveSelo />
        </Linha>
      </Grupo>
    </SubPagina>
  )
}

export default Ajuda
