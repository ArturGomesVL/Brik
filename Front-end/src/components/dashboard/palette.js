// Cores em JS. SVG e estilos inline não enxergam as classes do Tailwind, então
// os gráficos precisam dos valores literais — este é o único lugar onde eles
// existem fora do CSS. Os valores espelham os tokens do @theme em index.css:
// mudou lá, mude aqui (e vice-versa).
export const COLOR = {
  surface: '#ffffff', // fundo do card (recorta pontos e fatias)
  raise: '#f4f4f6',
  line: '#e8e8ec',
  mute: '#6b6b73',
  strong: '#000000',
  profit: '#1d4ed8', // lucro / resultado positivo
  loss: '#c62f2f', // prejuízo / resultado negativo
}

// Rampa da rosca de ROIs: quanto mais escuro o azul, melhor o retorno. A fatia
// selecionada sai desta rampa e vira preta, para destacar sem inventar cor.
export const ROI_RAMP = ['#1d4ed8', '#4172df', '#7297e8', '#a5bef1', '#cfdcf9']
