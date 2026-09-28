// Cores em JS, para SVG e estilos inline. São as variáveis de CSS dos tokens do
// @theme (index.css), e não os valores literais: assim os gráficos trocam junto
// quando o app entra no modo escuro.
export const COLOR = {
  surface: 'var(--color-surface-card)', // fundo do card (recorta pontos e fatias)
  raise: 'var(--color-surface-raise)',
  line: 'var(--color-line)', // bordas e divisórias
  mute: 'var(--color-mute)',
  strong: 'var(--color-strong)', // títulos e valores
  accent: 'var(--color-accent)', // destaques
  profit: 'var(--color-profit)', // lucro / resultado positivo
  loss: 'var(--color-loss)', // prejuízo / resultado negativo
}

// Rampa da rosca de ROIs, derivada do azul petróleo da marca: quanto mais forte
// o azul, melhor o retorno (os valores de cada tema ficam em --roi-* no
// index.css). A fatia selecionada sai desta rampa e vira a cor de destaque.
export const ROI_RAMP = ['var(--roi-1)', 'var(--roi-2)', 'var(--roi-3)', 'var(--roi-4)', 'var(--roi-5)']
