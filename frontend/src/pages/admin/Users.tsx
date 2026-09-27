import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Crown, Search, ShieldCheck, UserCheck, UserRound, Users as UsersIcon, UserX } from 'lucide-react'
import { api, errorMessage, patch } from '../../lib/api'
import { useDebounced, useMe } from '../../lib/hooks'
import type { AdminUser } from '../../lib/types'
import { brl, dateOnly, initials, relative } from '../../lib/format'
import { StatCard } from '../../components/StatCard'
import { Badge, Button, Card, ConfirmModal, EmptyState, Input, Page, PageHeader, Skeleton, stagger } from '../../components/ui'

type Action = { user: AdminUser; change: { role?: 'user' | 'admin'; is_active?: boolean }; title: string; description: string; confirm: string; danger?: boolean }

export default function UsersPage() {
  const [q, setQ] = useState('')
  const query = useDebounced(q.trim())
  const [action, setAction] = useState<Action | null>(null)
  const { data: me } = useMe()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['admin-users', query], queryFn: () => api<{ items: AdminUser[] }>(`/admin/users?q=${encodeURIComponent(query)}`) })

  const update = useMutation({
    mutationFn: (a: Action) => patch(`/admin/users/${a.user.id}`, a.change),
    onSuccess: () => {
      toast.success('Usuário atualizado.')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setAction(null)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const items = data?.items ?? []
  const customers = items.filter((u) => u.role === 'user')

  return (
    <Page>
      <PageHeader eyebrow="Gestão" title="Usuários" subtitle="Clientes e administradores cadastrados, com métricas de uso." />
      <motion.div variants={stagger.container} initial="hidden" animate="show" className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Clientes" value={customers.length} icon={<UsersIcon />} />
        <StatCard label="Administradores" value={items.length - customers.length} icon={<ShieldCheck />} tone="accent" />
        <StatCard label="Contas ativas" value={items.filter((u) => u.is_active).length} icon={<UserCheck />} tone="success" />
        <StatCard label="Faturamento por cliente" value={customers.length ? customers.reduce((s, u) => s + u.spent_cents, 0) / customers.length : 0} format={brl} icon={<Crown />} tone="warning" hint="média" />
      </motion.div>

      <Card>
        <div className="border-b border-border p-4">
          <Input icon={<Search />} placeholder="Buscar por nome ou usuário…" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 sm:max-w-sm" />
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !items.length ? (
          <EmptyState icon={<UserRound />} title="Nenhum usuário encontrado" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] whitespace-nowrap text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-3 font-medium">Usuário</th>
                  <th className="px-3 py-3 font-medium">Papel</th>
                  <th className="px-3 py-3 font-medium">Estadias</th>
                  <th className="px-3 py-3 font-medium">Total gasto</th>
                  <th className="px-3 py-3 font-medium">Último acesso</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((u, i) => {
                  const self = u.id === me?.id
                  return (
                    <motion.tr key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="border-t border-border/70 transition hover:bg-surface-2/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={u.role === 'admin' ? 'flex size-9 items-center justify-center rounded-xl bg-brand text-xs font-bold text-white' : 'flex size-9 items-center justify-center rounded-xl bg-surface-3 text-xs font-bold'}>
                            {initials(u.full_name)}
                          </div>
                          <div>
                            <div className="font-medium">
                              {u.full_name} {self && <span className="text-xs text-muted">(você)</span>}
                            </div>
                            <div className="text-xs text-muted">
                              @{u.username} · desde {dateOnly(u.created_at)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">{u.role === 'admin' ? <Badge tone="brand">Administrador</Badge> : <Badge>Cliente</Badge>}</td>
                      <td className="px-3 py-3 num">
                        {u.tickets} {u.active_tickets > 0 && <Badge tone="success" className="ml-1">{u.active_tickets} no pátio</Badge>}
                      </td>
                      <td className="px-3 py-3 font-semibold num">{brl(u.spent_cents)}</td>
                      <td className="px-3 py-3 text-muted">{u.last_login_at ? relative(u.last_login_at) : '—'}</td>
                      <td className="px-3 py-3">{u.is_active ? <Badge tone="success" dot>Ativa</Badge> : <Badge tone="danger" dot>Desativada</Badge>}</td>
                      <td className="px-5 py-3">
                        {!self && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setAction({
                                  user: u,
                                  change: { role: u.role === 'admin' ? 'user' : 'admin' },
                                  title: u.role === 'admin' ? 'Remover acesso de administrador?' : 'Promover a administrador?',
                                  description: `${u.full_name} precisará entrar novamente para que a mudança tenha efeito.`,
                                  confirm: u.role === 'admin' ? 'Tornar cliente' : 'Promover',
                                })
                              }
                            >
                              {u.role === 'admin' ? 'Tornar cliente' : 'Promover'}
                            </Button>
                            <Button
                              size="sm"
                              variant={u.is_active ? 'outline' : 'success'}
                              icon={u.is_active ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                              onClick={() =>
                                setAction({
                                  user: u,
                                  change: { is_active: !u.is_active },
                                  title: u.is_active ? 'Desativar conta?' : 'Reativar conta?',
                                  description: u.is_active
                                    ? `${u.full_name} será desconectado(a) imediatamente e não poderá entrar até a conta ser reativada.`
                                    : `${u.full_name} poderá voltar a usar o sistema.`,
                                  confirm: u.is_active ? 'Desativar' : 'Reativar',
                                  danger: u.is_active,
                                })
                              }
                            >
                              {u.is_active ? 'Desativar' : 'Reativar'}
                            </Button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={!!action}
        onClose={() => setAction(null)}
        onConfirm={() => action && update.mutate(action)}
        loading={update.isPending}
        title={action?.title ?? ''}
        description={action?.description ?? ''}
        confirmLabel={action?.confirm}
        tone={action?.danger ? 'danger' : 'primary'}
      />
    </Page>
  )
}
