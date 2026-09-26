import clsx from 'clsx'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={clsx('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id="ph-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b7dff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#ph-logo)" />
      <path d="M22 46V18h12.5a9.5 9.5 0 0 1 0 19H29" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22" cy="46" r="3.2" fill="#fff" />
    </svg>
  )
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="size-8 drop-shadow-[0_6px_16px_rgba(124,109,255,0.45)]" />
      {!compact && (
        <span className="text-[17px] font-bold tracking-tight">
          Park<span className="text-gradient">Hub</span>
        </span>
      )}
    </span>
  )
}
