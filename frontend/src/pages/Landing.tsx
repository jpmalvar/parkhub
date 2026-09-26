import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Car,
  ChartColumn,
  CircleCheckBig,
  Clock,
  CreditCard,
  Layers,
  MapPin,
  MousePointerClick,
  QrCode,
  Radio,
  ShieldCheck,
  Sparkles,
  Ticket as TicketIcon,
  Zap,
} from 'lucide-react'
import clsx from 'clsx'
import { useMe, useOverview } from '../lib/hooks'
import { useRealtime } from '../lib/realtime'
import { brl } from '../lib/format'
import { Logo, LogoMark } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { CarTop, spotColor } from '../components/GarageMap'
import { Plate } from '../components/Plate'
import { ButtonLink, LiveDot, Skeleton } from '../components/ui'
import { homeFor } from '../components/RequireAuth'

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
}

/* ------------------------------------------------------------------ navegação */
function Navbar() {
  const { data: user } = useMe()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={clsx('fixed inset-x-0 top-0 z-40 transition-all duration-300', scrolled ? 'border-b border-border bg-bg/70 backdrop-blur-xl' : 'border-b border-transparent')}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
          <a href="#recursos" className="transition hover:text-fg">Recursos</a>
          <a href="#como-funciona" className="transition hover:text-fg">Como funciona</a>
          <a href="#ocupacao" className="transition hover:text-fg">Ocupação</a>
          <a href="#precos" className="transition hover:text-fg">Preços</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <ButtonLink to={homeFor(user.role)} size="sm" icon={<ArrowRight className="size-4" />}>
              Ir para o painel
            </ButtonLink>
          ) : (
            <>
              <ButtonLink to="/entrar" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Entrar
              </ButtonLink>
              <ButtonLink to="/cadastro" size="sm">
                Criar conta
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ visual animado do hero */
function HeroVisual() {
  const [occupied, setOccupied] = useState<boolean[]>([true, false, true, true, false, true, false, true, false, true, true, false])
  const [selected, setSelected] = useState(4)

  useEffect(() => {
    const id = window.setInterval(() => {
      setOccupied((prev) => {
        const next = [...prev]
        const i = Math.floor(Math.random() * next.length)
        if (i !== selected) next[i] = !next[i]
        return next
      })
    }, 1700)
    return () => window.clearInterval(id)
  }, [selected])

  useEffect(() => {
    const id = window.setInterval(() => {
      setSelected((s) => {
        const free = occupied.map((o, i) => (!o && i !== s ? i : -1)).filter((i) => i >= 0)
        return free.length ? free[Math.floor(Math.random() * free.length)] : s
      })
    }, 4200)
    return () => window.clearInterval(id)
  }, [occupied])

  const row = (from: number, top: boolean) => (
    <div className={clsx('grid grid-cols-6 divide-x-2 divide-border', top ? 'border-t-4 border-border/80' : 'border-b-4 border-border/80')}>
      {occupied.slice(from, from + 6).map((busy, k) => {
        const i = from + k
        const isSel = i === selected && !busy
        return (
          <div key={i} className={clsx('relative flex aspect-[0.62] items-center justify-center', isSel && 'bg-brand/15')}>
            <span className={clsx('absolute font-mono text-[9px] font-bold text-muted/60', top ? 'bottom-1' : 'top-1')}>{String(i + 1).padStart(2, '0')}</span>
            {busy && (
              <motion.div
                key={`car-${i}-${busy}`}
                initial={{ y: top ? 50 : -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 110, damping: 16 }}
                className={clsx('h-[74%]', !top && 'rotate-180')}
              >
                <CarTop color={spotColor(i * 3)} className="h-full" />
              </motion.div>
            )}
            {isSel && (
              <motion.span layoutId="hero-sel" className="absolute inset-0.5 rounded-lg border-2 border-brand shadow-[0_0_20px_var(--brand)]" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute -inset-10 -z-10 rounded-full bg-brand/25 blur-[90px]" />
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 18 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="card relative overflow-hidden p-4 [transform-style:preserve-3d]"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="size-4 text-brand" /> Andar 1
          </div>
          <span className="flex items-center gap-2 text-xs text-success">
            <LiveDot /> ao vivo
          </span>
        </div>
        <div className="rounded-xl border border-border bg-surface-2/60 p-2.5">
          {row(0, true)}
          <div className="lane animate-lane my-1 h-9 rounded-lg" />
          {row(6, false)}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-2/70 px-3 py-2.5 text-xs">
          <span className="text-muted">Vaga selecionada</span>
          <span className="font-mono font-bold text-brand">P1-{String(selected + 1).padStart(2, '0')}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9, duration: 0.7 }}
        className="absolute -right-4 -top-6 hidden sm:block"
      >
        <div className="glass animate-float flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl">
          <div className="flex size-9 items-center justify-center rounded-xl bg-success/15 text-success">
            <CircleCheckBig className="size-5" />
          </div>
          <div>
            <div className="text-xs font-semibold">Pagamento aprovado</div>
            <div className="text-[11px] text-muted">Pix · {brl(2000)} · saída liberada</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.7 }}
        className="absolute -bottom-8 -left-6 hidden sm:block"
      >
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl [animation-delay:-3s] animate-float">
          <div className="flex size-9 items-center justify-center rounded-xl bg-brand/15 text-brand">
            <TicketIcon className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              Ticket #1042 <Plate plate="BRA2E19" size="xs" />
            </div>
            <div className="text-[11px] text-muted">Entrada às 08:14 · 1h 32min</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ hero */
function Hero() {
  const { data } = useOverview()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 600], [0, 80])
  const opacity = useTransform(scrollY, [0, 500], [1, 0.3])

  return (
    <section className="relative overflow-hidden pb-24 pt-32 sm:pt-40">
      <div className="grid-bg pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          animate={{ x: [0, 60, -30, 0], y: [0, -40, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-[10%] top-10 size-[480px] rounded-full bg-brand/20 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -50, 40, 0], y: [0, 50, -20, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-[5%] top-40 size-[420px] rounded-full bg-accent/15 blur-[120px]"
        />
      </div>

      <motion.div style={{ y, opacity }} className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:px-8">
        <div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/70 px-3.5 py-1.5 text-xs font-medium backdrop-blur">
              <LiveDot />
              {data ? (
                <span>
                  <strong className="text-success">{data.free}</strong> vagas livres agora
                </span>
              ) : (
                'Ocupação em tempo real'
              )}
              <span className="h-3 w-px bg-border" />
              <span className="text-muted">3 andares · 45 vagas</span>
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 text-[42px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-6xl lg:text-[68px]"
          >
            Estacione em segundos.
            <br />
            <span className="text-gradient">Gerencie em tempo real.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted"
          >
            O ParkHub reúne mapa interativo de vagas, ticket digital com QR Code, pagamento por Pix ou cartão e um painel
            administrativo completo, tudo sincronizado ao vivo.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <ButtonLink to="/cadastro" size="lg" icon={<Sparkles className="size-4" />}>
              Começar agora, é grátis
            </ButtonLink>
            <ButtonLink to="/entrar" size="lg" variant="secondary">
              Já tenho conta <ArrowRight className="size-4" />
            </ButtonLink>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-8"
          >
            {[
              { value: data?.free, label: 'vagas livres' },
              { value: data?.entries_today, label: 'entradas hoje' },
              { value: data?.prices.grace_minutes, label: 'min de tolerância', suffix: '' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold tracking-tight">{s.value === undefined ? <Skeleton className="h-8 w-14" /> : <AnimatedNumber value={s.value} />}</div>
                <div className="mt-1 text-xs text-muted">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <HeroVisual />
      </motion.div>
    </section>
  )
}

/* ------------------------------------------------------------------ ocupação ao vivo */
function LiveOccupancy() {
  const { data } = useOverview()
  return (
    <section id="ocupacao" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div {...reveal} className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              <Radio className="size-4" /> Direto do pátio
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ocupação em tempo real</h2>
            <p className="mt-2 max-w-lg text-muted">Os números abaixo se atualizam sozinhos a cada entrada ou saída de veículo.</p>
          </div>
        </motion.div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {!data &&
            [1, 2, 3].map((f) => (
              <div key={f} className="card p-6">
                <Skeleton className="h-32" />
              </div>
            ))}
          {data?.floors.map((f, i) => {
            const pct = f.total ? Math.round((f.occupied / f.total) * 100) : 0
            return (
              <motion.div key={f.floor} {...reveal} transition={{ ...reveal.transition, delay: i * 0.1 }} className="card p-6">
                {(
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wider text-muted">Andar</div>
                        <div className="text-3xl font-bold">{f.floor}º</div>
                      </div>
                      <div className="text-right">
                        <div className={clsx('text-3xl font-bold num', f.free === 0 ? 'text-danger' : 'text-success')}>
                          <AnimatedNumber value={f.free} />
                        </div>
                        <div className="text-xs text-muted">livres de {f.total}</div>
                      </div>
                    </div>
                    <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-surface-3">
                      <motion.div
                        className={clsx('h-full rounded-full', pct > 85 ? 'bg-danger' : 'bg-brand-gradient')}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <div className="mt-4 flex gap-5 text-sm text-muted">
                      <span className="flex items-center gap-1.5">
                        <Car className="size-4" /> {f.car_total - f.car_occupied} carros
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Bike className="size-4" /> {f.moto_total - f.moto_occupied} motos
                      </span>
                      <span className="ml-auto font-semibold text-fg">{pct}% ocupado</span>
                    </div>
                  </>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ recursos */
function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--x', `${e.clientX - rect.left}px`)
        e.currentTarget.style.setProperty('--y', `${e.clientY - rect.top}px`)
      }}
      className={clsx(
        'group card relative h-full overflow-hidden p-7 transition-transform duration-300 hover:-translate-y-1',
        'before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100',
        'before:bg-[radial-gradient(420px_circle_at_var(--x)_var(--y),color-mix(in_oklab,var(--brand)_16%,transparent),transparent_60%)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

const FEATURES = [
  { icon: <MousePointerClick />, title: 'Mapa interativo de vagas', text: 'Escolha a vaga exata em uma planta visual de cada andar, com vagas exclusivas para motos sinalizadas.' },
  { icon: <QrCode />, title: 'Ticket digital com QR Code', text: 'Nada de papel: o ticket fica no celular, com cronômetro e valor atualizados a cada segundo.' },
  { icon: <CreditCard />, title: 'Pix, cartão ou dinheiro', text: 'Pague pelo app com Pix (QR Code e copia-e-cola) ou cartão, e baixe o comprovante em PDF.' },
  { icon: <ChartColumn />, title: 'Painel com análises', text: 'Faturamento, horários de pico, ocupação por andar e métodos de pagamento em gráficos claros.' },
  { icon: <Zap />, title: 'Tudo em tempo real', text: 'Conexão WebSocket: quando um carro entra ou sai, todas as telas são atualizadas na hora.' },
  { icon: <ShieldCheck />, title: 'Segurança de verdade', text: 'Senhas com bcrypt, proteção CSRF, bloqueio contra força bruta e log de auditoria completo.' },
]

function Features() {
  return (
    <section id="recursos" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand">Recursos</div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Tudo o que um estacionamento moderno precisa</h2>
          <p className="mt-3 text-muted">Da entrada à saída, cada etapa foi pensada para ser rápida para o cliente e transparente para a gestão.</p>
        </motion.div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} {...reveal} transition={{ ...reveal.transition, delay: (i % 3) * 0.08 }}>
              <SpotlightCard>
                <div className="relative mb-5 flex size-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-[0_10px_30px_-10px_var(--brand)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 [&>svg]:size-5">
                  {f.icon}
                </div>
                <h3 className="relative text-lg font-semibold">{f.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ como funciona */
function HowItWorks() {
  const steps = [
    { icon: <MapPin />, title: 'Escolha a vaga', text: 'Informe a placa, veja o mapa do andar e toque na vaga livre que preferir.' },
    { icon: <TicketIcon />, title: 'Receba o ticket', text: 'Um ticket digital com QR Code é gerado na hora, com cronômetro ao vivo.' },
    { icon: <BadgeCheck />, title: 'Pague e saia', text: 'Pague pelo app em segundos. A cancela é liberada e o comprovante fica salvo.' },
  ]
  return (
    <section id="como-funciona" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand">Como funciona</div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Três passos. Zero fila.</h2>
        </motion.div>
        <div className="relative mt-16 grid gap-10 md:grid-cols-3">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-[16%] right-[16%] top-8 hidden h-0.5 origin-left bg-gradient-to-r from-brand via-accent to-brand md:block"
          />
          {steps.map((s, i) => (
            <motion.div key={s.title} {...reveal} transition={{ ...reveal.transition, delay: 0.2 + i * 0.2 }} className="relative text-center">
              <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl border border-border bg-surface text-brand shadow-soft [&>svg]:size-6">
                {s.icon}
                <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white">{i + 1}</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ preços */
function Pricing() {
  const { data } = useOverview()
  const prices = data?.prices
  const plans = [
    { kind: 'carro', title: 'Carro', icon: <Car />, p: prices?.carro, featured: true },
    { kind: 'moto', title: 'Moto', icon: <Bike />, p: prices?.moto, featured: false },
  ]
  return (
    <section id="precos" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand">Preços</div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Tarifas simples e justas</h2>
          <p className="mt-3 text-muted">Cobrança por hora iniciada, com tolerância gratuita e teto diário. Sem surpresas.</p>
        </motion.div>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.kind}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.12 }}
              className={clsx('relative overflow-hidden rounded-3xl p-[1.5px]', plan.featured ? 'bg-brand-gradient' : 'bg-border')}
            >
              <div className="relative h-full rounded-[calc(1.5rem-1.5px)] bg-surface p-8">
                {plan.featured && (
                  <span className="absolute right-6 top-6 rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand">Mais usado</span>
                )}
                <div className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand [&>svg]:size-6">{plan.icon}</div>
                <h3 className="mt-5 text-xl font-semibold">{plan.title}</h3>
                <div className="mt-4 flex items-end gap-1">
                  {plan.p ? (
                    <>
                      <span className="text-5xl font-extrabold tracking-tight">{brl(plan.p.hourly_cents)}</span>
                      <span className="mb-1.5 text-muted">/hora</span>
                    </>
                  ) : (
                    <Skeleton className="h-12 w-40" />
                  )}
                </div>
                <ul className="mt-7 space-y-3 text-sm">
                  {[
                    `Tolerância grátis de ${prices?.grace_minutes ?? '…'} minutos`,
                    plan.p?.daily_cap_cents ? `Diária máxima de ${brl(plan.p.daily_cap_cents)}` : 'Sem teto diário',
                    'Cobrança por hora iniciada',
                    'Pagamento por Pix, cartão ou dinheiro',
                    'Comprovante digital em PDF',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CircleCheckBig className="size-4 shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
                <ButtonLink to="/cadastro" className="mt-8 w-full" variant={plan.featured ? 'primary' : 'secondary'}>
                  Estacionar agora
                </ButtonLink>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ CTA + rodapé */
function CallToAction() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div {...reveal} className="relative overflow-hidden rounded-[2rem] bg-brand-gradient px-8 py-16 text-center text-white sm:px-16">
          <div className="absolute -left-20 -top-20 size-72 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-24 -right-10 size-80 rounded-full bg-accent/40 blur-3xl" />
          <div className="relative">
            <Clock className="mx-auto size-10 opacity-80" />
            <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Seu tempo vale mais do que uma fila.</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">Crie sua conta em menos de um minuto e estacione com o ParkHub hoje mesmo.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/cadastro" className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold text-[#2b1f8f] shadow-xl transition hover:scale-[1.03]">
                Criar minha conta <ArrowRight className="size-4" />
              </Link>
              <Link to="/entrar" className="inline-flex h-12 items-center rounded-xl border border-white/40 px-6 font-semibold transition hover:bg-white/10">
                Entrar
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-6" />
          <span>© {new Date().getFullYear()} ParkHub · Estacionamento inteligente</span>
        </div>
        <div className="flex gap-6">
          <a href="/api/docs" target="_blank" rel="noreferrer" className="transition hover:text-fg">API</a>
          <a href="#precos" className="transition hover:text-fg">Preços</a>
          <Link to="/entrar" className="transition hover:text-fg">Área do cliente</Link>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  useRealtime()
  return (
    <div className="relative overflow-x-hidden">
      <Navbar />
      <Hero />
      <LiveOccupancy />
      <Features />
      <HowItWorks />
      <Pricing />
      <CallToAction />
      <Footer />
    </div>
  )
}
