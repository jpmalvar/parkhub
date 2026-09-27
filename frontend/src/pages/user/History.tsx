import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Clock, Download, Eye, Receipt, Search, Wallet } from 'lucide-react'
import { api, download } from '../../lib/api'
import type { Ticket } from '../../lib/types'
import { brl, dateTime, duration, methodLabel } from '../../lib/format'
import { useDebounced } from '../../lib/hooks'
import { Pagination } from '../../components/Pagination'
import { Plate } from '../../components/Plate'
import { StatCard } from '../../components/StatCard'
import { Badge, Card, EmptyState, IconButton, Input, Page, PageHeader, Segmented, Skeleton, stagger } from '../../components/ui'

const PAGE_SIZE = 20

export default function HistoryPage() {
  const [days, setDays] = useState<number>(90)
  const [status, setStatus] = useState<'all' | 'paid' | 'active'>('all')
  const [q, setQ] = useState('')
  const query = useDebounced(q)
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', 'history', days, status, query],
    queryFn: () => api<{ items: Ticket[] }>(`/tickets/mine?status=${status}&q=${encodeURIComponent(query)}${days ? `&days=${days}` : ''}`),
    placeholderData: keepPreviousData,
  })

  const items = data?.items ?? []
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [days, status, query])
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const paid = items.filter((t) => t.status === 'paid')
  const total = paid.reduce((s, t) => s + (t.amount_cents ?? 0), 0)
  const minutes = paid.reduce((s, t) => s + (t.duration_minutes ?? 0), 0)

  return (
    <Page>
      <PageHeader eyebrow="Minhas estadias" title="Histórico de gastos" subtitle="Consulte todas as suas estadias, valores pagos e comprovantes." />

      <motion.div variants={stagger.container} initial="hidden" animate="show" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total no período" value={total} format={(n) => brl(n)} icon={<Wallet />} />
        <StatCard label="Estadias pagas" value={paid.length} icon={<Receipt />} tone="accent" />
        <StatCard label="Permanência média" value={paid.length ? minutes / paid.length : 0} format={(n) => duration(n)} icon={<Clock />} tone="success" />
      </motion.div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <Input icon={<Search />} placeholder="Buscar por placa ou nº do ticket…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 lg:w-72" />
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            <Segmented
              size="sm"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'paid', label: 'Pagos' },
                { value: 'active', label: 'No pátio' },
              ]}
            />
            <Segmented
              size="sm"
              value={days}
              onChange={setDays}
              options={[
                { value: 30, label: '30 dias' },
                { value: 90, label: '90 dias' },
                { value: 365, label: '1 ano' },
                { value: 0, label: 'Tudo' },
              ]}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Receipt />} title="Nenhuma estadia encontrada" description="Ajuste os filtros ou estacione pela primeira vez." />
        ) : (
          <div className="overflow-x-auto">
            <table className="hidden w-full min-w-[720px] whitespace-nowrap text-sm sm:table">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-3 font-medium">Veículo</th>
                  <th className="px-3 py-3 font-medium">Entrada</th>
                  <th className="px-3 py-3 font-medium">Permanência</th>
                  <th className="px-3 py-3 font-medium">Pagamento</th>
                  <th className="px-3 py-3 text-right font-medium">Valor</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((t, i) => (
                  <motion.tr
                    key={t.code}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 12) * 0.025 }}
                    className="border-t border-border/70 transition hover:bg-surface-2/50"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Plate plate={t.plate} size="xs" />
                        <div className="text-xs text-muted">
                          #{t.code} · {t.spot.code}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted">{dateTime(t.entry_at)}</td>
                    <td className="px-3 py-3">{t.status === 'active' ? <Badge tone="success" dot>No pátio</Badge> : duration(t.duration_minutes ?? 0)}</td>
                    <td className="px-3 py-3 text-muted">{t.payment_method ? methodLabel[t.payment_method] : '—'}</td>
                    <td className="px-3 py-3 text-right font-semibold num">{t.status === 'paid' ? brl(t.amount_cents) : '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <IconButton label="Ver ticket" onClick={() => navigate(`/app/ticket/${t.code}`)}>
                          <Eye className="size-4" />
                        </IconButton>
                        {t.status === 'paid' && (
                          <IconButton label="Baixar comprovante" onClick={() => download(`/tickets/${t.code}/receipt.pdf`)}>
                            <Download className="size-4" />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {/* no celular a tabela vira uma lista, sem precisar rolar pro lado */}
            <ul className="divide-y divide-border/70 sm:hidden">
              {pageItems.map((t) => (
                <li key={t.code}>
                  <button type="button" onClick={() => navigate(`/app/ticket/${t.code}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Plate plate={t.plate} size="xs" />
                        <span className="text-xs text-muted">#{t.code}</span>
                      </div>
                      <div className="mt-1.5 text-xs text-muted">
                        {dateTime(t.entry_at)} · {t.status === 'active' ? 'no pátio' : duration(t.duration_minutes ?? 0)}
                        {t.payment_method && ` · ${methodLabel[t.payment_method]}`}
                      </div>
                    </div>
                    <div className="text-right font-semibold num">
                      {t.status === 'paid' ? brl(t.amount_cents) : <Badge tone="success" dot>Ativo</Badge>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {items.length > PAGE_SIZE && (
          <Pagination page={page} pages={pages} onChange={setPage} label={`${items.length} estadias`} />
        )}
      </Card>
    </Page>
  )
}
