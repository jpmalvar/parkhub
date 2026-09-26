import type { Tariff } from './types'

/** Espelho da regra de cobrança do backend, usado para o valor em tempo real e o simulador. */
export function computeAmount(seconds: number, t: Tariff) {
  const secs = Math.max(0, seconds)
  if (secs <= t.grace_minutes * 60) {
    return { amount: 0, hours: 0, graceApplied: true, capApplied: false, gross: 0, fullDays: 0 }
  }
  const hours = Math.max(1, Math.ceil(secs / 3600))
  const gross = hours * t.hourly_cents
  let amount = gross
  let fullDays = 0
  if (t.daily_cap_cents > 0) {
    fullDays = Math.floor(hours / 24)
    const rem = hours % 24
    amount = Math.min(gross, fullDays * t.daily_cap_cents + Math.min(rem * t.hourly_cents, t.daily_cap_cents))
  }
  return { amount, hours, graceApplied: false, capApplied: amount < gross, gross, fullDays }
}

/** Segundos até a próxima mudança de valor (fim da tolerância ou próxima hora iniciada). */
export function secondsToNextCharge(seconds: number, t: Tariff) {
  if (seconds <= t.grace_minutes * 60) return t.grace_minutes * 60 - seconds
  return 3600 - (seconds % 3600)
}
