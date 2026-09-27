import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Bike, Car, MapPin, Timer } from 'lucide-react'
import type { Tariff, Ticket } from '../lib/types'
import { brl, clock, timeOnly } from '../lib/format'
import { computeAmount, secondsToNextCharge } from '../lib/pricing'
import { useElapsed } from './Live'
import { Plate } from './Plate'
import { Badge, ButtonLink, stagger } from './ui'

export function ActiveTicketCard({ ticket, tariff }: { ticket: Ticket; tariff: Tariff }) {
  const seconds = useElapsed(ticket.entry_at)
  const { amount, graceApplied } = computeAmount(seconds, tariff)
  const next = secondsToNextCharge(seconds, tariff)
  const period = graceApplied ? tariff.grace_minutes * 60 : 3600
  const progress = Math.min(100, ((period - next) / period) * 100)

  return (
    <motion.div variants={stagger.item} className="card group relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-brand" />
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Plate plate={ticket.plate} size="sm" />
            <div className="flex items-center gap-2 whitespace-nowrap text-xs text-muted">
              {ticket.vehicle_kind === 'moto' ? <Bike className="size-3.5" /> : <Car className="size-3.5" />}
              <span>Ticket #{ticket.code}</span>
              <span>·</span>
              <span>entrada {timeOnly(ticket.entry_at)}</span>
            </div>
          </div>
          <Badge tone="brand">
            <MapPin className="size-3" /> {ticket.spot.code}
          </Badge>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
              <Timer className="size-3.5" /> Tempo
            </div>
            <div className="mt-1 font-mono text-2xl font-bold num">{clock(seconds)}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Valor atual</div>
            <motion.div key={amount} initial={{ scale: 1.18, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="mt-1 text-2xl font-bold num">
              {brl(amount)}
            </motion.div>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-brand transition-[width] duration-1000 ease-linear" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1.5 text-[11px] text-muted">
            {graceApplied ? (
              <>
                Tolerância gratuita termina em <strong className="text-fg">{Math.ceil(next / 60)} min</strong>
              </>
            ) : (
              <>
                Próxima hora cobrada em <strong className="text-fg">{Math.ceil(next / 60)} min</strong>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <ButtonLink to={`/app/ticket/${ticket.code}`} variant="secondary" size="sm">
            Ver ticket
          </ButtonLink>
          <ButtonLink to={`/app/pagar/${ticket.code}`} size="sm">
            Pagar e sair <ArrowRight className="size-3.5" />
          </ButtonLink>
        </div>
      </div>
      <Link to={`/app/ticket/${ticket.code}`} className="sr-only">
        Abrir ticket {ticket.code}
      </Link>
    </motion.div>
  )
}
