import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Car,
  ChartColumn,
  History,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  ScrollText,
  Search,
  SlidersHorizontal,
  SquareParking,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { post } from '../lib/api'
import { useMe, useOverview, useSetMe } from '../lib/hooks'
import { useRealtime, useRealtimeStatus, type RealtimeEvent } from '../lib/realtime'
import { Avatar } from './Avatar'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { CommandPalette } from './CommandPalette'
import { IconButton, LiveDot } from './ui'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

const userNav: NavItem[] = [
  { to: '/app', label: 'Painel', icon: <LayoutDashboard />, end: true },
  { to: '/app/estacionar', label: 'Estacionar', icon: <SquareParking /> },
  { to: '/app/historico', label: 'Histórico', icon: <History /> },
  { to: '/app/veiculos', label: 'Meus veículos', icon: <Car /> },
  { to: '/app/perfil', label: 'Minha conta', icon: <UserRound /> },
]

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard />, end: true },
  { to: '/admin/mapa', label: 'Mapa ao vivo', icon: <MapIcon /> },
  { to: '/admin/relatorios', label: 'Relatórios', icon: <ChartColumn /> },
  { to: '/admin/usuarios', label: 'Usuários', icon: <Users /> },
  { to: '/admin/tarifas', label: 'Tarifas', icon: <SlidersHorizontal /> },
  { to: '/admin/auditoria', label: 'Auditoria', icon: <ScrollText /> },
  { to: '/admin/perfil', label: 'Minha conta', icon: <UserRound /> },
]

function RealtimePill() {
  const status = useRealtimeStatus()
  const label = { online: 'Ao vivo', connecting: 'Conectando', offline: 'Sem conexão' }[status]
  return (
    <span
      className={clsx(
        'hidden items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium sm:inline-flex',
        status === 'online' ? 'border-success/30 bg-success/10 text-success' : 'border-warning/30 bg-warning/10 text-warning',
      )}
      title="A tela se atualiza sozinha quando algo muda"
    >
      <LiveDot tone={status === 'online' ? 'success' : 'warning'} />
      {label}
    </span>
  )
}

function OccupancyWidget() {
  const { data } = useOverview()
  if (!data) return null
  const pct = data.total ? Math.round((data.occupied / data.total) * 100) : 0
  return (
    <div className="rounded-xl border border-border bg-surface-2/60 p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted">Ocupação agora</span>
        <span className="font-bold num">{pct}%</span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          className="h-full rounded-full bg-brand"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="mt-2 text-[11px] text-muted">
        <span className="font-semibold text-success">{data.free}</span> de {data.total} vagas livres
      </div>
    </div>
  )
}

export function AppShell({ variant }: { variant: 'user' | 'admin' }) {
  const { data: user } = useMe()
  const setMe = useSetMe()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const nav = variant === 'admin' ? adminNav : userNav

  const onEvent = useCallback(
    (event: RealtimeEvent) => {
      if (variant === 'admin' && event.type === 'spots' && event.message) {
        toast(event.message, { duration: 3500 })
      }
    },
    [variant],
  )
  useRealtime(onEvent)

  useEffect(() => setMobileOpen(false), [location.pathname])

  useEffect(() => {
    if (variant !== 'admin') return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [variant])

  const logout = async () => {
    try {
      await post('/auth/logout')
    } finally {
      setMe(null)
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'overview' })
      toast.success('Você saiu da sua conta. Até logo!')
      navigate('/')
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-5">
      <div className="flex items-center justify-between">
        <NavLink to={nav[0].to}>
          <Logo />
        </NavLink>
        {variant === 'admin' && (
          <span className="rounded-md bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">Admin</span>
        )}
      </div>
      <nav className="flex flex-col gap-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'text-fg' : 'text-muted hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId={`nav-${variant}`}
                    className="absolute inset-0 rounded-xl border border-brand/20 bg-brand/10"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className={clsx('relative [&>svg]:size-[18px]', isActive ? 'text-brand' : 'transition group-hover:scale-110')}>{item.icon}</span>
                <span className="relative">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-4">
        <OccupancyWidget />
        {user && (
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <Avatar user={user} className="size-9 rounded-lg bg-brand text-xs text-white" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{user.full_name}</div>
              <div className="truncate text-xs text-muted">@{user.username}</div>
            </div>
            <IconButton label="Sair" onClick={logout}>
              <LogOut className="size-4" />
            </IconButton>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">{sidebar}</aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="absolute inset-y-0 left-0 w-72 border-r border-border bg-surface"
            >
              <IconButton label="Fechar menu" className="absolute right-3 top-3" onClick={() => setMobileOpen(false)}>
                <X className="size-4" />
              </IconButton>
              {sidebar}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg px-4 sm:px-6">
          <IconButton label="Abrir menu" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="size-5" />
          </IconButton>
          <div className="lg:hidden">
            <Logo compact />
          </div>
          {variant === 'admin' && (
            <button
              onClick={() => setPaletteOpen(true)}
              className="ml-1 hidden h-9 w-full max-w-sm items-center gap-2.5 rounded-xl border border-border bg-surface-2/60 px-3 text-sm text-muted transition hover:border-brand/40 hover:text-fg sm:flex"
            >
              <Search className="size-4" />
              Buscar veículo, ticket ou cliente…
              <kbd className="ml-auto rounded-md border border-border bg-surface px-1.5 text-[10px] font-semibold">Ctrl K</kbd>
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {variant === 'admin' && (
              <IconButton label="Buscar" className="sm:hidden" onClick={() => setPaletteOpen(true)}>
                <Search className="size-[18px]" />
              </IconButton>
            )}
            <RealtimePill />
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          <Outlet />
        </main>
      </div>

      {variant === 'admin' && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}
