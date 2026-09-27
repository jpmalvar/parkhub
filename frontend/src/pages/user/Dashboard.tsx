import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, Bike, Car, Clock, Download, Layers, Plus, Receipt, SquareParking, Wallet } from 'lucide-react'
import { api, download } from '../../lib/api'
import { useMe, useOverview } from '../../lib/hooks'
import type { MeSummary, Tariff, Ticket } from '../../lib/types'
import { brl, dateTime, duration, firstName, greeting, methodLabel } from '../../lib/format'
import { ActiveTicketCard } from '../../components/ActiveTicketCard'
import { StatCard } from '../../components/StatCard'
import { ChartTooltip, CHART, axisProps } from '../../components/charts'
import { Plate } from '../../components/Plate'
import { ButtonLink, Card, CardHeader, EmptyState, IconButton, Page, PageHeader, Skeleton, stagger } from '../../components/ui'

export function useMyTickets() {
  return useQuery({
    queryKey: ['tickets', 'mine'],
    queryFn: () => api<{ items: Ticket[]; tariffs: Record<'carro' | 'moto', Tariff> }>('/tickets/mine'),
  })
}

export default function UserDashboard() {
  const { data: user } = useMe()
  const tickets = useMyTickets()
  const summary = useQuery({ queryKey: ['me-summary'], queryFn: () => api<MeSummary>('/me/summary') })
  const { data: overview } = useOverview()

  const active = tickets.data?.items.filter((t) => t.status === 'active') ?? []
  const recent = tickets.data?.items.filter((t) => t.status === 'paid').slice(0, 5) ?? []
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Page>
      <PageHeader
        eyebrow={today}
        title={
          <>
            {greeting()}, {user ? firstName(user.full_name) : ''}
          </>
        }
        subtitle={active.length ? `Você tem ${active.length} veículo(s) estacionado(s) agora.` : 'Nenhum veículo estacionado no momento.'}
        actions={
          <ButtonLink to="/app/estacionar" icon={<Plus className="size-4" />}>
            Estacionar agora
          </ButtonLink>
        }
      />

      {/* tickets ativos */}
      <section className="mb-8">
        {tickets.isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : active.length ? (
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {active.map((t) => (
              <ActiveTicketCard key={t.code} ticket={t} tariff={tickets.data!.tariffs[t.vehicle_kind]} />
            ))}
          </motion.div>
        ) : (
          <Card className="overflow-hidden">
            <EmptyState
              icon={<SquareParking />}
              title="Pronto para estacionar?"
              description={`Temos ${overview?.free ?? '…'} vagas livres agora. Escolha a sua no mapa e receba o ticket digital na hora.`}
              action={
                <ButtonLink to="/app/estacionar" icon={<ArrowRight className="size-4" />}>
                  Escolher vaga
                </ButtonLink>
              }
            />
          </Card>
        )}
      </section>

      {/* estatísticas */}
      {summary.data ? (
        <motion.div variants={stagger.container} initial="hidden" animate="show" className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total investido" value={summary.data.total_spent_cents} format={(n) => brl(n)} icon={<Wallet />} />
          <StatCard label="Visitas" value={summary.data.visits} icon={<Receipt />} tone="accent" hint="estadias concluídas" />
          <StatCard label="Tempo estacionado" value={summary.data.total_minutes / 60} format={(n) => `${Math.round(n)}h`} icon={<Clock />} tone="success" hint={`média de ${duration(summary.data.avg_minutes)}`} />
          <StatCard
            label="Andar favorito"
            value={summary.data.favorite_floor ?? 0}
            format={(n) => (n ? `${Math.round(n)}º` : '—')}
            icon={<Layers />}
            tone="warning"
          />
        </motion.div>
      ) : (
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Gastos por mês" subtitle="Últimos 6 meses" icon={<Wallet className="size-4" />} />
          <div className="h-64 px-2 pb-4 pt-4">
            {summary.data && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.data.monthly} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barUser" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor={CHART.brand} />
                      <stop offset="1" stopColor={CHART.brand} stopOpacity={0.75} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={CHART.muted} strokeOpacity={0.12} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} width={60} tickFormatter={(v) => brl(v).replace(',00', '')} />
                  <Tooltip cursor={{ fill: CHART.brand, fillOpacity: 0.06 }} content={<ChartTooltip format={(v) => brl(v)} />} />
                  <Bar dataKey="amount_cents" name="Gasto" fill="url(#barUser)" radius={[8, 8, 2, 2]} maxBarSize={42} animationDuration={1200} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Vagas agora" subtitle="Atualizado em tempo real" icon={<Layers className="size-4" />} />
          <div className="space-y-4 p-5">
            {overview?.floors.map((f) => {
              const pct = Math.round((f.occupied / f.total) * 100)
              return (
                <div key={f.floor}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{f.floor}º andar</span>
                    <span className="flex items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Car className="size-3.5" /> {f.car_total - f.car_occupied}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bike className="size-3.5" /> {f.moto_total - f.moto_occupied}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                    <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
                  </div>
                </div>
              )
            })}
            {overview && (
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                <div className="rounded-xl bg-surface-2/70 p-3">
                  <div className="text-xs text-muted">Carro / hora</div>
                  <div className="text-lg font-bold">{brl(overview.prices.carro.hourly_cents)}</div>
                </div>
                <div className="rounded-xl bg-surface-2/70 p-3">
                  <div className="text-xs text-muted">Moto / hora</div>
                  <div className="text-lg font-bold">{brl(overview.prices.moto.hourly_cents)}</div>
                </div>
                <div className="col-span-2 text-xs text-muted">
                  Tolerância de {overview.prices.grace_minutes} min grátis · diária máx. {brl(overview.prices.carro.daily_cap_cents)} (carro)
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Últimas estadias"
          icon={<Receipt className="size-4" />}
          action={
            <ButtonLink to="/app/historico" variant="ghost" size="sm">
              Ver tudo <ArrowRight className="size-3.5" />
            </ButtonLink>
          }
        />
        <div className="p-2 pt-3">
          {recent.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">Suas estadias finalizadas aparecerão aqui.</p>
          ) : (
            recent.map((t) => (
              <div key={t.code} className="flex items-center gap-4 rounded-xl px-3 py-3 transition hover:bg-surface-2/60">
                <Plate plate={t.plate} size="xs" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    Vaga {t.spot.code} · {duration(t.duration_minutes ?? 0)}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {dateTime(t.exit_at)} · {methodLabel[t.payment_method ?? 'isento']}
                  </div>
                </div>
                <div className="text-sm font-semibold num">{brl(t.amount_cents)}</div>
                <IconButton label="Baixar comprovante" onClick={() => download(`/tickets/${t.code}/receipt.pdf`)}>
                  <Download className="size-4" />
                </IconButton>
              </div>
            ))
          )}
        </div>
      </Card>
    </Page>
  )
}
