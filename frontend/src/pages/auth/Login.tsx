import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Eye, EyeOff, KeyRound, LogIn, ShieldCheck, TriangleAlert, UserRound } from 'lucide-react'
import { errorMessage, post } from '../../lib/api'
import type { User } from '../../lib/types'
import { firstName } from '../../lib/format'
import { Button, Field, IconButton, Input } from '../../components/ui'
import { homeFor } from '../../components/RequireAuth'
import { AuthLayout } from './AuthLayout'

const DEMO = [
  { label: 'Cliente', username: 'cliente', password: 'cliente123', icon: <UserRound className="size-4" /> },
  { label: 'Administrador', username: 'admin', password: 'admin123', icon: <ShieldCheck className="size-4" /> },
]

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const qc = useQueryClient()

  const submit = async (e?: FormEvent, creds?: { username: string; password: string }) => {
    e?.preventDefault()
    const u = creds?.username ?? username
    const p = creds?.password ?? password
    if (!u.trim() || !p) {
      setError('Informe usuário e senha.')
      setShake((s) => s + 1)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { user } = await post<{ user: User }>('/auth/login', { username: u, password: p })
      qc.setQueryData(['me'], user)
      toast.success(`Bem-vindo(a), ${firstName(user.full_name)}!`)
      const next = params.get('next')
      const safeNext = next && next.startsWith(user.role === 'admin' ? '/admin' : '/app') ? next : null
      navigate(safeNext ?? homeFor(user.role), { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setShake((s) => s + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Entre para estacionar, acompanhar seus tickets e pagar pelo app."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="font-semibold text-brand hover:underline">
            Criar conta grátis
          </Link>
        </>
      }
    >
      <motion.form
        key={shake}
        animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : undefined}
        transition={{ duration: 0.4 }}
        onSubmit={submit}
        className="space-y-4"
        noValidate
      >
        <Field label="Usuário" htmlFor="username">
          <Input id="username" autoComplete="username" autoFocus icon={<UserRound />} placeholder="seu.usuario" value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="Senha" htmlFor="password">
          <Input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            icon={<KeyRound />}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            trailing={
              <IconButton label={show ? 'Ocultar senha' : 'Mostrar senha'} className="size-8" onClick={() => setShow((s) => !s)}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </IconButton>
            }
          />
        </Field>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2.5 overflow-hidden rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <Button type="submit" size="lg" className="w-full" loading={loading} icon={<LogIn className="size-4" />}>
          Entrar
        </Button>
      </motion.form>

      <div className="mt-8 rounded-xl border border-dashed border-border p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Acesso rápido de demonstração</div>
        <div className="grid grid-cols-2 gap-2">
          {DEMO.map((d) => (
            <button
              key={d.username}
              type="button"
              disabled={loading}
              onClick={() => {
                setUsername(d.username)
                setPassword(d.password)
                submit(undefined, d)
              }}
              className="group flex items-center gap-2.5 rounded-xl border border-border bg-surface-2/50 px-3 py-2.5 text-left transition hover:border-brand/50 hover:bg-brand/5"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand transition group-hover:scale-110">{d.icon}</span>
              <span>
                <span className="block text-sm font-semibold">{d.label}</span>
                <span className="block font-mono text-[11px] text-muted">
                  {d.username} / {d.password}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}
