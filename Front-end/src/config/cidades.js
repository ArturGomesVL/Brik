// Filtro de cidade do Início. A OLX devolve o local como "Cidade, Bairro" em
// location_neighborhood (o location_city do worker é sempre "Recife", então não
// serve para filtrar).

export const TODAS = 'todas'

// Grupos de cidades que aparecem como uma opção só, antes das cidades soltas.
export const GRUPOS = [{ value: 'grande-recife', label: 'Grande Recife', cidades: ['Recife', 'Olinda'] }]

export function cidadeDe(item) {
  return item.location_neighborhood?.split(',')[0].trim() || null
}

// true se o item passa no filtro escolhido (TODAS, um grupo ou o nome de uma cidade).
export function passaNaCidade(item, filtro) {
  if (filtro === TODAS) return true
  const cidade = cidadeDe(item)
  const grupo = GRUPOS.find((g) => g.value === filtro)
  return grupo ? grupo.cidades.includes(cidade) : cidade === filtro
}
