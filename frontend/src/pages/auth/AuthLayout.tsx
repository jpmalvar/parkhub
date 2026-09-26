import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CircleCheckBig, ShieldCheck, Zap } from 'lucide-react'
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

      <div className="relative hidden overflow-hidden bg-brand-gradient lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_45%)]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:48px_48px]" />
        <motion.div
          animate={{ y: [0, -14, 0], rotate: [-2, 0, -2] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="relative w-[340px]"
        >
          <TicketStub ticket={SAMPLE} animate={false} />
        </motion.div>
        <div className="relative mt-12 max-w-sm space-y-3 text-white">
          {[
            { icon: <Zap className="size-4" />, text: 'Ticket digital gerado em segundos' },
            { icon: <CircleCheckBig className="size-4" />, text: 'Pague por Pix ou cartão, sem filas' },
            { icon: <ShieldCheck className="size-4" />, text: 'Dados protegidos com criptografia' },
          ].map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.15 }}
              className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium backdrop-blur"
            >
              {item.icon}
              {item.text}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
