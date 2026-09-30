import { FIELDS } from './calc.js'
import { supabase } from './supabase.js'

// Cálculos guardados na calculadora (public.calculos). Os valores vão em reais
// inteiros, como a calculadora trabalha.

export async function listarCalculos() {
  const { data, error } = await supabase.from('calculos').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// values: { compra: '1450', reparos: '', ... } (strings da calculadora).
export async function salvarCalculo(nome, values) {
  const linha = { nome: nome.trim() }
  FIELDS.forEach(({ key }) => {
    linha[key] = Number(values[key] || 0)
  })
  const { error } = await supabase.from('calculos').insert(linha)
  if (error) throw error
}

// Linha do banco -> valores da calculadora (strings; zero vira campo vazio).
export function paraValores(calculo) {
  return Object.fromEntries(FIELDS.map(({ key }) => [key, Number(calculo[key]) ? String(Math.round(calculo[key])) : '']))
}

export async function apagarCalculo(id) {
  const { error } = await supabase.from('calculos').delete().eq('id', id)
  if (error) throw error
}
