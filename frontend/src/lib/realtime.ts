import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export type RealtimeStatus = 'connecting' | 'online' | 'offline'
export interface RealtimeEvent {
  type: 'spots' | 'settings' | 'users' | 'pong'
  action?: 'entry' | 'exit'
  spot_id?: number
  message?: string
}

type Listener = (event: RealtimeEvent) => void

/** Conexão WebSocket única, com reconexão automática e heartbeat. */
class RealtimeClient {
  status: RealtimeStatus = 'connecting'
  private ws: WebSocket | null = null
  private statusListeners = new Set<() => void>()
  private eventListeners = new Set<Listener>()
  private retry = 0
  private heartbeat: number | undefined
  private reconnectTimer: number | undefined
  private users = 0

  acquire() {
    this.users += 1
    if (this.users === 1) this.connect()
  }

  release() {
    this.users -= 1
    if (this.users <= 0) {
      this.users = 0
      window.clearTimeout(this.reconnectTimer)
      window.clearInterval(this.heartbeat)
      this.ws?.close()
      this.ws = null
    }
  }

  private setStatus(status: RealtimeStatus) {
    this.status = status
    this.statusListeners.forEach((l) => l())
  }

  private connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/api/ws`)
    this.ws = ws
    this.setStatus('connecting')
    ws.onopen = () => {
      this.retry = 0
      this.setStatus('online')
      window.clearInterval(this.heartbeat)
      this.heartbeat = window.setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), 25000)
    }
    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as RealtimeEvent
        if (event.type !== 'pong') this.eventListeners.forEach((l) => l(event))
      } catch {
        /* ignora mensagens inválidas */
      }
    }
    ws.onclose = () => {
      window.clearInterval(this.heartbeat)
      if (this.ws !== ws) return
      this.setStatus('offline')
      if (this.users > 0) {
        const delay = Math.min(15000, 1000 * 2 ** this.retry++)
        this.reconnectTimer = window.setTimeout(() => this.connect(), delay)
      }
    }
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

/** Mantém a conexão aberta e invalida os dados afetados por cada evento. */
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
