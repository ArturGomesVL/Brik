import { useState } from 'react'
import BrandHeader from '../components/BrandHeader.jsx'
import { LightbulbIcon, ShieldCheckIcon, WarningIcon } from '../components/icons.jsx'

// Verificar IMEI: só no desktop (o link fica na TopBar; no celular a tela só
// avisa isso). EM CONSTRUÇÃO: a consulta de verdade (bloqueio, roubo, restrição)
// ainda não existe. Por enquanto a tela só confere se o número tem o formato de
// um IMEI — 15 dígitos com o último batendo pelo algoritmo de Luhn.

const DIGITOS = 15

// Luhn sobre os 15 dígitos: da direita para a esquerda, dobra um sim, um não.
function imeiValido(imei) {
  if (!/^\d{15}$/.test(imei)) return false
  let soma = 0
  for (let i = 0; i < DIGITOS; i++) {
    let d = Number(imei[DIGITOS - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    soma += d
  }
  return soma % 10 === 0
}

const ONDE_ACHAR = [
  { titulo: 'No próprio aparelho', texto: 'Disque *#06# e o IMEI aparece na tela.' },
  { titulo: 'No iPhone', texto: 'Ajustes > Geral > Sobre, logo abaixo do número de série.' },
  { titulo: 'Na caixa ou na nota fiscal', texto: 'Confira se é o mesmo número do aparelho: se não bater, desconfie.' },
]

function VerificarImei() {
  const [imei, setImei] = useState('')
  const completo = imei.length === DIGITOS
  const valido = completo && imeiValido(imei)

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-surface pb-28 shadow-xl lg:max-w-7xl lg:pb-16 lg:shadow-none">
      <BrandHeader />

      {/* Celular: a tela não funciona aqui, só avisa. */}
      <main className="flex flex-col items-center gap-2 px-8 py-16 text-center lg:hidden">
        <ShieldCheckIcon aria-hidden="true" className="h-12 w-12 text-line" />
        <h1 className="mt-1 text-xl font-bold text-ink">Verificar IMEI</h1>
        <p className="font-medium text-ink">Só funciona no computador</p>
        <p className="text-sm text-ink/60">Abra o Brik no computador para verificar o IMEI de um aparelho.</p>
      </main>

      {/* Desktop: na largura da TopBar (max-w-7xl), com a consulta à esquerda e as
          dicas de onde achar o IMEI numa coluna à direita. */}
      <main className="hidden px-8 pt-12 lg:block">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brik text-paper">
            <ShieldCheckIcon aria-hidden="true" className="h-8 w-8" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[34px] font-bold leading-tight tracking-tight text-ink">Verificar IMEI</h1>
              <span className="rounded-full bg-surface-raise px-3 py-1 text-xs font-medium text-ink/60">
                Só funciona no computador
              </span>
            </div>
            <p className="text-base text-ink/60">
              Antes de comprar um celular usado, confira o IMEI para não levar um aparelho bloqueado.
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-3 rounded-2xl bg-level-boa px-5 py-4 text-level-boa-ink" role="note">
          <WarningIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-[15px]">
            <strong>Esta tela ainda está sendo feita.</strong> Por enquanto ela só confere se o número tem
            o formato de um IMEI válido. A consulta de bloqueio, roubo ou restrição ainda não funciona.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_22rem] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
          <form onSubmit={(event) => event.preventDefault()} className="rounded-3xl bg-surface-card p-8 ring-1 ring-line">
            <label htmlFor="imei" className="text-base font-bold text-ink">
              IMEI do aparelho
            </label>
            <div className="mt-3 flex gap-4">
              <input
                id="imei"
                inputMode="numeric"
                autoComplete="off"
                placeholder="15 dígitos"
                value={imei}
                onChange={(event) => setImei(event.target.value.replace(/\D/g, '').slice(0, DIGITOS))}
                aria-describedby="imei-status"
                className="min-w-0 flex-1 rounded-2xl border border-line bg-surface-card px-5 py-4 font-mono text-2xl tracking-[0.12em] text-ink outline-none placeholder:font-sans placeholder:text-lg placeholder:tracking-normal placeholder:text-ink/35 focus:border-brik"
              />
              <button
                type="submit"
                disabled
                title="Ainda está sendo feito"
                className="rounded-2xl bg-brik px-10 text-lg font-bold text-paper disabled:cursor-not-allowed disabled:opacity-40"
              >
                Consultar
              </button>
            </div>

            {/* Um tracinho por dígito: dá para ver de longe quantos faltam. */}
            <div className="mt-4 flex gap-1.5" aria-hidden="true">
              {Array.from({ length: DIGITOS }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i >= imei.length ? 'bg-surface-raise' : !completo ? 'bg-brik' : valido ? 'bg-profit' : 'bg-loss'
                  }`}
                />
              ))}
            </div>

            <p id="imei-status" aria-live="polite" className="mt-3 min-h-6 text-[15px]">
              {imei.length === 0 ? (
                <span className="text-ink/50">Digite o número para conferir o formato.</span>
              ) : !completo ? (
                <span className="text-ink/50">
                  {imei.length} de {DIGITOS} dígitos
                </span>
              ) : valido ? (
                <span className="font-medium text-profit">
                  ✓ Formato válido. A consulta de bloqueio ainda está sendo feita.
                </span>
              ) : (
                <span className="font-medium text-loss">
                  ✗ Esse número não é um IMEI válido. Confira se digitou certo.
                </span>
              )}
            </p>

            {/* O que a consulta vai responder quando estiver pronta. */}
            <div className="mt-8 border-t border-line pt-6">
              <h2 className="text-sm font-bold text-ink">Resultado da consulta</h2>
              <ul className="mt-3 grid grid-cols-3 gap-3">
                {['Roubo ou furto', 'Bloqueio', 'Restrição'].map((item) => (
                  <li
                    key={item}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-dashed border-line px-4 py-4"
                  >
                    <span className="text-sm font-medium text-ink/50">{item}</span>
                    <span className="rounded-full bg-surface-raise px-2.5 py-1 text-[11px] font-medium text-ink/50">
                      Em breve
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </form>

          <section className="rounded-3xl bg-surface-card p-6 ring-1 ring-line">
            <h2 className="flex items-center gap-2 text-base font-bold text-ink">
              <LightbulbIcon aria-hidden="true" className="h-5 w-5 text-brik" />
              Onde encontrar o IMEI
            </h2>
            <ol className="mt-4 flex flex-col gap-4">
              {ONDE_ACHAR.map(({ titulo, texto }, i) => (
                <li key={titulo} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-raise text-sm font-bold text-brik">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">{titulo}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink/60">{texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    </div>
  )
}

export default VerificarImei
