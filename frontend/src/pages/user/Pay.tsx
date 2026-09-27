import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { ArrowLeft, Banknote, Check, Copy, CreditCard, Download, Gift, LayoutDashboard, Lock, QrCode, ShieldCheck, Timer } from 'lucide-react'
import { api, download, errorMessage, post } from '../../lib/api'
import type { Ticket } from '../../lib/types'
import { brl, clock, dateTime, duration, kindLabel, parseMoney } from '../../lib/format'
import { computeAmount } from '../../lib/pricing'
import { useMe } from '../../lib/hooks'
import { useElapsed } from '../../components/Live'
import { Plate } from '../../components/Plate'
import { CreditCardPreview, detectBrand, luhn } from '../../components/CreditCardPreview'
import { AnimatedCheck, GateSuccess } from '../../components/GateSuccess'
import { Confetti } from '../../components/Confetti'
import { Button, ButtonLink, Card, EmptyState, Field, Input, Page, PageHeader, Segmented, Skeleton, Spinner } from '../../components/ui'
import type { TicketDetail } from './TicketPage'

type Method = 'pix' | 'cartao' | 'dinheiro'
type PayResult = { ticket: Ticket; change_cents?: number }

function Processing({ label }: { label: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-xl bg-surface/95">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
        <div className="relative flex size-14 items-center justify-center rounded-full bg-brand/15">
          <Spinner className="size-7" />
        </div>
      </div>
      <div className="text-sm font-medium">{label}</div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ Pix */
function PixPanel({ code, onPaid, busy }: { code: string; onPaid: (txid: string) => void; busy: boolean }) {
  const pix = useQuery({ queryKey: ['pix', code], queryFn: () => api<{ txid: string; payload: string; amount_cents: number }>(`/tickets/${code}/pix`), staleTime: 5 * 60_000 })
  const [copied, setCopied] = useState(false)
  const [left, setLeft] = useState(600)
  useEffect(() => {
    const id = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000)
    return () => window.clearInterval(id)
  }, [])

  const copy = async () => {
    if (!pix.data) return
    try {
      await navigator.clipboard.writeText(pix.data.payload)
      setCopied(true)
      toast.success('Código Pix copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar automaticamente.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/5">
          {pix.data ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <QRCodeSVG value={pix.data.payload} size={176} level="M" fgColor="#0c1120" />
            </motion.div>
          ) : (
            <div className="flex size-[176px] items-center justify-center">
              <Spinner />
            </div>
          )}
          <motion.div
            className="pointer-events-none absolute inset-x-3 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent"
            animate={{ top: ['12px', '184px', '12px'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="flex-1 space-y-3 text-sm">
          <ol className="space-y-2 text-muted">
            <li>
              <strong className="text-fg">1.</strong> Abra o app do seu banco e escolha <strong className="text-fg">Pix → Ler QR Code</strong>.
            </li>
            <li>
              <strong className="text-fg">2.</strong> Escaneie o código ou use o <strong className="text-fg">Pix copia e cola</strong>.
            </li>
            <li>
              <strong className="text-fg">3.</strong> Confirme o pagamento e toque no botão abaixo.
            </li>
          </ol>
          <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
            <Timer className="size-3.5" /> Código válido por <strong className="num">{clock(left).slice(3)}</strong>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <input readOnly value={pix.data?.payload ?? 'Gerando código…'} className="h-10 min-w-0 flex-1 truncate rounded-xl border border-border bg-surface-2/60 px-3 font-mono text-xs text-muted" onFocus={(e) => e.target.select()} />
        <Button variant="secondary" onClick={copy} icon={copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}>
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <Button size="lg" className="w-full" disabled={!pix.data || busy || left === 0} onClick={() => pix.data && onPaid(pix.data.txid)} icon={<Check className="size-4" />}>
        Já paguei, confirmar
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ Cartão */
function CardPanel({ onPay, busy }: { onPay: (card: { number: string; holder: string; expiry: string; cvv: string }) => void; busy: boolean }) {
  const [card, setCard] = useState({ number: '', holder: '', expiry: '', cvv: '' })
  const [flipped, setFlipped] = useState(false)
  const [tried, setTried] = useState(false)
  const digits = card.number.replace(/\D/g, '')
  const brand = detectBrand(digits)

  const errors = {
    number: !luhn(digits) ? 'Número de cartão inválido.' : null,
    holder: card.holder.trim().length < 3 ? 'Informe o nome impresso no cartão.' : null,
    expiry: (() => {
      const m = card.expiry.match(/^(\d{2})\/(\d{2})$/)
      if (!m) return 'Use MM/AA.'
      const month = Number(m[1])
      const year = 2000 + Number(m[2])
      const now = new Date()
      if (month < 1 || month > 12) return 'Mês inválido.'
      if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return 'Cartão vencido.'
      return null
    })(),
    cvv: !/^\d{3,4}$/.test(card.cvv) ? 'CVV inválido.' : null,
  }
  const valid = !Object.values(errors).some(Boolean)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (valid) onPay(card)
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <CreditCardPreview number={card.number} holder={card.holder} expiry={card.expiry} cvv={card.cvv} flipped={flipped} />
      <Field label="Número do cartão" htmlFor="cc-number" error={tried ? errors.number : null}>
        <Input
          id="cc-number"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          className="font-mono tracking-wider"
          value={card.number}
          onChange={(e) => setCard({ ...card, number: e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ') })}
          trailing={brand ? <span className="mr-2 rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">{brand}</span> : undefined}
        />
      </Field>
      <Field label="Nome impresso no cartão" htmlFor="cc-name" error={tried ? errors.holder : null}>
        <Input id="cc-name" autoComplete="cc-name" placeholder="MARIA S SILVA" className="uppercase" value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value.toUpperCase().slice(0, 40) })} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Validade" htmlFor="cc-exp" error={tried ? errors.expiry : null}>
          <Input
            id="cc-exp"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            className="font-mono"
            value={card.expiry}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, '').slice(0, 4)
              setCard({ ...card, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d })
            }}
          />
        </Field>
        <Field label="CVV" htmlFor="cc-cvv" error={tried ? errors.cvv : null}>
          <Input
            id="cc-cvv"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            className="font-mono"
            value={card.cvv}
            onFocus={() => setFlipped(true)}
            onBlur={() => setFlipped(false)}
            onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
          />
        </Field>
      </div>
      <p className="text-xs text-muted">
        Para testar, use o cartão <button type="button" className="font-mono font-semibold text-brand hover:underline" onClick={() => setCard({ number: '4111 1111 1111 1111', holder: 'MARIA COSTA', expiry: '12/30', cvv: '123' })}>4111 1111 1111 1111</button>.
      </p>
      <Button type="submit" size="lg" className="w-full" disabled={busy} icon={<Lock className="size-4" />}>
        Pagar com cartão
      </Button>
    </form>
  )
}

/* ------------------------------------------------------------------ Dinheiro (operador) */
function CashPanel({ amount, onPay, busy }: { amount: number; onPay: (received: number) => void; busy: boolean }) {
  const [value, setValue] = useState('')
  const received = parseMoney(value) ?? 0
  const change = received - amount
  const quick = [amount, Math.ceil(amount / 1000) * 1000, Math.ceil(amount / 5000) * 5000, 10000].filter((v, i, arr) => v >= amount && arr.indexOf(v) === i)
  return (
    <div className="space-y-5">
      <Field label="Valor recebido" htmlFor="cash">
        <Input id="cash" inputMode="decimal" placeholder="0,00" icon={<Banknote />} value={value} onChange={(e) => setValue(e.target.value)} className="text-lg font-semibold" />
      </Field>
      <div className="flex flex-wrap gap-2">
        {quick.map((q) => (
          <button key={q} onClick={() => setValue((q / 100).toFixed(2).replace('.', ','))} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:border-brand/50 hover:bg-brand/5">
            {brl(q)}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl bg-surface-2/70 p-4">
        <span className="text-sm text-muted">Troco</span>
        <span className={change < 0 ? 'text-lg font-bold text-danger' : 'text-lg font-bold text-success'}>{change < 0 ? `Faltam ${brl(-change)}` : brl(change)}</span>
      </div>
      <Button size="lg" className="w-full" disabled={busy || change < 0 || !received} onClick={() => onPay(received)} icon={<Banknote className="size-4" />}>
        Registrar pagamento
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ Resumo */
function Summary({ detail }: { detail: TicketDetail }) {
  const { ticket, tariff } = detail
  const seconds = useElapsed(ticket.entry_at)
  const calc = computeAmount(seconds, tariff)
  const rows = [
    { label: 'Entrada', value: dateTime(ticket.entry_at) },
    { label: 'Permanência', value: duration(seconds / 60) },
    { label: 'Horas cobradas', value: calc.graceApplied ? 'Tolerância' : `${calc.hours}h × ${brl(tariff.hourly_cents)}` },
  ]
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border p-5">
        <Plate plate={ticket.plate} size="sm" />
        <div className="text-right text-sm">
          <div className="font-semibold">Vaga {ticket.spot.code}</div>
          <div className="text-xs text-muted">
            {kindLabel(ticket.vehicle_kind)} · ticket #{ticket.code}
          </div>
        </div>
      </div>
      <dl className="space-y-3 p-5 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4">
            <dt className="text-muted">{r.label}</dt>
            <dd className="font-medium num">{r.value}</dd>
          </div>
        ))}
        {calc.capApplied && (
          <div className="flex justify-between gap-4 text-success">
            <dt>Teto diário aplicado</dt>
            <dd className="font-medium num">− {brl(calc.gross - calc.amount)}</dd>
          </div>
        )}
      </dl>
      <div className="flex items-end justify-between border-t border-dashed border-border bg-surface-2/40 p-5">
        <span className="text-sm font-medium text-muted">Total a pagar</span>
        <motion.span key={calc.amount} initial={{ scale: 1.15, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-extrabold tracking-tight num">
          {brl(calc.amount)}
        </motion.span>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ página */
export default function Pay() {
  const { code = '' } = useParams()
  const { pathname } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  const base = isAdmin ? '/admin' : '/app'
  const { data: me } = useMe()
  const qc = useQueryClient()
  const [method, setMethod] = useState<Method>(isAdmin ? 'dinheiro' : 'pix')
  const [stage, setStage] = useState<string | null>(null)
  const [result, setResult] = useState<PayResult | null>(null)

  const detail = useQuery({ queryKey: ['ticket', code], queryFn: () => api<TicketDetail>(`/tickets/${code}`), enabled: !result })
  const pay = useMutation({
    mutationFn: (body: Record<string, unknown>) => post<PayResult>(`/tickets/${code}/pay`, body),
    onSuccess: (data) => {
      setResult(data)
      ;['tickets', 'spots', 'overview', 'me-summary', 'admin-stats', 'admin-tickets', 'ticket'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
    },
    onError: (err) => toast.error(errorMessage(err)),
    onSettled: () => setStage(null),
  })

  const run = (label: string, body: Record<string, unknown>, delay = 1400) => {
    setStage(label)
    window.setTimeout(() => pay.mutate(body), delay)
  }

  if (result) {
    const t = result.ticket
    return (
      <Page className="relative mx-auto max-w-lg py-6 text-center">
        <Confetti />
        <AnimatedCheck className="mx-auto size-16 text-success" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{t.payment_method === 'isento' ? 'Saída liberada sem custo!' : 'Pagamento aprovado!'}</h1>
        <p className="mt-2 text-sm text-muted">A cancela foi liberada. {isAdmin ? 'Registro concluído.' : 'Obrigado pela preferência, volte sempre!'}</p>
        <div className="my-8">
          <GateSuccess />
        </div>
        <Card className="p-5 text-left">
          <div className="flex items-center justify-between">
            <Plate plate={t.plate} size="sm" />
            <span className="text-3xl font-extrabold">{brl(t.amount_cents)}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted">Permanência</div>
              <div className="font-semibold">{duration(t.duration_minutes ?? 0)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Pagamento</div>
              <div className="truncate font-semibold">{t.payment_detail}</div>
            </div>
            {result.change_cents !== undefined && result.change_cents > 0 && (
              <div className="col-span-2 rounded-xl bg-success/10 p-3 text-success">
                Troco a devolver: <strong>{brl(result.change_cents)}</strong>
              </div>
            )}
          </div>
        </Card>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => download(`/tickets/${t.code}/receipt.pdf`)}>
            Comprovante PDF
          </Button>
          <ButtonLink to={isAdmin ? '/admin/mapa' : '/app'} icon={<LayoutDashboard className="size-4" />}>
            {isAdmin ? 'Voltar ao mapa' : 'Voltar ao painel'}
          </ButtonLink>
        </div>
      </Page>
    )
  }

  if (detail.isError) {
    return (
      <Card>
        <EmptyState icon={<QrCode />} title="Ticket não encontrado" description="Ele pode já ter sido pago ou não pertence à sua conta." action={<ButtonLink to={base}>Voltar</ButtonLink>} />
      </Card>
    )
  }
  if (!detail.data) return <Skeleton className="h-[560px]" />
  if (detail.data.ticket.status !== 'active') {
    return (
      <Card>
        <EmptyState icon={<Check />} title="Este ticket já foi pago" description="A saída deste veículo já foi registrada." action={<ButtonLink to={isAdmin ? '/admin/relatorios' : `/app/ticket/${code}`}>Ver detalhes</ButtonLink>} />
      </Card>
    )
  }

  const liveAmount = computeAmount((Date.now() - new Date(detail.data.ticket.entry_at).getTime()) / 1000, detail.data.tariff).amount
  const busy = !!stage || pay.isPending
  const methods = [
    { value: 'pix' as const, label: 'Pix', icon: <QrCode /> },
    { value: 'cartao' as const, label: 'Cartão', icon: <CreditCard /> },
    ...(isAdmin ? [{ value: 'dinheiro' as const, label: 'Dinheiro', icon: <Banknote /> }] : []),
  ]

  return (
    <Page>
      <PageHeader
        eyebrow="Pagamento"
        title="Pagar e liberar saída"
        subtitle={isAdmin && me ? `Registrando saída como operador (@${me.username}).` : 'O valor é calculado no momento da confirmação.'}
        actions={
          <ButtonLink to={isAdmin ? '/admin/mapa' : `/app/ticket/${code}`} variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />}>
            Voltar
          </ButtonLink>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-4">
          <Summary detail={detail.data} />
          <div className="flex items-center gap-2.5 rounded-xl border border-border px-4 py-3 text-xs text-muted">
            <ShieldCheck className="size-4 text-success" />
            Ambiente seguro · pagamento simulado para demonstração · nenhum dado de cartão é armazenado.
          </div>
        </div>

        <Card className="relative p-6">
          <AnimatePresence>{stage && <Processing label={stage} />}</AnimatePresence>
          {liveAmount === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-xl bg-success/15 text-success">
                <Gift className="size-8" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">Saída gratuita!</h3>
              <p className="mt-1 max-w-xs text-sm text-muted">Você está dentro da tolerância de {detail.data.tariff.grace_minutes} minutos. Nada a pagar.</p>
              <Button size="lg" className="mt-6" variant="success" onClick={() => run('Liberando a cancela…', { method: 'pix' }, 700)} disabled={busy}>
                Liberar saída
              </Button>
            </div>
          ) : (
            <>
              <Segmented className="mb-6 w-full" value={method} onChange={setMethod} options={methods} />
              <AnimatePresence mode="wait">
                <motion.div key={method} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  {method === 'pix' && <PixPanel code={code} busy={busy} onPaid={(txid) => run('Aguardando confirmação do banco…', { method: 'pix', pix_txid: txid }, 1800)} />}
                  {method === 'cartao' && <CardPanel busy={busy} onPay={(card) => run('Processando pagamento com a operadora…', { method: 'cartao', card })} />}
                  {method === 'dinheiro' && <CashPanel amount={liveAmount} busy={busy} onPay={(received) => run('Registrando pagamento…', { method: 'dinheiro', cash_received_cents: received }, 600)} />}
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </Card>
      </div>
    </Page>
  )
}
