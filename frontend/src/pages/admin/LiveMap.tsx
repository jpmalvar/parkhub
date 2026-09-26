import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Bike, Car, Clock, LogOut, MapPin, MousePointerClick, Timer, UserRound, X } from 'lucide-react'
import { api } from '../../lib/api'
import { useOverview } from '../../lib/hooks'
import type { MapFloor, MapSpot } from '../../lib/types'
import { dateTime, kindLabel, relative } from '../../lib/format'
import { FloorTabs, GarageMap, MapLegend } from '../../components/GarageMap'
import { LiveClock, LiveCost } from '../../components/Live'
import { Plate } from '../../components/Plate'
import { ButtonLink, Card, CardHeader, IconButton, LiveDot, Page, PageHeader, Skeleton } from '../../components/ui'

export default function LiveMap() {
  const [params, setParams] = useSearchParams()
  const [floor, setFloor] = useState(Number(params.get('andar')) || 1)
  const [selectedId, setSelectedId] = useState<number | null>(Number(params.get('vaga')) || null)
  const { data } = useQuery({ queryKey: ['spots'], queryFn: () => api<{ floors: MapFloor[] }>('/spots') })
  const { data: overview } = useOverview()

  useEffect(() => {
    const vaga = Number(params.get('vaga'))
    const andar = Number(params.get('andar'))
    if (vaga) setSelectedId(vaga)
    if (andar) setFloor(andar)
  }, [params])

  const current = data?.floors.find((f) => f.floor === floor)
  const selected: MapSpot | undefined = useMemo(() => data?.floors.flatMap((f) => f.spots).find((s) => s.id === selectedId && s.occupied), [data, selectedId])
  const vehicles = (current?.spots.filter((s) => s.occupied && s.ticket) ?? []).sort((a, b) => (a.ticket!.entry_at < b.ticket!.entry_at ? -1 : 1))
  const totals = data?.floors.flatMap((f) => f.spots)
  const occupied = totals?.filter((s) => s.occupied).length ?? 0

  const select = (spot: MapSpot) => {
    setSelectedId(spot.id)
    setParams({ andar: String(spot.floor), vaga: String(spot.id) }, { replace: true })
  }
  const clear = () => {
    setSelectedId(null)
    setParams({ andar: String(floor) }, { replace: true })
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Operação"
        title="Mapa ao vivo"
        subtitle={
          <span className="inline-flex items-center gap-2">
            <LiveDot /> {occupied} veículos no pátio agora · atualização automática
          </span>
        }
      />
      {!data ? (
        <Skeleton className="h-[520px]" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="p-5">
            <FloorTabs floors={data.floors} value={floor} onChange={(f) => { setFloor(f); clear() }} />
            <div className="mt-4">{current && <GarageMap floor={current} mode="admin" selectedId={selected?.id ?? null} highlightId={selected ? null : selectedId} onSelect={select} />}</div>
            <div className="mt-4">
              <MapLegend showMine={false} />
            </div>
          </Card>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {selected?.ticket ? (
                <motion.div key={selected.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <Card className="overflow-hidden">
                    <div className="relative bg-brand-gradient p-5 text-white">
                      <IconButton label="Fechar" onClick={clear} className="absolute right-3 top-3 text-white/80 hover:bg-white/15 hover:text-white">
                        <X className="size-4" />
                      </IconButton>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
                        <MapPin className="size-3.5" /> Vaga {selected.code}
                      </div>
                      <div className="mt-3">
                        <Plate plate={selected.ticket.plate} size="md" />
                      </div>
                    </div>
                    <dl className="space-y-3.5 p-5 text-sm">
                      <div className="flex items-center gap-3">
                        <UserRound className="size-4 text-muted" />
                        <dt className="text-muted">Cliente</dt>
                        <dd className="ml-auto text-right font-medium">
                          {selected.ticket.user?.full_name}
                          <div className="text-xs text-muted">@{selected.ticket.user?.username}</div>
                        </dd>
                      </div>
                      <div className="flex items-center gap-3">
                        {selected.ticket.vehicle_kind === 'moto' ? <Bike className="size-4 text-muted" /> : <Car className="size-4 text-muted" />}
                        <dt className="text-muted">Veículo</dt>
                        <dd className="ml-auto font-medium">{kindLabel(selected.ticket.vehicle_kind)} · #{selected.ticket.code}</dd>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="size-4 text-muted" />
                        <dt className="text-muted">Entrada</dt>
                        <dd className="ml-auto font-medium">{dateTime(selected.ticket.entry_at)}</dd>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="rounded-xl bg-surface-2/70 p-3">
                          <div className="flex items-center gap-1 text-xs text-muted">
                            <Timer className="size-3.5" /> Tempo
                          </div>
                          <LiveClock entryAt={selected.ticket.entry_at} className="font-mono text-lg font-bold" />
                        </div>
                        <div className="rounded-xl bg-surface-2/70 p-3">
                          <div className="text-xs text-muted">Valor atual</div>
                          {overview && (
                            <LiveCost
                              entryAt={selected.ticket.entry_at}
                              tariff={{ ...overview.prices[selected.ticket.vehicle_kind], grace_minutes: overview.prices.grace_minutes }}
                              className="text-lg font-bold"
                            />
                          )}
                        </div>
                      </div>
                    </dl>
                    <div className="border-t border-border p-5">
                      <ButtonLink to={`/admin/pagar/${selected.ticket.code}`} className="w-full" icon={<LogOut className="size-4" />}>
                        Registrar saída
                      </ButtonLink>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Card className="p-6 text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                      <MousePointerClick className="size-6" />
                    </div>
                    <h3 className="mt-4 font-semibold">Selecione um veículo</h3>
                    <p className="mt-1 text-sm text-muted">Clique em uma vaga ocupada para ver os detalhes e registrar a saída.</p>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Card>
              <CardHeader title={`No ${floor}º andar`} subtitle={`${vehicles.length} veículo(s) · mais antigos primeiro`} icon={<Car className="size-4" />} />
              <div className="max-h-[360px] space-y-1 overflow-y-auto p-3">
                {vehicles.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Nenhum veículo neste andar.</p>}
                {vehicles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => select(s)}
                    className={
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ' +
                      (s.id === selected?.id ? 'bg-brand/10' : 'hover:bg-surface-2/60')
                    }
                  >
                    <Plate plate={s.ticket!.plate} size="xs" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.ticket!.user?.full_name}</div>
                      <div className="text-xs text-muted">
                        {s.code} · entrou {relative(s.ticket!.entry_at)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </Page>
  )
}
