import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, MapPin, Search } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { useDebounced } from '../lib/hooks'
import { brl, dateTime, relative } from '../lib/format'
import type { Ticket } from '../lib/types'
import { Plate } from './Plate'
import { Badge, Spinner } from './ui'

/** Busca global da administração (Ctrl+K): localiza veículos por placa, ticket ou cliente. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [index, setIndex] = useState(0)
  const debounced = useDebounced(q.trim(), 220)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const { data, isFetching } = useQuery({
    queryKey: ['admin-search', debounced],
    queryFn: () => api<{ active: Ticket[]; history: Ticket[] }>(`/admin/search?q=${encodeURIComponent(debounced)}`),
    enabled: open && debounced.length >= 2,
  })

  const results = [...(data?.active ?? []), ...(data?.history ?? [])]

  useEffect(() => {
    if (open) {
      setQ('')
      setIndex(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])
  useEffect(() => setIndex(0), [debounced])

  const go = (t: Ticket) => {
    onClose()
    if (t.status === 'active') navigate(`/admin/mapa?vaga=${t.spot.id}&andar=${t.spot.floor}`)
    else navigate(`/admin/relatorios?q=${t.code}`)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && results[index]) {
      go(results[index])
    } else if (e.key === 'Escape') onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-5 text-muted" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Buscar por placa, nº do ticket ou cliente…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted/70"
              />
              {isFetching && <Spinner className="size-4" />}
              <kbd className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {debounced.length < 2 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">Digite ao menos 2 caracteres. Ex.: <span className="font-mono">BRA2E19</span>, <span className="font-mono">1042</span> ou <span className="font-mono">marina</span></p>
              ) : results.length === 0 && !isFetching ? (
                <p className="px-3 py-8 text-center text-sm text-muted">Nenhum veículo encontrado para “{debounced}”.</p>
              ) : (
                results.map((t, i) => (
                  <button
                    key={t.code}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => go(t)}
                    className={clsx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition', i === index ? 'bg-brand/10' : 'hover:bg-surface-2')}
                  >
                    <Plate plate={t.plate} size="xs" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {t.user?.full_name} <span className="text-muted">· #{t.code}</span>
                      </div>
                      <div className="truncate text-xs text-muted">
                        {t.status === 'active' ? `Entrou ${relative(t.entry_at)} · ${dateTime(t.entry_at)}` : `Saiu em ${dateTime(t.exit_at)} · ${brl(t.amount_cents)}`}
                      </div>
                    </div>
                    {t.status === 'active' ? (
                      <Badge tone="success" dot>
                        <MapPin className="size-3" /> {t.spot.code}
                      </Badge>
                    ) : (
                      <Badge>Histórico</Badge>
                    )}
                    {i === index && <CornerDownLeft className="size-4 text-muted" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
