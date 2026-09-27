import { useState } from 'react'
import clsx from 'clsx'
import { initials } from '../lib/format'

/** Foto de perfil; sem foto (ou se ela falhar ao carregar), mostra as iniciais. A cor de fundo vem do className. */
export function Avatar({ user, className }: { user: { full_name: string; avatar_url?: string | null }; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const url = user.avatar_url && failed !== user.avatar_url ? user.avatar_url : null
  return (
    <div className={clsx('flex shrink-0 items-center justify-center overflow-hidden font-bold', className)}>
      {url ? (
        <img src={url} alt="" className="size-full object-cover" onError={() => setFailed(url)} />
      ) : (
        initials(user.full_name)
      )}
    </div>
  )
}
