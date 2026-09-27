import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import { AnimatedNumber } from './AnimatedNumber'
import { stagger } from './ui'

export function StatCard({
  label,
  value,
  format,
  icon,
  hint,
  delta,
  tone = 'brand',
}: {
  label: string
  value: number
  format?: (n: number) => string
  icon: ReactNode
  hint?: ReactNode
  delta?: number | null
  tone?: 'brand' | 'success' | 'accent' | 'warning'
}) {
  const tones = {
    brand: 'bg-brand/12 text-brand',
    success: 'bg-success/12 text-success',
    accent: 'bg-accent/12 text-accent',
    warning: 'bg-warning/12 text-warning',
  }
  return (
    <motion.div variants={stagger.item} className="card group relative overflow-hidden p-5">
      <div className="relative flex items-start justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <span className={clsx('flex size-9 items-center justify-center rounded-xl [&>svg]:size-[18px]', tones[tone])}>{icon}</span>
      </div>
      <div className="relative mt-3 text-[26px] font-bold tracking-tight">
        <AnimatedNumber value={value} format={format} />
      </div>
      <div className="relative mt-1.5 flex items-center gap-2 text-xs text-muted">
        {delta !== undefined && delta !== null && Number.isFinite(delta) && (
          <span className={clsx('inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold', delta >= 0 ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger')}>
            {delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(delta).toFixed(1).replace('.', ',')}%
          </span>
        )}
        {hint}
      </div>
    </motion.div>
  )
}
