import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Logo } from '../../components/Logo'
import { ThemeToggle } from '../../components/ThemeToggle'
import { TicketStub } from '../../components/TicketStub'
import type { Ticket } from '../../lib/types'

const SAMPLE: Ticket = {
  code: '1042',
  plate: 'BRA2E19',
  plate_display: 'BRA2E19',
  plate_format: 'mercosul',
  vehicle_kind: 'carro',
  spot: { id: 4, floor: 1, number: 4, code: 'P1-04', kind: 'carro' },
  entry_at: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
  exit_at: null,
  status: 'active',
  amount_cents: null,
  billed_hours: null,
  payment_method: null,
  payment_detail: null,
  payment_ref: null,
  duration_minutes: null,
}

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="relative flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[400px]"
          >
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-8 text-center text-sm text-muted">{footer}</div>
          </motion.div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-[#1b1c1f] lg:flex lg:flex-col lg:items-center lg:justify-center">
        {/* faixa amarela tracejada, tipo marcação de piso */}
        <div className="absolute inset-y-0 left-10 w-1.5 bg-[repeating-linear-gradient(to_bottom,#e0b21c_0_36px,transparent_36px_64px)] opacity-70" />
        <div className="relative w-[340px] -rotate-2">
          <TicketStub ticket={SAMPLE} animate={false} />
        </div>
        <p className="relative mt-10 max-w-xs text-center text-sm leading-relaxed text-[#a3a4a9]">
          É assim que o ticket aparece no celular: vaga, placa, hora de entrada e o QR Code pra saída.
        </p>
      </div>
    </div>
  )
}
