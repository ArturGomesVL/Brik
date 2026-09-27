import { Grupo, Interruptor, Linha, Nota, SubPagina } from '../../components/SubPagina.jsx'
import { usePreferenciasStore } from '../../stores/usePreferenciasStore.js'

// Notificações. Por enquanto só guarda as escolhas: o envio dos avisos (push ou
// e-mail) ainda não existe. Quando existir, ele lê estas mesmas chaves.
const GRUPOS = [
  {
    titulo: 'Oportunidades',
    itens: [
      {
        key: 'oportunidades',
        titulo: 'Novas oportunidades',
        detalhe: 'Quando aparecer um bom negócio nas categorias que você escolheu nas Configurações.',
      },
      {
        key: 'extraordinarias',
        titulo: 'Negócios extraordinários',
        detalhe: 'Aviso na hora para ofertas 30% ou mais abaixo do preço de mercado.',
      },
    ],
  },
  {
    titulo: 'Seu estoque',
    itens: [
      {
        key: 'estoqueParado',
        titulo: 'Produto parado',
        detalhe: 'Lembrete quando um produto do seu estoque ficar muito tempo sem vender.',
      },
    ],
  },
  {
    titulo: 'Brik',
    itens: [{ key: 'novidades', titulo: 'Novidades e dicas', detalhe: 'Recursos novos e dicas para seus briques.' }],
  },
]

function Notificacoes() {
  const notificacoes = usePreferenciasStore((state) => state.notificacoes)
  const setNotificacao = usePreferenciasStore((state) => state.setNotificacao)

  return (
    <SubPagina titulo="Notificações" descricao="Escolha sobre o que o Brik vai te avisar.">
      {GRUPOS.map(({ titulo, itens }) => (
        <Grupo key={titulo} titulo={titulo}>
          {itens.map(({ key, titulo: nome, detalhe }) => (
            <Linha key={key} titulo={nome} detalhe={detalhe}>
              <Interruptor ligado={notificacoes[key]} onChange={(ligada) => setNotificacao(key, ligada)} label={nome} />
            </Linha>
          ))}
        </Grupo>
      ))}

      <Nota>
        Os avisos começam a chegar quando as notificações forem lançadas. Suas escolhas já ficam
        guardadas neste aparelho.
      </Nota>
    </SubPagina>
  )
}

export default Notificacoes
