import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export type RealtimeStatus = 'connecting' | 'online' | 'offline'
export interface RealtimeEvent {
  type: 'spots' | 'settings' | 'users'
  action?: 'entry' | 'exit'
  message?: string
}

interface Pulse {
  spots: string
  users: string
  settings: string
  last: { action: 'entry' | 'exit'; spot: string } | null
}

type Listener = (event: RealtimeEvent) => void

const INTERVAL = 4000

/*
 * Na Vercel não dá pra manter WebSocket aberto (o backend é serverless), então o
 * navegador pergunta ao /api/public/pulse a cada poucos segundos se algo mudou.
 * Só consulta com a aba visível, pra não ficar gastando requisição à toa.
 */
class RealtimeClient {
  status: RealtimeStatus = 'connecting'
  private statusListeners = new Set<() => void>()
  private eventListeners = new Set<Listener>()
  private timer: number | undefined
  private last: Pulse | null = null
  private users = 0

  acquire() {
    this.users += 1
    if (this.users === 1) {
      document.addEventListener('visibilitychange', this.onVisibility)
      this.tick()
    }
  }

  release() {
    this.users -= 1
    if (this.users <= 0) {
      this.users = 0
      window.clearTimeout(this.timer)
      document.removeEventListener('visibilitychange', this.onVisibility)
    }
  }

  private onVisibility = () => {
    if (document.visibilityState === 'visible') {
      window.clearTimeout(this.timer)
      this.tick()
    }
  }

  private setStatus(status: RealtimeStatus) {
    if (this.status === status) return
    this.status = status
    this.statusListeners.forEach((l) => l())
  }

  private emit(event: RealtimeEvent) {
    this.eventListeners.forEach((l) => l(event))
  }

  private tick = async () => {
    window.clearTimeout(this.timer)
    if (document.visibilityState !== 'visible') return
    try {
      const res = await fetch('/api/public/pulse', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(String(res.status))
      const pulse = (await res.json()) as Pulse
      const prev = this.last
      this.last = pulse
      this.setStatus('online')
      if (prev) {
        if (prev.spots !== pulse.spots) {
          const l = pulse.last
          this.emit({
            type: 'spots',
            action: l?.action,
            message: l ? (l.action === 'entry' ? `Entrada na vaga ${l.spot}` : `Vaga ${l.spot} liberada`) : undefined,
          })
        }
        if (prev.settings !== pulse.settings) this.emit({ type: 'settings' })
        if (prev.users !== pulse.users) this.emit({ type: 'users' })
      }
    } catch {
      this.setStatus('offline')
    }
    if (this.users > 0) this.timer = window.setTimeout(this.tick, INTERVAL)
  }

  subscribeStatus = (listener: () => void) => {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  onEvent(listener: Listener) {
    this.eventListeners.add(listener)
    return () => {
      this.eventListeners.delete(listener)
    }
  }
}

export const realtime = new RealtimeClient()

/** Mantém a consulta rodando e invalida os dados afetados por cada mudança. */
export function useRealtime(onEvent?: Listener) {
  const qc = useQueryClient()
  const handler = useRef(onEvent)
  handler.current = onEvent
  useEffect(() => {
    realtime.acquire()
    const off = realtime.onEvent((event) => {
      if (event.type === 'spots') {
        ;['spots', 'overview', 'tickets', 'admin-stats', 'admin-tickets', 'me-summary', 'ticket'].forEach((key) =>
          qc.invalidateQueries({ queryKey: [key] }),
        )
      }
      if (event.type === 'settings') {
        ;['overview', 'settings', 'ticket', 'tickets'].forEach((key) => qc.invalidateQueries({ queryKey: [key] }))
      }
      if (event.type === 'users') qc.invalidateQueries({ queryKey: ['admin-users'] })
      handler.current?.(event)
    })
    return () => {
      off()
      realtime.release()
    }
  }, [qc])
}

export function useRealtimeStatus() {
  return useSyncExternalStore(realtime.subscribeStatus, () => realtime.status)
}
