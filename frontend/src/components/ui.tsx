import { forwardRef, useEffect, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, type LinkProps } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import clsx from 'clsx'

/* ------------------------------------------------------------------ botões */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-gradient text-white shadow-[0_8px_24px_-8px_var(--brand)] hover:shadow-[0_10px_30px_-6px_var(--brand)] hover:brightness-110',
  secondary: 'bg-surface-2 text-fg border border-border hover:bg-surface-3',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2',
  outline: 'border border-border text-fg hover:border-brand/60 hover:bg-brand/5',
  danger: 'bg-danger text-white hover:brightness-110 shadow-[0_8px_24px_-10px_var(--danger)]',
  success: 'bg-success text-white hover:brightness-110 shadow-[0_8px_24px_-10px_var(--success)]',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-xl',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return clsx(
    'relative inline-flex select-none items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    extra,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
})

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; icon?: ReactNode }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  )
}

export function IconButton({ className, label, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex size-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg active:scale-95',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ superfícies */
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('card', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5">
      <div className="flex items-center gap-3">
        {icon && <div className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">{icon}</div>}
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ formulário */
export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-fg/90">
        {label}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-xs font-medium text-danger">
            {error}
          </motion.p>
        ) : hint ? (
          <p className="text-xs text-muted">{hint}</p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export const inputClass =
  'h-11 w-full rounded-xl border border-border bg-surface-2/60 px-3.5 text-sm text-fg placeholder:text-muted/70 outline-none transition focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/15 disabled:opacity-60'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode; trailing?: ReactNode }>(
  function Input({ className, icon, trailing, ...rest }, ref) {
    if (!icon && !trailing) return <input ref={ref} className={clsx(inputClass, className)} {...rest} />
    return (
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted [&>svg]:size-4">{icon}</span>}
        <input ref={ref} className={clsx(inputClass, icon && 'pl-10', trailing && 'pr-11', className)} {...rest} />
        {trailing && <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
    )
  },
)

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(inputClass, 'cursor-pointer appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9', className)} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a93a8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }} {...rest}>
      {children}
    </select>
  )
}

/* ------------------------------------------------------------------ controle segmentado animado */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  options: { value: T; label: ReactNode; icon?: ReactNode }[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  const id = useId()
  return (
    <div role="tablist" className={clsx('inline-flex rounded-xl border border-border bg-surface-2/70 p-1', className)}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={String(opt.value)}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={clsx(
              'relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-lg border border-border bg-surface shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 [&>svg]:size-4">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ feedback */
const badgeTones = {
  brand: 'bg-brand/12 text-brand border-brand/20',
  success: 'bg-success/12 text-success border-success/25',
  danger: 'bg-danger/12 text-danger border-danger/25',
  warning: 'bg-warning/12 text-warning border-warning/25',
  neutral: 'bg-surface-2 text-muted border-border',
  accent: 'bg-accent/12 text-accent border-accent/25',
}

export function Badge({ tone = 'neutral', children, className, dot }: { tone?: keyof typeof badgeTones; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold', badgeTones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function LiveDot({ className, tone = 'success' }: { className?: string; tone?: 'success' | 'warning' | 'danger' }) {
  const color = { success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' }[tone]
  return (
    <span className={clsx('relative inline-flex size-2', className)}>
      <span className={clsx('absolute inset-0 rounded-full animate-pulse-ring', color)} />
      <span className={clsx('relative inline-flex size-2 rounded-full', color)} />
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('size-5 animate-spin text-brand', className)} />
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="relative mb-5 flex size-16 items-center justify-center rounded-2xl bg-brand/10 text-brand [&>svg]:size-7"
      >
        <div className="absolute inset-0 rounded-2xl bg-brand/10 blur-xl" />
        {icon}
      </motion.div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ modal */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={clsx(
              'relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-surface p-6 shadow-2xl sm:rounded-3xl',
              { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size],
            )}
          >
            <IconButton label="Fechar" onClick={onClose} className="absolute right-4 top-4">
              <X className="size-4" />
            </IconButton>
            {title && <h2 className="pr-10 text-lg font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-1 pr-8 text-sm text-muted">{description}</p>}
            <div className={clsx(title && 'mt-5')}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  tone = 'primary',
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: ReactNode
  confirmLabel?: string
  tone?: 'primary' | 'danger'
  loading?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant={tone} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ página */
export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06 } } },
  item: {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  },
}
