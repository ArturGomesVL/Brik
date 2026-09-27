import { EmBreveSelo, Grupo, Interruptor, Linha, Nota, SubPagina } from '../../components/SubPagina.jsx'
import { usePreferenciasStore } from '../../stores/usePreferenciasStore.js'

// Privacidade. "Ocultar valores" já funciona (o Dashboard lê a preferência ao
// abrir); o que depende da conta no Supabase aparece como "Em breve".
function Privacidade() {
  const ocultarValores = usePreferenciasStore((state) => state.ocultarValores)
  const setOcultarValores = usePreferenciasStore((state) => state.setOcultarValores)

  return (
    <SubPagina titulo="Privacidade" descricao="Controle o que aparece na sua tela e os dados da sua conta.">
      <Grupo titulo="Nesta tela">
        <Linha
          titulo="Ocultar valores ao abrir o Dashboard"
          detalhe="Lucro, capital e preços começam escondidos. Toque no olho do Dashboard para mostrar."
        >
          <Interruptor ligado={ocultarValores} onChange={setOcultarValores} label="Ocultar valores ao abrir o Dashboard" />
        </Linha>
      </Grupo>

      <Grupo titulo="Sua conta">
        <Linha titulo="Alterar senha">
          <EmBreveSelo />
        </Linha>
        <Linha titulo="Baixar meus dados" detalhe="Uma cópia do seu estoque e dos seus cálculos.">
          <EmBreveSelo />
        </Linha>
        <Linha titulo="Excluir conta" detalhe="Apaga sua conta e tudo o que você guardou no Brik.">
          <EmBreveSelo />
        </Linha>
      </Grupo>

      <Nota>A preferência de ocultar valores fica salva neste aparelho.</Nota>
    </SubPagina>
  )
}

export default Privacidade
