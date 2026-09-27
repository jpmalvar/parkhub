import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Bike, ChevronsRight, CornerRightUp } from 'lucide-react'
import clsx from 'clsx'
import type { MapFloor, MapSpot, VehicleKind } from '../lib/types'

// Cores comuns de carro no Brasil: muito branco, prata e preto, um vermelho de vez em quando.
const CAR_COLORS = ['#e8e8e6', '#a9adb3', '#2b2d31', '#e8e8e6', '#7b8088', '#b3342d', '#a9adb3', '#2c4a7a', '#cfc6b4', '#2b2d31']

// Carro do próprio usuário em amarelo, pra achar rápido no mapa.
const MINE = '#f2bf2f'

export function CarTop({ color = '#a9adb3', className }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 40 72" className={className} aria-hidden>
      <defs>
        <linearGradient id={`body-${color}`} x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.85" />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="38" rx="19" ry="33" fill="black" opacity="0.25" />
      <rect x="4" y="3" width="32" height="66" rx="11" fill={`url(#body-${color})`} />
      <rect x="1" y="21" width="4" height="6" rx="2" fill={color} />
      <rect x="35" y="21" width="4" height="6" rx="2" fill={color} />
      <path d="M8 22 Q20 16 32 22 L30 32 Q20 29 10 32 Z" fill="#0b1220" opacity="0.85" />
      <rect x="10" y="33" width="20" height="17" rx="4" fill="black" opacity="0.12" />
      <path d="M10 53 Q20 56 30 53 L31 60 Q20 63 9 60 Z" fill="#0b1220" opacity="0.8" />
      <rect x="7" y="4.5" width="7" height="3" rx="1.5" fill="#fff8d6" opacity="0.9" />
      <rect x="26" y="4.5" width="7" height="3" rx="1.5" fill="#fff8d6" opacity="0.9" />
      <rect x="7" y="65" width="6" height="2.5" rx="1" fill="#ff4d6d" />
      <rect x="27" y="65" width="6" height="2.5" rx="1" fill="#ff4d6d" />
    </svg>
  )
}

function MotoTop({ color = '#f59e0b', className }: { color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 20 60" className={className} aria-hidden>
      <ellipse cx="10" cy="31" rx="8" ry="27" fill="black" opacity="0.25" />
      <rect x="7" y="2" width="6" height="12" rx="3" fill="#1f2937" />
      <rect x="7" y="46" width="6" height="12" rx="3" fill="#1f2937" />
      <rect x="5" y="12" width="10" height="36" rx="5" fill={color} />
      <rect x="1" y="15" width="18" height="2.5" rx="1.25" fill="#334155" />
      <rect x="6.5" y="26" width="7" height="14" rx="3.5" fill="#0b1220" opacity="0.7" />
    </svg>
  )
}

export function spotColor(seed: number | null | undefined) {
  return CAR_COLORS[(seed ?? 0) % CAR_COLORS.length]
}

interface Props {
  floor: MapFloor
  mode?: 'select' | 'admin' | 'view'
  selectedId?: number | null
  highlightId?: number | null
  allowKind?: VehicleKind
  onSelect?: (spot: MapSpot) => void
}

export function GarageMap({ floor, mode = 'view', selectedId, highlightId, allowKind, onSelect }: Props) {
  const top = floor.spots.slice(0, 8)
  const bottom = floor.spots.slice(8)

  const renderSpot = (spot: MapSpot, row: 'top' | 'bottom', index: number) => {
    const incompatible = mode === 'select' && allowKind !== undefined && spot.kind !== allowKind
    const selectable =
      (mode === 'select' && !spot.occupied && !incompatible) || (mode === 'admin' && spot.occupied)
    const selected = selectedId === spot.id
    const highlighted = highlightId === spot.id
    const color = spot.mine ? MINE : spotColor(spot.color_seed)
    const fromLane = row === 'top' ? 70 : -70

    return (
      <motion.button
        key={spot.id}
        type="button"
        disabled={!selectable}
        onClick={() => selectable && onSelect?.(spot)}
        whileHover={selectable ? { y: row === 'top' ? -3 : 3 } : undefined}
        whileTap={selectable ? { scale: 0.96 } : undefined}
        aria-label={`Vaga ${spot.code}${spot.kind === 'moto' ? ' (moto)' : ''} — ${spot.occupied ? 'ocupada' : 'livre'}`}
        className={clsx(
          'group relative flex aspect-[0.62] flex-col items-center overflow-hidden border-border/0 transition-colors duration-200',
          row === 'top' ? 'justify-end rounded-b-xl pb-1.5' : 'justify-start rounded-t-xl pt-1.5',
          selectable ? 'cursor-pointer' : 'cursor-default',
          selectable && !selected && 'hover:bg-brand/10',
          selected && 'bg-brand/15',
          incompatible && 'opacity-35',
          spot.kind === 'moto' && !incompatible && 'bg-warning/[0.04]',
        )}
      >
        {/* número da vaga pintado no chão */}
        <span
          className={clsx(
            'absolute left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold tracking-wider',
            row === 'top' ? 'top-1.5' : 'bottom-1.5',
            selected ? 'text-brand' : 'text-muted/70',
          )}
        >
          {String(spot.number).padStart(2, '0')}
        </span>

        {spot.kind === 'moto' && (
          <span className={clsx('absolute inset-x-1 h-[3px] rounded-full bg-warning/60', row === 'top' ? 'top-0' : 'bottom-0')} />
        )}

        {incompatible && (
          <span className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_6px,color-mix(in_oklab,var(--muted)_18%,transparent)_6px_8px)]" />
        )}

        <div className="relative flex h-full w-full items-center justify-center">
          <AnimatePresence>
            {spot.occupied ? (
              <motion.div
                key="vehicle"
                initial={{ y: fromLane, opacity: 0, rotate: row === 'top' ? -8 : 8 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: fromLane, opacity: 0, rotate: row === 'top' ? 8 : -8 }}
                transition={{ type: 'spring', stiffness: 120, damping: 17, delay: index * 0.025 }}
                className={clsx('relative flex h-[78%] items-center justify-center', row === 'bottom' && 'rotate-180')}
              >
                {spot.kind === 'moto' ? (
                  <MotoTop color={spot.mine ? MINE : spotColor((spot.color_seed ?? 0) + 3)} className="h-[70%]" />
                ) : (
                  <CarTop color={color} className="h-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]" />
                )}
              </motion.div>
            ) : selected ? (
              <motion.div
                key="ghost"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                className={clsx('flex h-[78%] items-center justify-center opacity-80', row === 'bottom' && 'rotate-180')}
              >
                {spot.kind === 'moto' ? (
                  <MotoTop color={MINE} className="h-[70%] opacity-70" />
                ) : (
                  <CarTop color={MINE} className="h-full opacity-70" />
                )}
              </motion.div>
            ) : spot.kind === 'moto' ? (
              <Bike key="bike" className="size-4 text-warning/70" />
            ) : (
              <span key="p" className="text-sm font-black text-muted/15 transition group-hover:text-brand/50">
                P
              </span>
            )}
          </AnimatePresence>
        </div>

        {spot.mine && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-brand px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-lg">
            Seu
          </span>
        )}
        {(selected || highlighted) && (
          <motion.span
            layoutId={highlighted ? undefined : 'spot-selection'}
            className={clsx(
              'pointer-events-none absolute inset-0.5 rounded-xl border-2',
              highlighted ? 'animate-pulse border-accent' : 'border-brand',
            )}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          />
        )}
      </motion.button>
    )
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="relative min-w-[500px] rounded-xl border border-border bg-surface-2/50 p-2.5 sm:p-4">
        {/* fileira superior */}
        <div className="grid grid-cols-8 divide-x-2 divide-border rounded-t-xl border-t-4 border-border/80">
          {top.map((s, i) => renderSpot(s, 'top', i))}
        </div>

        {/* pista de circulação */}
        <div className="relative my-1 flex h-14 items-center overflow-hidden rounded-xl lane animate-lane">
          <div className="absolute left-3 flex items-center gap-1.5 rounded-md bg-success/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
            Entrada <ArrowRight className="size-3" />
          </div>
          <div className="mx-auto flex gap-10 text-muted/40">
            {[0, 1, 2].map((i) => (
              <ChevronsRight key={i} className="size-5" />
            ))}
          </div>
          <div className="absolute right-3 flex items-center gap-1.5 rounded-md bg-danger/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-danger">
            Saída <ArrowRight className="size-3" />
          </div>
        </div>

        {/* fileira inferior + rampa */}
        <div className="grid grid-cols-8 divide-x-2 divide-border rounded-b-xl border-b-4 border-border/80">
          {bottom.map((s, i) => renderSpot(s, 'bottom', i + 8))}
          <div className="flex aspect-[0.62] flex-col items-center justify-center gap-1 rounded-t-xl bg-[repeating-linear-gradient(-45deg,transparent_0_8px,color-mix(in_oklab,var(--muted)_10%,transparent)_8px_16px)] text-center text-muted/70">
            <CornerRightUp className="size-4" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Rampa</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MapLegend({ showMine = true }: { showMine?: boolean }) {
  const item = (swatch: React.ReactNode, label: string) => (
    <span className="flex items-center gap-2">
      {swatch}
      {label}
    </span>
  )
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
      {item(<span className="size-3 rounded border-2 border-dashed border-border" />, 'Livre')}
      {item(<CarTop color="#64748b" className="h-4" />, 'Ocupada')}
      {showMine && item(<CarTop color={MINE} className="h-4" />, 'Seu veículo')}
      {item(<span className="h-1 w-3 rounded-full bg-warning/70" />, 'Exclusiva para motos')}
      {item(<span className="size-3 rounded border-2 border-brand" />, 'Selecionada')}
    </div>
  )
}

export function FloorTabs({
  floors,
  value,
  onChange,
  kind,
}: {
  floors: MapFloor[]
  value: number
  onChange: (floor: number) => void
  kind?: VehicleKind
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {floors.map((f) => {
        const pool = kind ? f.spots.filter((s) => s.kind === kind) : f.spots
        const free = pool.filter((s) => !s.occupied).length
        const active = f.floor === value
        return (
          <button
            key={f.floor}
            type="button"
            onClick={() => onChange(f.floor)}
            className={clsx(
              'relative flex min-w-[120px] flex-1 items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left transition',
              active ? 'border-brand/50 text-fg' : 'border-border text-muted hover:border-brand/30 hover:text-fg',
            )}
          >
            {active && (
              <motion.span layoutId="floor-tab" className="absolute inset-0 rounded-xl bg-brand/10" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
            )}
            <span className="relative">
              <span className="block text-[11px] font-medium uppercase tracking-wider opacity-70">Andar</span>
              <span className="text-lg font-bold">{f.floor}º</span>
            </span>
            <span className="relative text-right">
              <span className={clsx('block text-lg font-bold num', free === 0 ? 'text-danger' : 'text-success')}>{free}</span>
              <span className="block text-[10px] uppercase tracking-wide opacity-70">livres</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
