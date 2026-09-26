import { useEffect, useState, type ReactNode } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, Car, FileText, KeyRound, LogIn, LogOut, ScrollText, Search, ShieldAlert, SlidersHorizontal, Trash, UserCog, UserPlus } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../../lib/api'
import type { AuditEntry } from '../../lib/types'
import { dateTime, relative } from '../../lib/format'
import { useDebounced } from '../../lib/hooks'
import { Pagination } from '../../components/Pagination'
import { Card, EmptyState, Input, Page, PageHeader, Select, Skeleton } from '../../components/ui'

const ACTIONS: Record<string, { label: string; icon: ReactNode; tone: string }> = {
  entrada: { label: 'Entrada', icon: <ArrowDownLeft />, tone: 'bg-success/12 text-success' },
  saida: { label: 'Saída', icon: <ArrowUpRight />, tone: 'bg-brand/12 text-brand' },
  login: { label: 'Login', icon: <LogIn />, tone: 'bg-accent/12 text-accent' },
  logout: { label: 'Logout', icon: <LogOut />, tone: 'bg-surface-3 text-muted' },
  login_falhou: { label: 'Login falhou', icon: <ShieldAlert />, tone: 'bg-danger/12 text-danger' },
  cadastro: { label: 'Cadastro', icon: <UserPlus />, tone: 'bg-success/12 text-success' },
  tarifas: { label: 'Tarifas', icon: <SlidersHorizontal />, tone: 'bg-warning/12 text-warning' },
  usuario: { label: 'Usuário', icon: <UserCog />, tone: 'bg-warning/12 text-warning' },
  senha_alterada: { label: 'Senha alterada', icon: <KeyRound />, tone: 'bg-accent/12 text-accent' },
  exportacao: { label: 'Exportação', icon: <FileText />, tone: 'bg-surface-3 text-muted' },
  veiculo_salvo: { label: 'Veículo salvo', icon: <Car />, tone: 'bg-surface-3 text-muted' },
  veiculo_removido: { label: 'Veículo removido', icon: <Trash />, tone: 'bg-surface-3 text-muted' },
}

const meta = (action: string) => ACTIONS[action] ?? { label: action, icon: <ScrollText />, tone: 'bg-surface-3 text-muted' }

export default function Audit() {
  const [action, setAction] = useState('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const query = useDebounced(q.trim())
  useEffect(() => setPage(1), [action, query])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', action, query, page],
    queryFn: () => api<{ items: AuditEntry[]; page: number; pages: number; total: number; actions: string[] }>(`/admin/audit?action=${action}&q=${encodeURIComponent(query)}&page=${page}&page_size=20`),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  })

  return (
    <Page>
      <PageHeader eyebrow="Segurança" title="Log de auditoria" subtitle="Registro imutável de todas as ações relevantes: quem fez, o quê, quando e de onde." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <Input icon={<Search />} placeholder="Buscar por usuário ou detalhe…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 sm:max-w-sm" />
          <Select value={action} onChange={(e) => setAction(e.target.value)} className="h-10 sm:max-w-[220px]">
            <option value="all">Todas as ações</option>
            {data?.actions.map((a) => (
              <option key={a} value={a}>
                {meta(a).label}
              </option>
            ))}
          </Select>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={<ScrollText />} title="Nenhum registro encontrado" />
        ) : (
          <>
            <ol className="relative p-4 sm:p-6">
              <span className="absolute bottom-6 left-[37px] top-6 w-px bg-border sm:left-[45px]" />
              {data.items.map((entry, i) => {
                const m = meta(entry.action)
                return (
                  <motion.li key={entry.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="relative flex gap-4 py-2.5">
                    <span className={clsx('relative z-10 flex size-9 shrink-0 items-center justify-center rounded-xl ring-4 ring-surface [&>svg]:size-4', m.tone)}>{m.icon}</span>
                    <div className="min-w-0 flex-1 rounded-xl px-3 py-1.5 transition hover:bg-surface-2/60">
                      <div className="flex flex-wrap items-center gap-x-2 text-sm">
                        <span className="font-semibold">{m.label}</span>
                        <span className="text-muted">·</span>
                        <span className="font-medium">{entry.username ? `@${entry.username}` : 'sistema'}</span>
                        <span className="ml-auto text-xs text-muted" title={dateTime(entry.created_at)}>
                          {relative(entry.created_at)}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-sm text-muted">{entry.detail}</div>
                      {entry.ip && <div className="mt-0.5 font-mono text-[11px] text-muted/70">IP {entry.ip} · {dateTime(entry.created_at)}</div>}
                    </div>
                  </motion.li>
                )
              })}
            </ol>
            <Pagination page={data.page} pages={data.pages} onChange={setPage} label={`${data.total} registros`} />
          </>
        )}
      </Card>
    </Page>
  )
}
