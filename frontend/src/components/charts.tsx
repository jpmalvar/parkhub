import type { ReactNode } from 'react'

export const CHART = {
  brand: '#3f72dc',
  brand2: '#6d97ee',
  accent: '#e0a91a',
  success: '#2fae70',
  warning: '#e0932a',
  danger: '#e05252',
  muted: '#8c8f96',
  palette: ['#3f72dc', '#e0a91a', '#2fae70', '#8c8f96', '#e05252'],
}

export const axisProps = {
  tick: { fill: CHART.muted, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

interface TooltipPayload {
  name?: string
  value?: number
  color?: string
  payload?: Record<string, unknown>
}

/** Tooltip estilizado para os gráficos Recharts. */
export function ChartTooltip({
  active,
  payload,
  label,
  format,
  labelFormat,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: ReactNode
  format?: (v: number, name?: string) => ReactNode
  labelFormat?: (label: ReactNode) => ReactNode
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs shadow-md">
      {label !== undefined && <div className="mb-1.5 font-semibold text-fg">{labelFormat ? labelFormat(label) : label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-muted">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name && <span>{p.name}:</span>}
          <span className="font-semibold text-fg">{format ? format(Number(p.value), p.name) : p.value}</span>
        </div>
      ))}
    </div>
  )
}
