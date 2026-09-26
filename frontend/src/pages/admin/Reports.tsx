import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { CalendarDays, Car, Download, FileSpreadsheet, FileText, Receipt, RotateCcw, Search, Wallet } from 'lucide-react'
import { api, download } from '../../lib/api'
import type { Ticket } from '../../lib/types'
import { brl, dateTime, duration, methodLabel } from '../../lib/format'
import { useDebounced } from '../../lib/hooks'
import { Plate } from '../../components/Plate'
import { StatCard } from '../../components/StatCard'
import { Pagination } from '../../components/Pagination'
import { Badge, Button, Card, EmptyState, IconButton, Input, Page, PageHeader, Select, Skeleton, stagger } from '../../components/ui'

interface ReportResponse {
  items: Ticket[]
  page: number
  pages: number
  summary: { count: number; revenue_cents: number; avg_cents: number; active: number }
}

export default function Reports() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [status, setStatus] = useState('all')
  const [kind, setKind] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const query = useDebounced(q.trim())

  useEffect(() => setPage(1), [query, status, kind, from, to])
  useEffect(() => {
    const fromUrl = params.get('q')
    if (fromUrl) setQ(fromUrl)
  }, [params])

  const filters = new URLSearchParams({ status, kind, q: query, ...(from && { date_from: from }), ...(to && { date_to: to }) })
  const { data, isLoading } = useQuery({
    queryKey: ['admin-tickets', filters.toString(), page],
    queryFn: () => api<ReportResponse>(`/admin/tickets?${filters}&page=${page}&page_size=15`),
    placeholderData: keepPreviousData,
  })

  const exportAs = (format: 'csv' | 'pdf') => {
    download(`/admin/tickets/export?format=${format}&${filters}`)
    toast.success(`Gerando relatório ${format.toUpperCase()}…`)
  }
  const reset = () => {
    setQ('')
    setStatus('all')
    setKind('all')
    setFrom('')
    setTo('')
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Gestão"
        title="Relatório de movimentação"
        subtitle="Histórico completo de entradas, saídas e pagamentos, com exportação."
        actions={
          <>
            <Button variant="secondary" icon={<FileSpreadsheet className="size-4" />} onClick={() => exportAs('csv')}>
              Exportar CSV
            </Button>
            <Button icon={<FileText className="size-4" />} onClick={() => exportAs('pdf')}>
              Exportar PDF
            </Button>
          </>
        }
      />

      {data && (
        <motion.div variants={stagger.container} initial="hidden" animate="show" className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Registros" value={data.summary.count} icon={<Receipt />} />
          <StatCard label="Faturamento" value={data.summary.revenue_cents} format={brl} icon={<Wallet />} tone="success" />
          <StatCard label="Ticket médio" value={data.summary.avg_cents} format={brl} icon={<Receipt />} tone="accent" />
          <StatCard label="No pátio" value={data.summary.active} icon={<Car />} tone="warning" />
        </motion.div>
      )}

      <Card>
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,1fr)_auto]">
          <Input icon={<Search />} placeholder="Placa, ticket ou cliente…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10">
            <option value="all">Todos os status</option>
            <option value="active">No pátio</option>
            <option value="paid">Pagos</option>
          </Select>
          <Select value={kind} onChange={(e) => setKind(e.target.value)} className="h-10">
            <option value="all">Carros e motos</option>
            <option value="carro">Somente carros</option>
            <option value="moto">Somente motos</option>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10" icon={<CalendarDays />} aria-label="Data inicial" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10" icon={<CalendarDays />} aria-label="Data final" />
          <Button variant="ghost" onClick={reset} icon={<RotateCcw className="size-4" />}>
            Limpar
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={<Search />} title="Nenhum registro encontrado" description="Tente outros filtros ou limpe a busca." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] whitespace-nowrap text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted">
                    <th className="px-5 py-3 font-medium">Ticket</th>
                    <th className="px-3 py-3 font-medium">Veículo</th>
                    <th className="px-3 py-3 font-medium">Cliente</th>
                    <th className="px-3 py-3 font-medium">Entrada</th>
                    <th className="px-3 py-3 font-medium">Saída</th>
                    <th className="px-3 py-3 font-medium">Permanência</th>
                    <th className="px-3 py-3 font-medium">Pagamento</th>
                    <th className="px-3 py-3 text-right font-medium">Valor</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((t, i) => (
                    <motion.tr key={t.code} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-t border-border/70 transition hover:bg-surface-2/50">
                      <td className="px-5 py-3 font-mono font-semibold">#{t.code}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Plate plate={t.plate} size="xs" />
                          <span className="text-xs text-muted">{t.spot.code}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{t.user?.full_name}</div>
                        <div className="text-xs text-muted">@{t.user?.username}</div>
                      </td>
                      <td className="px-3 py-3 text-muted">{dateTime(t.entry_at)}</td>
                      <td className="px-3 py-3 text-muted">{t.exit_at ? dateTime(t.exit_at) : <Badge tone="success" dot>No pátio</Badge>}</td>
                      <td className="px-3 py-3">{t.duration_minutes !== null ? duration(t.duration_minutes) : '—'}</td>
                      <td className="px-3 py-3 text-muted">{t.payment_method ? methodLabel[t.payment_method] : '—'}</td>
                      <td className="px-3 py-3 text-right font-semibold num">{t.amount_cents !== null ? brl(t.amount_cents) : '—'}</td>
                      <td className="px-5 py-3 text-right">
                        {t.status === 'paid' ? (
                          <IconButton label="Comprovante PDF" onClick={() => download(`/tickets/${t.code}/receipt.pdf`)}>
                            <Download className="size-4" />
                          </IconButton>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/pagar/${t.code}`)}>
                            Registrar saída
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} onChange={setPage} label={`${data.summary.count} registros`} />
          </>
        )}
      </Card>
    </Page>
  )
}
