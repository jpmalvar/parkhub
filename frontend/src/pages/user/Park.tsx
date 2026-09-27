import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Bike, Car, Check, CircleCheckBig, LayoutDashboard, MapPin, Plus, Info, Ticket as TicketIcon, Wand2 } from 'lucide-react'
import clsx from 'clsx'
import { ApiError, api, errorMessage, post } from '../../lib/api'
import type { MapFloor, MapSpot, Tariff, Ticket, Vehicle, VehicleKind } from '../../lib/types'
import { brl, cleanPlate, displayPlate, isValidPlate, kindLabel } from '../../lib/format'
import { useOverview } from '../../lib/hooks'
import { FloorTabs, GarageMap, MapLegend } from '../../components/GarageMap'
import { Plate } from '../../components/Plate'
import { TicketStub } from '../../components/TicketStub'
import { Confetti } from '../../components/Confetti'
import { Badge, Button, ButtonLink, Card, Field, Input, Page, PageHeader, Segmented, Skeleton } from '../../components/ui'
import { useMyTickets } from './Dashboard'

const STEPS = ['Veículo', 'Vaga', 'Confirmação']

function Stepper({ step }: { step: number }) {
  return (
    <div className="mb-8 flex items-center">
      {STEPS.map((label, i) => (
        <div key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: i === step ? 1.08 : 1 }}
              className={clsx(
                'flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors duration-300',
                i < step && 'border-brand bg-brand text-white',
                i === step && 'border-brand bg-brand/10 text-brand shadow-[0_0_0_6px_color-mix(in_oklab,var(--brand)_12%,transparent)]',
                i > step && 'border-border text-muted',
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </motion.div>
            <span className={clsx('hidden text-sm font-semibold sm:block', i <= step ? 'text-fg' : 'text-muted')}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="mx-4 h-0.5 flex-1 overflow-hidden rounded-full bg-border">
              <motion.div className="h-full bg-brand" initial={false} animate={{ width: i < step ? '100%' : '0%' }} transition={{ duration: 0.5 }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const slide = {
  initial: (dir: number) => ({ opacity: 0, x: dir * 40 }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -40 }),
}

export default function Park() {
  const [params] = useSearchParams()
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [plate, setPlate] = useState(cleanPlate(params.get('placa') ?? ''))
  const [kind, setKind] = useState<VehicleKind>((params.get('tipo') as VehicleKind) === 'moto' ? 'moto' : 'carro')
  const [selectedVehicle, setSelectedVehicle] = useState<number | 'new' | null>(null)
  const [saveVehicle, setSaveVehicle] = useState(true)
  const [nickname, setNickname] = useState('')
  const [floor, setFloor] = useState(1)
  const [spot, setSpot] = useState<MapSpot | null>(null)
  const [ticket, setTicket] = useState<{ ticket: Ticket; tariff: Tariff } | null>(null)

  const vehicles = useQuery({ queryKey: ['vehicles'], queryFn: () => api<{ items: Vehicle[] }>('/vehicles') })
  const myTickets = useMyTickets()
  const parkedPlates = useMemo(() => new Set(myTickets.data?.items.filter((t) => t.status === 'active').map((t) => t.plate) ?? []), [myTickets.data])
  const spots = useQuery({ queryKey: ['spots'], queryFn: () => api<{ floors: MapFloor[] }>('/spots') })
  const { data: overview } = useOverview()

  // Pré-seleciona o veículo vindo da URL ou o primeiro salvo
  useEffect(() => {
    if (!vehicles.data || !myTickets.data || selectedVehicle !== null) return
    const available = vehicles.data.items.filter((v) => !parkedPlates.has(v.plate))
    const fromUrl = available.find((v) => v.plate === plate)
    if (fromUrl) {
      setSelectedVehicle(fromUrl.id)
      setKind(fromUrl.kind)
    } else if (plate && !parkedPlates.has(plate)) setSelectedVehicle('new')
    else if (available.length) {
      const v = available[0]
      setSelectedVehicle(v.id)
      setPlate(v.plate)
      setKind(v.kind)
    } else {
      setSelectedVehicle('new')
      setPlate('')
    }
  }, [vehicles.data, myTickets.data, parkedPlates, selectedVehicle, plate])

  // Se a vaga escolhida for ocupada por outra pessoa em tempo real, avisa e limpa a seleção
  useEffect(() => {
    if (!spot || !spots.data || ticket) return
    const current = spots.data.floors.flatMap((f) => f.spots).find((s) => s.id === spot.id)
    if (current?.occupied) {
      toast.warning(`A vaga ${spot.code} acabou de ser ocupada. Escolha outra.`)
      setSpot(null)
      if (step === 2) go(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots.data])

  const go = (next: number) => {
    setDir(next > step ? 1 : -1)
    setStep(next)
  }

  const plateValid = isValidPlate(plate)
  const isSaved = vehicles.data?.items.some((v) => v.plate === plate)
  const currentFloor = spots.data?.floors.find((f) => f.floor === floor)
  const tariff = overview?.prices[kind]

  const autoPick = () => {
    if (!spots.data) return
    const best = [...spots.data.floors]
      .map((f) => ({ f, free: f.spots.filter((s) => s.kind === kind && !s.occupied) }))
      .sort((a, b) => b.free.length - a.free.length)[0]
    if (!best?.free.length) {
      toast.error('Não há vagas livres para este tipo de veículo no momento.')
      return
    }
    setFloor(best.f.floor)
    setSpot(best.free[0])
    toast.success(`Separamos a vaga ${best.free[0].code} pra você, no andar mais vazio.`)
  }

  const noSpotsForKind = useMemo(
    () => spots.data && !spots.data.floors.some((f) => f.spots.some((s) => s.kind === kind && !s.occupied)),
    [spots.data, kind],
  )

  const create = useMutation({
    mutationFn: () =>
      post<{ ticket: Ticket; tariff: Tariff }>('/tickets', {
        spot_id: spot!.id,
        plate,
        vehicle_kind: kind,
        save_vehicle: selectedVehicle === 'new' && saveVehicle && !isSaved,
        nickname: nickname || null,
      }),
    onSuccess: (data) => {
      setTicket(data)
      qc.invalidateQueries({ queryKey: ['tickets'] })
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['spots'] })
      qc.invalidateQueries({ queryKey: ['me-summary'] })
      toast.success(`Ticket #${data.ticket.code} gerado! Boa estadia.`)
    },
    onError: (err) => {
      toast.error(errorMessage(err))
      if (err instanceof ApiError && err.status === 409 && err.message.includes('vaga')) {
        setSpot(null)
        qc.invalidateQueries({ queryKey: ['spots'] })
        go(1)
      }
    },
  })

  if (ticket) {
    return (
      <Page className="relative mx-auto max-w-lg py-4 text-center">
        <Confetti />
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-success/15 text-success">
          <CircleCheckBig className="size-8" />
        </motion.div>
        <h1 className="text-2xl font-bold tracking-tight">Veículo estacionado!</h1>
        <p className="mt-2 text-sm text-muted">Não precisa anotar nada, o ticket fica salvo no seu painel.</p>
        <div className="mt-8">
          <TicketStub ticket={ticket.ticket} />
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to={`/app/ticket/${ticket.ticket.code}`} icon={<TicketIcon className="size-4" />}>
            Acompanhar ticket
          </ButtonLink>
          <ButtonLink to="/app" variant="secondary" icon={<LayoutDashboard className="size-4" />}>
            Ir para o painel
          </ButtonLink>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader eyebrow="Novo ticket" title="Estacionar veículo" subtitle="Informe o veículo, escolha a vaga no mapa e receba seu ticket digital." />
      <Stepper step={step} />

      <AnimatePresence mode="wait" custom={dir}>
        {step === 0 && (
          <motion.div key="s0" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <Card className="p-6">
                <h2 className="font-semibold">Qual veículo você vai estacionar?</h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {vehicles.isLoading && <Skeleton className="h-20" />}
                  {vehicles.data?.items.map((v) => {
                    const parked = parkedPlates.has(v.plate)
                    return (
                    <button
                      key={v.id}
                      disabled={parked}
                      title={parked ? 'Este veículo já está estacionado' : undefined}
                      onClick={() => {
                        setSelectedVehicle(v.id)
                        setPlate(v.plate)
                        setKind(v.kind)
                      }}
                      className={clsx(
                        'relative flex items-center gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                        selectedVehicle === v.id ? 'border-brand bg-brand/8 shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand)_12%,transparent)]' : 'border-border hover:border-brand/40',
                      )}
                    >
                      <div className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-muted">{v.kind === 'moto' ? <Bike className="size-5" /> : <Car className="size-5" />}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{v.nickname ?? kindLabel(v.kind)}</div>
                        <div className="mt-1">
                          <Plate plate={v.plate} size="xs" />
                        </div>
                      </div>
                      {parked && <Badge tone="success">No pátio</Badge>}
                      {selectedVehicle === v.id && (
                        <motion.span layoutId="veh-check" className="flex size-6 items-center justify-center rounded-full bg-brand text-white">
                          <Check className="size-3.5" />
                        </motion.span>
                      )}
                    </button>
                    )
                  })}
                  <button
                    onClick={() => {
                      setSelectedVehicle('new')
                      setPlate('')
                    }}
                    className={clsx(
                      'flex items-center gap-3 rounded-xl border border-dashed p-4 text-left transition',
                      selectedVehicle === 'new' ? 'border-brand bg-brand/8' : 'border-border hover:border-brand/40',
                    )}
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Plus className="size-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Outro veículo</div>
                      <div className="text-xs text-muted">Digitar uma nova placa</div>
                    </div>
                  </button>
                </div>

                <AnimatePresence>
                  {selectedVehicle === 'new' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-6 space-y-4 border-t border-border pt-6">
                        <Field
                          label="Placa do veículo"
                          htmlFor="plate"
                          error={plate.length >= 7 && !plateValid ? 'Placa inválida. Use ABC-1234 ou BRA2E19.' : null}
                          hint="Aceitamos o padrão antigo (ABC-1234) e o Mercosul (BRA2E19)."
                        >
                          <Input
                            id="plate"
                            autoFocus
                            value={displayPlate(plate)}
                            onChange={(e) => setPlate(cleanPlate(e.target.value))}
                            placeholder="BRA2E19"
                            className="font-mono text-lg font-bold uppercase tracking-widest"
                            maxLength={8}
                          />
                        </Field>
                        <Field label="Tipo de veículo">
                          <Segmented
                            className="w-full"
                            value={kind}
                            onChange={(k) => {
                              setKind(k)
                              setSpot(null)
                            }}
                            options={[
                              { value: 'carro', label: 'Carro', icon: <Car /> },
                              { value: 'moto', label: 'Moto', icon: <Bike /> },
                            ]}
                          />
                        </Field>
                        {!isSaved && (
                          <div className="rounded-xl bg-surface-2/60 p-3.5">
                            <label className="flex cursor-pointer items-center gap-3 text-sm">
                              <input type="checkbox" checked={saveVehicle} onChange={(e) => setSaveVehicle(e.target.checked)} className="size-4 accent-[var(--brand)]" />
                              Salvar este veículo na minha conta
                            </label>
                            {saveVehicle && (
                              <Input className="mt-3 h-10" placeholder="Apelido (opcional), ex.: Carro do trabalho" value={nickname} maxLength={30} onChange={(e) => setNickname(e.target.value)} />
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              <Card className="flex flex-col items-center justify-center gap-6 p-8 text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted">Pré-visualização</div>
                <motion.div key={plate.length >= 7 ? plate : 'empty'} initial={{ rotateX: 90, opacity: 0 }} animate={{ rotateX: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }}>
                  <Plate plate={plate} size="lg" placeholder={!plate} />
                </motion.div>
                <div className="flex items-center gap-2 text-sm text-muted">
                  {kind === 'moto' ? <Bike className="size-4" /> : <Car className="size-4" />}
                  {kindLabel(kind)}
                  {plateValid && (
                    <span className="flex items-center gap-1 text-success">
                      · <Check className="size-4" /> placa válida
                    </span>
                  )}
                </div>
                <Button size="lg" className="w-full" disabled={!plateValid || parkedPlates.has(plate)} onClick={() => go(1)}>
                  Escolher vaga <ArrowRight className="size-4" />
                </Button>
              </Card>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="s1" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }}>
            <Card className="p-5 sm:p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">Escolha a vaga</h2>
                  <p className="text-sm text-muted">
                    Mostrando vagas compatíveis com <strong className="text-fg">{kind === 'moto' ? 'motos' : 'carros'}</strong>. Toque em uma vaga livre.
                  </p>
                </div>
                <Button variant="outline" size="sm" icon={<Wand2 className="size-4" />} onClick={autoPick}>
                  Escolher para mim
                </Button>
              </div>
              {spots.data ? (
                <>
                  <FloorTabs floors={spots.data.floors} value={floor} onChange={setFloor} kind={kind} />
                  <div className="mt-4">{currentFloor && <GarageMap floor={currentFloor} mode="select" allowKind={kind} selectedId={spot?.id} onSelect={setSpot} />}</div>
                  <div className="mt-4">
                    <MapLegend />
                  </div>
                  {noSpotsForKind && <p className="mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">Todas as vagas para {kind === 'moto' ? 'motos' : 'carros'} estão ocupadas no momento.</p>}
                </>
              ) : (
                <Skeleton className="h-80" />
              )}
            </Card>
            <div className="sticky bottom-4 z-10 mt-5">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2.5 shadow-lg sm:gap-4 sm:p-3 sm:pl-5">
                <Button variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} onClick={() => go(0)} aria-label="Voltar">
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
                <div className="min-w-0 flex-1 text-sm">
                  {spot ? (
                    <span className="flex items-center gap-1.5 whitespace-nowrap sm:gap-2">
                      <MapPin className="size-4 shrink-0 text-brand" /> Vaga <strong>{spot.code}</strong>
                      <span className="hidden sm:inline">· {spot.floor}º andar</span>
                    </span>
                  ) : (
                    <span className="text-muted">Toque numa vaga livre</span>
                  )}
                </div>
                <Button disabled={!spot} onClick={() => go(2)}>
                  Continuar <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && spot && (
          <motion.div key="s2" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} className="mx-auto max-w-2xl">
            <Card className="overflow-hidden">
              <div className="bg-brand p-6 text-white">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/70">Resumo</div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                  <Plate plate={plate} size="md" />
                  <div className="text-right">
                    <div className="text-xs text-white/70">Vaga</div>
                    <div className="text-3xl font-extrabold">{spot.code}</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
                {[
                  { label: 'Veículo', value: kindLabel(kind) },
                  { label: 'Andar', value: `${spot.floor}º andar` },
                  { label: 'Entrada', value: 'Agora' },
                ].map((i) => (
                  <div key={i.label} className="bg-surface p-4">
                    <div className="text-xs text-muted">{i.label}</div>
                    <div className="font-semibold">{i.value}</div>
                  </div>
                ))}
              </div>
              {tariff && overview && (
                <div className="space-y-2 p-6 text-sm">
                  <div className="flex items-center gap-2 font-semibold">
                    <Info className="size-4 text-brand" /> Como será a cobrança
                  </div>
                  <ul className="space-y-1.5 text-muted">
                    <li>
                      • <strong className="text-fg">{overview.prices.grace_minutes} minutos grátis</strong> de tolerância
                    </li>
                    <li>
                      • <strong className="text-fg">{brl(tariff.hourly_cents)}</strong> por hora iniciada
                    </li>
                    {tariff.daily_cap_cents > 0 && (
                      <li>
                        • Nunca mais que <strong className="text-fg">{brl(tariff.daily_cap_cents)}</strong> a cada 24h
                      </li>
                    )}
                  </ul>
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:gap-3 sm:p-5">
                <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => go(1)}>
                  Trocar vaga
                </Button>
                <Button className="w-full sm:w-auto sm:flex-1" size="lg" loading={create.isPending} onClick={() => create.mutate()} icon={<TicketIcon className="size-4" />}>
                  Confirmar e gerar ticket
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  )
}
