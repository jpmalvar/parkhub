import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Bike, Car } from 'lucide-react'
import clsx from 'clsx'
import type { Ticket } from '../lib/types'
import { dateOnly, kindLabel, timeOnly } from '../lib/format'
import { LogoMark } from './Logo'
import { Plate } from './Plate'

/** Ticket digital com visual de bilhete impresso (entalhes laterais, picote e QR Code). */
export function TicketStub({ ticket, animate = true, className }: { ticket: Ticket; animate?: boolean; className?: string }) {
  const content = (
    <div className={clsx('relative w-full max-w-sm text-left drop-shadow-[0_24px_40px_rgba(0,0,0,0.35)]', className)}>
      <div className="notch-bottom relative overflow-hidden rounded-t-3xl bg-brand-gradient px-6 pb-6 pt-5 text-white">
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark className="size-7 ring-2 ring-white/30 rounded-lg" />
            <span className="font-bold tracking-tight">ParkHub</span>
          </div>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">
            {ticket.status === 'active' ? 'Ativo' : 'Finalizado'}
          </span>
        </div>
        <div className="mt-5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">Ticket</div>
        <div className="font-mono text-4xl font-extrabold tracking-tight">#{ticket.code}</div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/60">Vaga</div>
            <div className="font-bold">{ticket.spot.code}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/60">Andar</div>
            <div className="font-bold">{ticket.spot.floor}º</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/60">Veículo</div>
            <div className="flex items-center gap-1 font-bold">
              {ticket.vehicle_kind === 'moto' ? <Bike className="size-3.5" /> : <Car className="size-3.5" />}
              {kindLabel(ticket.vehicle_kind)}
            </div>
          </div>
        </div>
      </div>

      <div className="notch-top rounded-b-3xl bg-surface">
      {/* picote */}
      <div className="relative mx-5 border-t-2 border-dashed border-border" />

      <div className="flex items-center gap-5 px-6 py-6">
        <div className="flex-1 space-y-3">
          <Plate plate={ticket.plate} size="sm" />
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted">Entrada</div>
            <div className="text-sm font-semibold">{dateOnly(ticket.entry_at)}</div>
            <div className="font-mono text-lg font-bold">{timeOnly(ticket.entry_at)}</div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-2.5 shadow-inner ring-1 ring-black/5">
          <QRCodeSVG value={`PARKHUB|${ticket.code}|${ticket.plate}`} size={104} level="M" fgColor="#0c1120" />
        </div>
      </div>
      <div className="px-6 pb-5 text-center text-[11px] text-muted">Apresente este QR Code na saída ou pague pelo app.</div>
      </div>
    </div>
  )

  if (!animate) return content
  return (
    <motion.div
      initial={{ clipPath: 'inset(0 0 100% 0)', y: -24, rotate: -1.5 }}
      animate={{ clipPath: 'inset(0 0 0% 0)', y: 0, rotate: 0 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      className="flex justify-center"
    >
      {content}
    </motion.div>
  )
}
