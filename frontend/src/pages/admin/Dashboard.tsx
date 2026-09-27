import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, ArrowDownLeft, ArrowUpRight, Bike, Car, Clock, CreditCard, Gauge, Receipt, TrendingUp, Users, Wallet } from 'lucide-react'
import { api } from '../../lib/api'
import type { AdminStats } from '../../lib/types'
import { brl, duration, intFmt, relative } from '../../lib/format'
import { StatCard } from '../../components/StatCard'
import { AnimatedNumber } from '../../components/AnimatedNumber'
import { CHART, ChartTooltip, axisProps } from '../../components/charts'
import { ButtonLink, Card, CardHeader, LiveDot, Page, PageHeader, Segmented, Skeleton, stagger } from '../../components/ui'

const compactBrl = (cents: number) =>
  cents >= 100000 ? `R$ ${(cents / 100000).toFixed(1).replace('.', ',')} mil` : brl(cents).replace(',00', '')

export default function AdminDashboard() {
  const [days, setDays] = useState(30)
  const { data } = useQuery({
    queryKey: ['admin-stats', days],
    queryFn: () => api<AdminStats>(`/admin/stats?days=${days}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-80" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  const k = data.kpis
  const delta = k.prev_revenue_cents ? ((k.revenue_cents - k.prev_revenue_cents) / k.prev_revenue_cents) * 100 : null
  const peak = data.entries_by_hour.reduce((a, b) => (b.entries > a.entries ? b : a), data.entries_by_hour[0])
  const methodTotal = data.by_method.reduce((s, m) => s + m.tickets, 0)
  const kindTotal = data.by_kind.reduce((s, m) => s + m.revenue_cents, 0)

  return (
    <Page>
      <PageHeader
        eyebrow="Painel administrativo"
        title="Visão geral do estacionamento"
        subtitle={
          <span className="inline-flex items-center gap-2">
            <LiveDot /> Dados atualizados em tempo real
          </span>
        }
        actions={
          <Segmented
            value={days}
            onChange={setDays}
            options={[
              { value: 7, label: '7 dias' },
              { value: 30, label: '30 dias' },
              { value: 90, label: '90 dias' },
            ]}
          />
        }
      />

      <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label={`Faturamento (${days} dias)`} value={k.revenue_cents} format={brl} icon={<Wallet />} delta={delta} hint="vs. período anterior" />
        <StatCard label="Faturamento hoje" value={k.revenue_today_cents} format={brl} icon={<TrendingUp />} tone="success" />
        <StatCard label="Ticket médio" value={k.avg_ticket_cents} format={brl} icon={<Receipt />} tone="accent" hint={`${intFmt(k.tickets)} estadias pagas`} />
        <StatCard label="Permanência média" value={k.avg_stay_minutes} format={(n) => duration(n)} icon={<Clock />} tone="warning" hint={`${k.customers} clientes · ${k.new_customers} novos`} />
      </motion.div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Faturamento diário" subtitle={`Receita de saídas pagas nos últimos ${days} dias`} icon={<Wallet className="size-4" />} />
          <div className="h-72 px-2 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenue_series} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={CHART.brand} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="revStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={CHART.brand} />
                    <stop offset="100%" stopColor={CHART.brand} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART.muted} strokeOpacity={0.12} />
                <XAxis dataKey="label" {...axisProps} minTickGap={24} />
                <YAxis {...axisProps} width={72} tickFormatter={(v) => compactBrl(v)} />
                <Tooltip
                  cursor={{ stroke: CHART.brand, strokeOpacity: 0.3 }}
                  content={<ChartTooltip format={(v, name) => (name === 'Estadias' ? v : brl(v))} labelFormat={(l) => `Dia ${l}`} />}
                />
                <Area type="monotone" dataKey="revenue_cents" name="Faturamento" stroke="url(#revStroke)" strokeWidth={2.5} fill="url(#rev)" animationDuration={1400} activeDot={{ r: 5, strokeWidth: 0, fill: CHART.brand }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Ocupação agora" subtitle={`${k.occupied} de ${k.total_spots} vagas ocupadas`} icon={<Gauge className="size-4" />} />
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ value: k.occupancy_pct }]} startAngle={210} endAngle={-30}>
                <defs>
                  <linearGradient id="occ" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={CHART.brand} />
                    <stop offset="100%" stopColor={CHART.brand} />
                  </linearGradient>
                </defs>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={20} fill="url(#occ)" background={{ fill: CHART.muted, fillOpacity: 0.12 }} animationDuration={1400} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-extrabold tracking-tight">
                <AnimatedNumber value={k.occupancy_pct} format={(n) => `${Math.round(n)}%`} />
              </div>
              <div className="text-xs text-muted">ocupação</div>
            </div>
          </div>
          <div className="space-y-3 px-5 pb-5">
            {data.floors.map((f) => (
              <div key={f.floor} className="flex items-center gap-3 text-sm">
                <span className="w-16 font-medium">{f.floor}º andar</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${(f.occupied / f.total) * 100}%` }} transition={{ duration: 1 }} />
                </div>
                <span className="w-12 text-right text-xs text-muted num">
                  {f.occupied}/{f.total}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-1 lg:col-span-2">
          <CardHeader title="Horários de pico" subtitle={`Maior movimento às ${peak.hour}h`} icon={<Activity className="size-4" />} />
          <div className="h-60 px-2 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.entries_by_hour.filter((h) => h.hour >= 5)} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.muted} strokeOpacity={0.12} />
                <XAxis dataKey="hour" {...axisProps} tickFormatter={(h) => `${h}h`} interval={2} />
                <YAxis {...axisProps} />
                <Tooltip cursor={{ fill: CHART.brand, fillOpacity: 0.06 }} content={<ChartTooltip labelFormat={(l) => `${l}h às ${Number(l) + 1}h`} format={(v) => `${v} entradas`} />} />
                <Bar dataKey="entries" name="Entradas" radius={[6, 6, 2, 2]} animationDuration={1200}>
                  {data.entries_by_hour
                    .filter((h) => h.hour >= 5)
                    .map((h) => (
                      <Cell key={h.hour} fill={h.hour === peak.hour ? CHART.accent : CHART.brand} fillOpacity={h.hour === peak.hour ? 1 : 0.75} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Formas de pagamento" subtitle={`${intFmt(methodTotal)} transações`} icon={<CreditCard className="size-4" />} />
          <div className="flex items-center gap-4 p-5">
            <div className="relative size-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.by_method} dataKey="tickets" nameKey="label" innerRadius="62%" outerRadius="100%" paddingAngle={3} stroke="none" animationDuration={1200}>
                    {data.by_method.map((m, i) => (
                      <Cell key={m.method} fill={CHART.palette[i % CHART.palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip format={(v) => `${v} pagamentos`} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5">
              {data.by_method.map((m, i) => (
                <div key={m.method} className="flex items-center gap-2.5 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: CHART.palette[i % CHART.palette.length] }} />
                  <span className="flex-1">{m.label}</span>
                  <span className="font-semibold num">{methodTotal ? Math.round((m.tickets / methodTotal) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Carros × Motos" subtitle="Participação no faturamento" icon={<Car className="size-4" />} />
          <div className="space-y-5 p-5">
            {data.by_kind.map((kd) => {
              const pct = kindTotal ? (kd.revenue_cents / kindTotal) * 100 : 0
              return (
                <div key={kd.kind}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      {kd.kind === 'moto' ? <Bike className="size-4 text-warning" /> : <Car className="size-4 text-brand" />}
                      {kd.kind === 'moto' ? 'Motos' : 'Carros'}
                    </span>
                    <span className="font-semibold num">{brl(kd.revenue_cents)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-3">
                    <motion.div
                      className={kd.kind === 'moto' ? 'h-full rounded-full bg-warning' : 'h-full rounded-full bg-brand'}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {intFmt(kd.tickets)} estadias · {pct.toFixed(0)}%
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Atividade recente"
          subtitle="Entradas e saídas registradas"
          icon={<Users className="size-4" />}
          action={
            <ButtonLink to="/admin/auditoria" variant="ghost" size="sm">
              Ver auditoria
            </ButtonLink>
          }
        />
        <div className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-2">
          {data.recent.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface-2/60"
            >
              <span className={a.action === 'entrada' ? 'flex size-8 items-center justify-center rounded-lg bg-success/12 text-success' : 'flex size-8 items-center justify-center rounded-lg bg-brand/12 text-brand'}>
                {a.action === 'entrada' ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.detail}</div>
                <div className="text-xs text-muted">
                  @{a.username} · {relative(a.created_at)}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </Page>
  )
}
