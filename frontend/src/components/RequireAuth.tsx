import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useMe } from '../lib/hooks'
import type { Role } from '../lib/types'
import { LogoMark } from './Logo'

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-2xl bg-brand/30" />
        <LogoMark className="relative size-12" />
      </div>
    </div>
  )
}

export const homeFor = (role: Role) => (role === 'admin' ? '/admin' : '/app')

export function RequireAuth({ role, children }: { role: Role; children: ReactNode }) {
  const { data: user, isLoading } = useMe()
  const location = useLocation()
  if (isLoading) return <FullScreenLoader />
  if (!user) return <Navigate to={`/entrar?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />
  return <>{children}</>
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useMe()
  if (isLoading) return <FullScreenLoader />
  if (user) return <Navigate to={homeFor(user.role)} replace />
  return <>{children}</>
}
