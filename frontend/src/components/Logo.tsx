import clsx from 'clsx'

/** Placa azul de estacionamento com o "P" — mesmo desenho do favicon. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={clsx('shrink-0', className)} aria-hidden>
      <rect width="64" height="64" rx="12" fill="#1d4fb8" />
      <rect x="4" y="4" width="56" height="56" rx="9" fill="none" stroke="#fff" strokeWidth="2.5" />
      <path d="M24 47V17h10a9 9 0 0 1 0 18H24" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <LogoMark className="size-8" />
      {!compact && <span className="font-display text-[19px] font-bold tracking-tight">ParkHub</span>}
    </span>
  )
}
