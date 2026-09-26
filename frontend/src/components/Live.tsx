import { useNow } from '../lib/hooks'
import { clock, brl } from '../lib/format'
import { computeAmount } from '../lib/pricing'
import type { Tariff } from '../lib/types'

export function useElapsed(entryIso: string, end?: string | null) {
  const now = useNow(1000)
  const endMs = end ? new Date(end).getTime() : now
  return Math.max(0, (endMs - new Date(entryIso).getTime()) / 1000)
}

export function LiveClock({ entryAt, className }: { entryAt: string; className?: string }) {
  const seconds = useElapsed(entryAt)
  return <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>{clock(seconds)}</span>
}

export function LiveCost({ entryAt, tariff, className }: { entryAt: string; tariff: Tariff; className?: string }) {
  const seconds = useElapsed(entryAt)
  return <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>{brl(computeAmount(seconds, tariff).amount)}</span>
}
