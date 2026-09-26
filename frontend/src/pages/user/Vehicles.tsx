import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Bike, Car, Plus, SquareParking, Trash } from 'lucide-react'
import { api, del, errorMessage, post } from '../../lib/api'
import type { Vehicle, VehicleKind } from '../../lib/types'
import { cleanPlate, dateOnly, displayPlate, isValidPlate, kindLabel } from '../../lib/format'
import { Plate } from '../../components/Plate'
import { Button, ButtonLink, Card, ConfirmModal, EmptyState, Field, IconButton, Input, Modal, Page, PageHeader, Segmented, Skeleton } from '../../components/ui'

function AddVehicleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [plate, setPlate] = useState('')
  const [kind, setKind] = useState<VehicleKind>('carro')
  const [nickname, setNickname] = useState('')
  const valid = isValidPlate(plate)

  const add = useMutation({
    mutationFn: () => post<{ vehicle: Vehicle }>('/vehicles', { plate, kind, nickname }),
    onSuccess: () => {
      toast.success('Veículo salvo!')
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      setPlate('')
      setNickname('')
      onClose()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Adicionar veículo" description="Salve seus veículos para estacionar com um toque.">
      <div className="mb-6 flex justify-center rounded-2xl bg-surface-2/60 py-6">
        <Plate plate={plate} size="lg" placeholder={!plate} />
      </div>
      <div className="space-y-4">
        <Field label="Placa" htmlFor="v-plate" error={plate.length >= 7 && !valid ? 'Placa inválida.' : null}>
          <Input id="v-plate" autoFocus className="font-mono text-lg font-bold uppercase tracking-widest" placeholder="BRA2E19" value={displayPlate(plate)} onChange={(e) => setPlate(cleanPlate(e.target.value))} />
        </Field>
        <Field label="Tipo">
          <Segmented
            className="w-full"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'carro', label: 'Carro', icon: <Car /> },
              { value: 'moto', label: 'Moto', icon: <Bike /> },
            ]}
          />
        </Field>
        <Field label="Apelido (opcional)" htmlFor="v-nick">
          <Input id="v-nick" maxLength={30} placeholder="Ex.: Carro do trabalho" value={nickname} onChange={(e) => setNickname(e.target.value)} />
        </Field>
        <Button className="w-full" size="lg" disabled={!valid} loading={add.isPending} onClick={() => add.mutate()}>
          Salvar veículo
        </Button>
      </div>
    </Modal>
  )
}

export default function Vehicles() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<Vehicle | null>(null)
  const { data, isLoading } = useQuery({ queryKey: ['vehicles'], queryFn: () => api<{ items: Vehicle[] }>('/vehicles') })

  const remove = useMutation({
    mutationFn: (id: number) => del(`/vehicles/${id}`),
    onSuccess: () => {
      toast.success('Veículo removido.')
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      setRemoving(null)
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <Page>
      <PageHeader
        eyebrow="Garagem pessoal"
        title="Meus veículos"
        subtitle="Veículos salvos aparecem prontos para seleção na hora de estacionar."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
            Adicionar veículo
          </Button>
        }
      />
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <Card>
          <EmptyState icon={<Car />} title="Nenhum veículo salvo" description="Adicione seus veículos para agilizar a entrada no estacionamento." action={<Button onClick={() => setAdding(true)}>Adicionar veículo</Button>} />
        </Card>
      ) : (
        <motion.div layout className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {data.items.map((v, i) => (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.05 } }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="card group relative overflow-hidden p-6"
              >
                <div className="absolute -right-10 -top-10 size-36 rounded-full bg-brand/10 blur-3xl transition group-hover:bg-brand/20" />
                <div className="relative flex items-start justify-between">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">{v.kind === 'moto' ? <Bike className="size-5" /> : <Car className="size-5" />}</div>
                  <IconButton label="Remover veículo" onClick={() => setRemoving(v)} className="opacity-60 hover:text-danger group-hover:opacity-100">
                    <Trash className="size-4" />
                  </IconButton>
                </div>
                <div className="relative mt-5">
                  <div className="font-semibold">{v.nickname ?? kindLabel(v.kind)}</div>
                  <div className="text-xs text-muted">
                    {kindLabel(v.kind)} · placa {v.plate_format} · desde {dateOnly(v.created_at)}
                  </div>
                </div>
                <div className="relative mt-5 flex items-center justify-between gap-3">
                  <motion.div whileHover={{ rotate: -2, scale: 1.04 }}>
                    <Plate plate={v.plate} size="md" />
                  </motion.div>
                  <ButtonLink to={`/app/estacionar?placa=${v.plate}&tipo=${v.kind}`} size="sm" variant="secondary" icon={<SquareParking className="size-4" />}>
                    Estacionar
                  </ButtonLink>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AddVehicleModal open={adding} onClose={() => setAdding(false)} />
      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id)}
        loading={remove.isPending}
        tone="danger"
        title="Remover veículo?"
        description={removing ? `O veículo ${displayPlate(removing.plate)} deixará de aparecer na sua lista. O histórico de estadias é mantido.` : ''}
        confirmLabel="Remover"
      />
    </Page>
  )
}
