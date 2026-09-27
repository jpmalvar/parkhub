import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CircleCheckBig, Download, Info, MapPin, Timer } from 'lucide-react'
import { api, download } from '../../lib/api'
import type { MapFloor, Quote, Tariff, Ticket } from '../../lib/types'
import { brl, clock, dateTime, duration, methodLabel } from '../../lib/format'
import { computeAmount, secondsToNextCharge } from '../../lib/pricing'
import { useElapsed } from '../../components/Live'
import { TicketStub } from '../../components/TicketStub'
import { GarageMap } from '../../components/GarageMap'
import { Button, ButtonLink, Card, CardHeader, EmptyState, Page, PageHeader, Skeleton } from '../../components/ui'

export type TicketDetail = { ticket: Ticket; quote: Quote; tariff: Tariff }

function LivePanel({ ticket, tariff }: { ticket: Ticket; tariff: Tariff }) {
  const seconds = useElapsed(ticket.entry_at)
  const calc = computeAmount(seconds, tariff)
  const next = secondsToNextCharge(seconds, tariff)
  return (
    <Card className="relative overflow-hidden p-6">
      <div className="relative grid gap-6 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <Timer className="size-4" /> Tempo estacionado
          </div>
          <div className="mt-2 font-mono text-4xl font-extrabold tracking-tight num sm:text-5xl">{clock(seconds)}</div>
        </div>
        <div className="sm:text-right">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Valor até agora</div>
          <motion.div key={calc.amount} initial={{ scale: 1.2, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="mt-2 text-4xl font-extrabold tracking-tight text-brand sm:text-5xl">
            {brl(calc.amount)}
          </motion.div>
        </div>
      </div>
      <div className="relative mt-6 rounded-xl bg-surface-2/70 p-4 text-sm">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-brand" />
          <div className="text-muted">
            {calc.graceApplied ? (
              <>
                Você está dentro da <strong className="text-fg">tolerância gratuita</strong>. Saia nos próximos <strong className="text-fg">{Math.ceil(next / 60)} min</strong> sem pagar nada.
              </>
            ) : (
              <>
                {calc.hours} hora(s) cobrada(s) × {brl(tariff.hourly_cents)}
                {calc.capApplied && <>, <strong className="text-success">teto diário aplicado</strong></>}. O valor sobe para{' '}
                <strong className="text-fg">{brl(computeAmount(seconds + next + 1, tariff).amount)}</strong> em {Math.ceil(next / 60)} min.
              </>
            )}
          </div>
        </div>
      </div>
      <ButtonLink to={`/app/pagar/${ticket.code}`} size="lg" className="relative mt-6 w-full">
        Pagar e liberar saída <ArrowRight className="size-4" />
      </ButtonLink>
    </Card>
  )
}

export default function TicketPage() {
  const { code = '' } = useParams()
  const detail = useQuery({ queryKey: ['ticket', code], queryFn: () => api<TicketDetail>(`/tickets/${code}`) })
  const map = useQuery({ queryKey: ['spots'], queryFn: () => api<{ floors: MapFloor[] }>('/spots'), enabled: detail.data?.ticket.status === 'active' })

  if (detail.isError) {
    return (
      <Card>
        <EmptyState icon={<Info />} title="Ticket não encontrado" description="Verifique o número do ticket ou volte ao painel." action={<ButtonLink to="/app">Voltar ao painel</ButtonLink>} />
      </Card>
    )
  }
  if (!detail.data) return <Skeleton className="h-[600px]" />

  const { ticket, tariff } = detail.data
  const floor = map.data?.floors.find((f) => f.floor === ticket.spot.floor)

  return (
    <Page>
      <PageHeader
        eyebrow={`Ticket #${ticket.code}`}
        title={ticket.status === 'active' ? 'Seu veículo está estacionado' : 'Estadia finalizada'}
        subtitle={`Entrada em ${dateTime(ticket.entry_at)}`}
        actions={
          <ButtonLink to="/app" variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />}>
            Voltar
          </ButtonLink>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div>
          <TicketStub ticket={ticket} />
        </div>
        <div className="space-y-6">
          {ticket.status === 'active' ? (
            <>
              <LivePanel ticket={ticket} tariff={tariff} />
              <Card>
                <CardHeader title="Onde está meu veículo?" subtitle={`${ticket.spot.floor}º andar · vaga ${ticket.spot.code}`} icon={<MapPin className="size-4" />} />
                <div className="p-4 sm:p-5">{floor ? <GarageMap floor={floor} mode="view" highlightId={ticket.spot.id} /> : <Skeleton className="h-64" />}</div>
              </Card>
            </>
          ) : (
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-success/15 text-success">
                  <CircleCheckBig className="size-6" />
                </div>
                <div>
                  <div className="font-semibold">Pagamento confirmado</div>
                  <div className="text-sm text-muted">Saída em {dateTime(ticket.exit_at)}</div>
                </div>
                <div className="ml-auto text-3xl font-extrabold">{brl(ticket.amount_cents)}</div>
              </div>
              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-surface-2/70 p-3.5">
                  <dt className="text-xs text-muted">Permanência</dt>
                  <dd className="font-semibold">{duration(ticket.duration_minutes ?? 0)}</dd>
                </div>
                <div className="rounded-xl bg-surface-2/70 p-3.5">
                  <dt className="text-xs text-muted">Forma de pagamento</dt>
                  <dd className="font-semibold">{methodLabel[ticket.payment_method ?? 'isento']}</dd>
                </div>
                <div className="rounded-xl bg-surface-2/70 p-3.5">
                  <dt className="text-xs text-muted">Detalhes</dt>
                  <dd className="truncate font-semibold" title={ticket.payment_detail ?? ''}>{ticket.payment_detail}</dd>
                </div>
              </dl>
              <Button variant="secondary" className="mt-6" icon={<Download className="size-4" />} onClick={() => download(`/tickets/${ticket.code}/receipt.pdf`)}>
                Baixar comprovante (PDF)
              </Button>
            </Card>
          )}
        </div>
      </div>
    </Page>
  )
}
