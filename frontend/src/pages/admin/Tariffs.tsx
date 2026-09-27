import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Bike, Calculator, Car, Clock, Save, SlidersHorizontal } from 'lucide-react'
import { api, errorMessage, put } from '../../lib/api'
import type { Settings } from '../../lib/types'
import { brl, centsToInput, parseMoney } from '../../lib/format'
import { computeAmount } from '../../lib/pricing'
import { CHART, ChartTooltip, axisProps } from '../../components/charts'
import { Button, Card, CardHeader, Field, Input, Page, PageHeader, Segmented, Skeleton } from '../../components/ui'

type Form = Record<keyof Settings, string>

const toForm = (s: Settings): Form => ({
  hourly_car_cents: centsToInput(s.hourly_car_cents),
  hourly_moto_cents: centsToInput(s.hourly_moto_cents),
  daily_cap_car_cents: centsToInput(s.daily_cap_car_cents),
  daily_cap_moto_cents: centsToInput(s.daily_cap_moto_cents),
  grace_minutes: String(s.grace_minutes),
})

const fromForm = (f: Form): Settings | null => {
  const values = {
    hourly_car_cents: parseMoney(f.hourly_car_cents),
    hourly_moto_cents: parseMoney(f.hourly_moto_cents),
    daily_cap_car_cents: parseMoney(f.daily_cap_car_cents),
    daily_cap_moto_cents: parseMoney(f.daily_cap_moto_cents),
    grace_minutes: Number(f.grace_minutes),
  }
  return Object.values(values).some((v) => v === null || Number.isNaN(v)) ? null : (values as Settings)
}

export default function Tariffs() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['settings'], queryFn: () => api<Settings>('/admin/settings') })
  const [form, setForm] = useState<Form | null>(null)
  const [simHours, setSimHours] = useState(3.5)
  const [simKind, setSimKind] = useState<'carro' | 'moto'>('carro')

  useEffect(() => {
    if (data && !form) setForm(toForm(data))
  }, [data, form])

  const parsed = form ? fromForm(form) : null
  const dirty = !!(parsed && data && JSON.stringify(parsed) !== JSON.stringify({ ...data }))

  const save = useMutation({
    mutationFn: (s: Settings) => put<Settings>('/admin/settings', s),
    onSuccess: (s) => {
      qc.setQueryData(['settings'], s)
      setForm(toForm(s))
      toast.success('Tarifas atualizadas! Os clientes já veem os novos valores.')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const curve = useMemo(() => {
    if (!parsed) return []
    return Array.from({ length: 31 }, (_, h) => ({
      hour: h,
      carro: computeAmount(h * 3600 - 1 + (h === 0 ? 1 : 0), { hourly_cents: parsed.hourly_car_cents, daily_cap_cents: parsed.daily_cap_car_cents, grace_minutes: parsed.grace_minutes }).amount,
      moto: computeAmount(h * 3600 - 1 + (h === 0 ? 1 : 0), { hourly_cents: parsed.hourly_moto_cents, daily_cap_cents: parsed.daily_cap_moto_cents, grace_minutes: parsed.grace_minutes }).amount,
    }))
  }, [parsed])

  if (!form || !data) return <Skeleton className="h-[600px]" />

  const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value })
  const sim = parsed
    ? computeAmount(simHours * 3600, {
        hourly_cents: simKind === 'carro' ? parsed.hourly_car_cents : parsed.hourly_moto_cents,
        daily_cap_cents: simKind === 'carro' ? parsed.daily_cap_car_cents : parsed.daily_cap_moto_cents,
        grace_minutes: parsed.grace_minutes,
      })
    : null
  const simLabel = simHours < 1 ? `${Math.round(simHours * 60)} min` : `${Math.floor(simHours)}h${simHours % 1 ? ` ${Math.round((simHours % 1) * 60)}min` : ''}`

  return (
    <Page>
      <PageHeader
        eyebrow="Configurações"
        title="Tarifas e regras de cobrança"
        subtitle="As alterações valem imediatamente para todos os tickets e são registradas na auditoria."
        actions={
          <Button icon={<Save className="size-4" />} disabled={!dirty || !parsed} loading={save.isPending} onClick={() => parsed && save.mutate(parsed)}>
            Salvar alterações
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-6">
          {(['carro', 'moto'] as const).map((kind) => (
            <Card key={kind}>
              <CardHeader title={kind === 'carro' ? 'Carros' : 'Motos'} subtitle="Valores cobrados por veículo" icon={kind === 'carro' ? <Car className="size-4" /> : <Bike className="size-4" />} />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Valor por hora (R$)" htmlFor={`${kind}-h`}>
                  <Input id={`${kind}-h`} inputMode="decimal" value={form[kind === 'carro' ? 'hourly_car_cents' : 'hourly_moto_cents']} onChange={set(kind === 'carro' ? 'hourly_car_cents' : 'hourly_moto_cents')} />
                </Field>
                <Field label="Diária máxima (R$)" htmlFor={`${kind}-d`} hint="0 = sem teto">
                  <Input id={`${kind}-d`} inputMode="decimal" value={form[kind === 'carro' ? 'daily_cap_car_cents' : 'daily_cap_moto_cents']} onChange={set(kind === 'carro' ? 'daily_cap_car_cents' : 'daily_cap_moto_cents')} />
                </Field>
              </div>
            </Card>
          ))}
          <Card>
            <CardHeader title="Tolerância" subtitle="Permanências curtas não são cobradas" icon={<Clock className="size-4" />} />
            <div className="p-5">
              <div className="flex items-center gap-4">
                <input type="range" min={0} max={60} step={5} value={form.grace_minutes} onChange={set('grace_minutes')} className="flex-1 accent-[var(--brand)]" />
                <span className="w-20 rounded-xl bg-surface-2 px-3 py-2 text-center font-bold num">{form.grace_minutes} min</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Simulador de cobrança" subtitle="Teste os valores antes de salvar" icon={<Calculator className="size-4" />} />
            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-center gap-4">
                <Segmented
                  value={simKind}
                  onChange={setSimKind}
                  options={[
                    { value: 'carro', label: 'Carro', icon: <Car /> },
                    { value: 'moto', label: 'Moto', icon: <Bike /> },
                  ]}
                />
                <span className="text-sm text-muted">
                  Permanência de <strong className="text-fg">{simLabel}</strong>
                </span>
              </div>
              <input type="range" min={0.1} max={48} step={0.25} value={simHours} onChange={(e) => setSimHours(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
              {sim && (
                <div className="flex items-end justify-between rounded-xl bg-brand p-5 text-white">
                  <div className="text-sm text-white/80">
                    {sim.graceApplied ? 'Dentro da tolerância' : `${sim.hours}h cobradas`}
                    {sim.capApplied && <div className="font-semibold text-white">Teto diário aplicado (economia de {brl(sim.gross - sim.amount)})</div>}
                  </div>
                  <motion.div key={sim.amount} initial={{ scale: 1.2, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-extrabold">
                    {brl(sim.amount)}
                  </motion.div>
                </div>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Curva de preço" subtitle="Valor total cobrado conforme a permanência (até 30h)" icon={<SlidersHorizontal className="size-4" />} />
            <div className="h-72 px-2 pb-3 pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curve} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART.muted} strokeOpacity={0.12} />
                  <XAxis dataKey="hour" {...axisProps} tickFormatter={(h) => `${h}h`} interval={4} />
                  <YAxis {...axisProps} width={64} tickFormatter={(v) => brl(v).replace(',00', '')} />
                  <Tooltip content={<ChartTooltip format={(v) => brl(v)} labelFormat={(l) => `${l} hora(s)`} />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Line type="stepAfter" dataKey="carro" name="Carro" stroke={CHART.brand} strokeWidth={2.5} dot={false} animationDuration={900} />
                  <Line type="stepAfter" dataKey="moto" name="Moto" stroke={CHART.warning} strokeWidth={2.5} dot={false} animationDuration={900} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  )
}
