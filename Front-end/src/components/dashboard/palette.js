// Cores em JS. SVG e estilos inline não enxergam as classes do Tailwind, então
// os gráficos precisam dos valores literais — este é o único lugar onde eles
// existem fora do CSS. Os valores espelham os tokens do @theme em index.css:
// mudou lá, mude aqui (e vice-versa).
export const COLOR = {
  surface: '#ffffff', // fundo do card (recorta pontos e fatias)
  raise: '#efeee9',
  line: '#d9d9d6', // Cinza claro: bordas e divisórias
  mute: '#6b6a64',
  strong: '#2b2b2b', // Grafite: títulos e valores
  accent: '#0046d8', // Azul royal: destaques
  profit: '#2f6b4a', // lucro / resultado positivo
  loss: '#b3432f', // prejuízo / resultado negativo
}

// Rampa da rosca de ROIs, derivada do azul petróleo da marca: quanto mais
// escuro o azul, melhor o retorno. A fatia selecionada sai desta rampa e vira
// azul royal — a cor de destaque da paleta.
export const ROI_RAMP = ['#0f4c5c', '#3a6d7a', '#6b929c', '#9db8bf', '#cfdfe3']
