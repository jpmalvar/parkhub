import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Bike, Car } from 'lucide-react'
import clsx from 'clsx'
import { useMe, useOverview } from '../lib/hooks'
import { useRealtime } from '../lib/realtime'
import { brl } from '../lib/format'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { AnimatedNumber } from '../components/AnimatedNumber'
import { CarTop, spotColor } from '../components/GarageMap'
import { ButtonLink, Skeleton } from '../components/ui'
import { homeFor } from '../components/RequireAuth'

function Navbar() {
  const { data: user } = useMe()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={clsx('sticky top-0 z-40 border-b bg-bg transition-colors', scrolled ? 'border-border' : 'border-transparent')}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
          <a href="#como-funciona" className="hover:text-fg">Como funciona</a>
          <a href="#precos" className="hover:text-fg">Preços</a>
          <a href="#historia" className="hover:text-fg">De onde veio</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <ButtonLink to={homeFor(user.role)} size="sm">
              Ir para o painel
            </ButtonLink>
          ) : (
            <>
              {/* o wrapper esconde no celular; "hidden" direto no botão brigava com o inline-flex dele */}
              <span className="hidden sm:block">
                <ButtonLink to="/entrar" variant="ghost" size="sm">
                  Entrar
                </ButtonLink>
              </span>
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

/* Um andar de mentira que vai mudando sozinho, só pra ilustrar o mapa do app. */
function FloorPreview() {
  const [occupied, setOccupied] = useState<boolean[]>([true, false, true, true, false, true, false, true, false, true, true, false])

  useEffect(() => {
    const id = window.setInterval(() => {
      setOccupied((prev) => {
        const next = [...prev]
        const i = Math.floor(Math.random() * next.length)
        next[i] = !next[i]
        return next
      })
    }, 2200)
    return () => window.clearInterval(id)
  }, [])

  const row = (from: number, top: boolean) => (
    <div className={clsx('grid grid-cols-6 divide-x divide-dashed divide-muted/40', top ? 'border-t-2 border-muted/30' : 'border-b-2 border-muted/30')}>
      {occupied.slice(from, from + 6).map((busy, k) => {
        const i = from + k
        return (
          <div key={i} className="relative flex aspect-[0.62] items-center justify-center">
            <span className={clsx('absolute font-mono text-[9px] font-bold text-muted/70', top ? 'bottom-1' : 'top-1')}>{String(i + 1).padStart(2, '0')}</span>
            {busy && (
              <motion.div
                key={`car-${i}`}
                initial={{ y: top ? 40 : -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                className={clsx('h-[74%]', !top && 'rotate-180')}
              >
                <CarTop color={spotColor(i * 3)} className="h-full" />
              </motion.div>
            )}
          </div>
        )
      })}
    </div>
  )

  const free = occupied.filter((o) => !o).length
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-baseline justify-between text-sm">
        <span className="font-display font-semibold">1º andar</span>
        <span className="text-muted">
          {free} de {occupied.length} livres
        </span>
      </div>
      <div className="rounded-lg bg-surface-2 p-2.5">
        {row(0, true)}
        <div className="lane animate-lane my-1 h-8 rounded" />
        {row(6, false)}
      </div>
    </div>
  )
}

function Hero() {
  const { data } = useOverview()
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div>
          <p className="text-sm font-medium text-muted">
            {data ? (
              <>
                Agora: <strong className="text-success">{data.free}</strong> vagas livres de {data.total}
              </>
            ) : (
              '3 andares · 45 vagas'
            )}
          </p>
          <h1 className="mt-4 text-[44px] font-bold leading-[1.02] sm:text-6xl">Estacionar sem papelzinho.</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
            Você escolhe a vaga no mapa, o ticket fica no celular e paga na saída com Pix ou cartão. Quem administra vê o
            pátio inteiro pela tela, com faturamento e relatórios.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/cadastro" size="lg">
              Criar conta
            </ButtonLink>
            <ButtonLink to="/entrar" size="lg" variant="secondary">
              Entrar
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm text-muted">
            Só quer testar? A tela de login tem botões pra entrar direto como cliente ou como administrador.
          </p>
        </div>
        <FloorPreview />
      </div>
    </section>
  )
}

function Occupancy() {
  const { data } = useOverview()
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-2xl font-bold sm:text-3xl">Como está o pátio agora</h2>
      <p className="mt-2 text-muted">Atualiza sozinho quando alguém entra ou sai.</p>
      <div className="mt-8 divide-y divide-border rounded-xl border border-border bg-surface">
        {!data && [1, 2, 3].map((f) => <Skeleton key={f} className="m-5 h-10" />)}
        {data?.floors.map((f) => {
          const pct = f.total ? Math.round((f.occupied / f.total) * 100) : 0
          return (
            <div key={f.floor} className="grid grid-cols-1 items-center gap-3 px-5 py-4 sm:grid-cols-[110px_1fr_auto]">
              <div className="font-display text-lg font-semibold">{f.floor}º andar</div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div className={clsx('h-full rounded-full transition-[width] duration-700', pct > 85 ? 'bg-danger' : 'bg-brand')} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex gap-4 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <Car className="size-4" /> {f.car_total - f.car_occupied}
                </span>
                <span className="flex items-center gap-1.5">
                  <Bike className="size-4" /> {f.moto_total - f.moto_occupied}
                </span>
                <span className="w-20 text-right font-semibold text-fg num">
                  <AnimatedNumber value={f.free} /> livres
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function HowItWorks() {
  const customer = [
    ['Escolha a vaga', 'Informa a placa, abre o mapa do andar e toca numa vaga livre. Ou deixa o sistema escolher o andar mais vazio.'],
    ['Guarde o ticket', 'O ticket sai com QR Code e fica no painel, com o tempo e o valor correndo.'],
    ['Pague e saia', 'Pix (QR ou copia e cola) ou cartão. O comprovante em PDF fica salvo no histórico.'],
  ]
  const admin = [
    ['Mapa ao vivo', 'Todos os carros do pátio. Clicando em um, aparece o dono, o tempo e o valor, e dá pra registrar a saída.'],
    ['Números do dia', 'Faturamento, horários de pico, ocupação por andar e formas de pagamento.'],
    ['Controle', 'Tarifas editáveis, gestão de usuários, relatórios em CSV/PDF e log de tudo que acontece.'],
  ]
  const list = (title: string, items: string[][]) => (
    <div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <ol className="mt-4 space-y-5">
        {items.map(([t, text], i) => (
          <li key={t} className="grid grid-cols-[28px_1fr] gap-3">
            <span className="font-mono text-sm font-bold text-accent">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <div className="font-semibold">{t}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
  return (
    <section id="como-funciona" className="scroll-mt-16 border-y border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl">Como funciona</h2>
        <div className="mt-10 grid grid-cols-1 gap-12 md:grid-cols-2">
          {list('Pra quem estaciona', customer)}
          {list('Pra quem administra', admin)}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const { data } = useOverview()
  const prices = data?.prices
  const rows = [
    { label: 'Carro', icon: <Car className="size-4" />, p: prices?.carro },
    { label: 'Moto', icon: <Bike className="size-4" />, p: prices?.moto },
  ]
  return (
    <section id="precos" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 sm:px-6">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Preços</h2>
          <p className="mt-3 leading-relaxed text-muted">
            Os primeiros {prices?.grace_minutes ?? 15} minutos são de graça. Depois disso a cobrança é por hora iniciada
            (mínimo de 1 hora) e nunca passa da diária máxima.
          </p>
        </div>
        <table className="w-full self-start text-left">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr className="border-b border-border">
              <th className="py-3 font-medium">Veículo</th>
              <th className="py-3 text-right font-medium">Por hora</th>
              <th className="py-3 text-right font-medium">Diária máx.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border">
                <td className="py-4">
                  <span className="flex items-center gap-2 font-semibold">
                    {r.icon} {r.label}
                  </span>
                </td>
                <td className="py-4 text-right font-display text-2xl font-bold num">{r.p ? brl(r.p.hourly_cents) : <Skeleton className="ml-auto h-7 w-20" />}</td>
                <td className="py-4 text-right text-muted num">{r.p ? (r.p.daily_cap_cents ? brl(r.p.daily_cap_cents) : 'sem teto') : '…'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const OLD_MAP = ['O', 'L', 'O', 'O', 'L', 'O', 'L', 'O', 'L', 'O', 'O', 'L', 'L', 'O', 'L']

function Origin() {
  return (
    <section id="historia" className="scroll-mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold sm:text-3xl">De onde veio</h2>
          <div className="mt-4 space-y-4 leading-relaxed text-muted">
            <p>
              O ParkHub começou como um programa de terminal em Python, o <code className="font-mono text-sm text-fg">SistemaGaragem.py</code>.
              Tinha menu numerado, mapa de vagas com <code className="font-mono text-sm text-fg">[L]</code> e{' '}
              <code className="font-mono text-sm text-fg">[O]</code> e salvava tudo em arquivos .txt, inclusive as senhas.
            </p>
            <p>
              As regras continuam as mesmas: 3 andares com 15 vagas, tickets a partir do 1001, cobrança por hora para carro e
              moto. O que mudou foi o resto: interface web, senhas com hash, pagamento, relatórios e o mapa atualizando sozinho.
            </p>
          </div>
          <Link to="/entrar" className="mt-6 inline-flex items-center gap-1.5 font-semibold text-brand hover:underline">
            Ver funcionando <ArrowRight className="size-4" />
          </Link>
        </div>
        <pre className="min-w-0 overflow-x-auto rounded-xl bg-[#16171a] p-5 font-mono text-[12.5px] leading-relaxed text-[#d6d4cc]">
          <span className="text-[#8a8c93]">$ python SistemaGaragem.py</span>
          {'\n\n--- MAPA DA GARAGEM ---\n[L] = Livre | [O] = Ocupada\n\nAndar 1: '}
          {OLD_MAP.map((_, j) => ` ${String(j + 1).padStart(2)}   `).join('')}
          {'\nVagas:   '}
          {OLD_MAP.map((v) => ` [${v}]  `).join('')}
          {'\n\n--- MENU DO ADMINISTRADOR ---\n1. Ver Relatório Geral de Veículos\n2. Ver Faturamento Total\n3. Editar Valor por Hora\n4. Visualizar Ocupação da Garagem\n5. Buscar Veículo por Placa\n6. Deslogar\nEscolha uma opção: '}
          <span className="animate-pulse">_</span>
        </pre>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>ParkHub · {new Date().getFullYear()}</span>
        <div className="flex gap-5">
          <a href="/api/docs" target="_blank" rel="noreferrer" className="hover:text-fg">Documentação da API</a>
          <Link to="/entrar" className="hover:text-fg">Entrar</Link>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  useRealtime()
  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <Hero />
      <Occupancy />
      <HowItWorks />
      <Pricing />
      <Origin />
      <Footer />
    </div>
  )
}
