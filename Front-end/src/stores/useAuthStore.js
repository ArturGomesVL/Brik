import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// Sessão do Supabase Auth. `carregando` fica true até o cliente ler a sessão
// guardada — antes disso não dá para saber se há alguém logado.
// `quizRespondido`: null enquanto não se sabe (sem sessão ou consultando),
// depois true/false conforme o usuário tenha linha em public.preferencias.
export const useAuthStore = create(() => ({
  session: null,
  carregando: true,
  quizRespondido: null,
}))

async function consultarQuiz(userId) {
  const { data, error } = await supabase
    .from('preferencias')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  // Outro usuário entrou enquanto a consulta ia e voltava.
  if (useAuthStore.getState().session?.user.id !== userId) return

  if (error) {
    // Sem como saber, não prende a pessoa no quiz: a próxima sessão confere de novo.
    console.error('Erro ao consultar o quiz:', error.message)
    useAuthStore.setState({ quizRespondido: true })
    return
  }
  useAuthStore.setState({ quizRespondido: data !== null })
}

// A primeira chamada (INITIAL_SESSION) chega logo ao inscrever; depois, a cada
// login, logout e renovação do token.
supabase.auth.onAuthStateChange((_evento, session) => {
  const antes = useAuthStore.getState().session?.user.id
  const agora = session?.user.id

  if (antes === agora) {
    // Renovação do token: mesmo usuário, o quiz já está resolvido.
    useAuthStore.setState({ session, carregando: false })
    return
  }

  useAuthStore.setState({ session, carregando: false, quizRespondido: null })
  // Fora do callback: chamar o Supabase dentro dele trava o cliente de Auth.
  if (agora) setTimeout(() => consultarQuiz(agora), 0)
})

// Mensagens do Auth em português. O resto cai no genérico.
const MENSAGENS = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  user_already_exists: 'Já existe uma conta com esse e-mail.',
  email_exists: 'Já existe uma conta com esse e-mail.',
  weak_password: 'Senha fraca. Use pelo menos 6 caracteres.',
  email_address_invalid: 'E-mail inválido.',
  otp_expired: 'Código inválido ou expirado. Confira o e-mail ou peça um novo.',
  over_email_send_rate_limit: 'Muitas tentativas seguidas. Aguarde alguns minutos.',
  over_request_rate_limit: 'Muitas tentativas seguidas. Aguarde alguns minutos.',
}

export function mensagemErro(error) {
  if (error?.code && MENSAGENS[error.code]) return MENSAGENS[error.code]
  // O supabase-js chama de AuthRetryableFetchError tanto a falta de rede (status
  // 0) quanto erro do servidor (5xx, como o SMTP recusando o envio do código).
  if (error?.status === 0) return 'Sem conexão. Verifique sua internet e tente de novo.'
  if (error?.status >= 500) return 'Nosso servidor teve um problema. Tente de novo em instantes.'
  return 'Algo deu errado. Tente de novo.'
}
