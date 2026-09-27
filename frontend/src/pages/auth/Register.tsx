import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AtSign, Check, KeyRound, UserPlus, UserRound } from 'lucide-react'
import { errorMessage, post } from '../../lib/api'
import type { User } from '../../lib/types'
import { firstName } from '../../lib/format'
import { Button, Field, Input } from '../../components/ui'
import { PasswordStrength } from '../../components/PasswordStrength'
import { AuthLayout } from './AuthLayout'

export default function Register() {
  const [form, setForm] = useState({ full_name: '', username: '', password: '', confirm_password: '' })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = key === 'username' ? e.target.value.toLowerCase().replace(/\s/g, '') : e.target.value
    setForm((f) => ({ ...f, [key]: value }))
  }
  const touch = (key: string) => () => setTouched((t) => ({ ...t, [key]: true }))

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {}
    e.full_name = form.full_name.trim().length < 3 ? 'Informe seu nome completo.' : null
    e.username = !/^[a-z0-9_.]{3,24}$/.test(form.username) ? 'De 3 a 24 caracteres: letras minúsculas, números, "." ou "_".' : null
    e.password =
      form.password.length < 8 ? 'A senha deve ter pelo menos 8 caracteres.' : !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password) ? 'Use letras e números.' : null
    e.confirm_password = form.confirm_password !== form.password ? 'As senhas não coincidem.' : null
    return e
  }, [form])
  const valid = Object.values(errors).every((v) => !v)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched({ full_name: true, username: true, password: true, confirm_password: true })
    if (!valid) return
    setLoading(true)
    setServerError(null)
    try {
      const { user } = await post<{ user: User }>('/auth/register', form)
      qc.setQueryData(['me'], user)
      toast.success(`Conta criada! Bem-vindo(a), ${firstName(user.full_name)}.`)
      navigate('/app', { replace: true })
    } catch (err) {
      setServerError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const show = (key: string) => (touched[key] ? errors[key] : null)

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Leva menos de um minuto. Depois é só escolher a vaga."
      footer={
        <>
          Já tem uma conta?{' '}
          <Link to="/entrar" className="font-semibold text-brand hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Nome completo" htmlFor="full_name" error={show('full_name')}>
          <Input id="full_name" autoComplete="name" autoFocus icon={<UserRound />} placeholder="Maria Silva" value={form.full_name} onChange={set('full_name')} onBlur={touch('full_name')} />
        </Field>
        <Field label="Nome de usuário" htmlFor="username" error={show('username') ?? (serverError?.includes('usuário') ? serverError : null)} hint="Será usado para entrar no sistema.">
          <Input
            id="username"
            autoComplete="username"
            icon={<AtSign />}
            placeholder="maria.silva"
            value={form.username}
            onChange={set('username')}
            onBlur={touch('username')}
            trailing={!errors.username ? <Check className="mr-2.5 size-4 text-success" /> : undefined}
          />
        </Field>
        <Field label="Senha" htmlFor="password" error={show('password')}>
          <Input id="password" type="password" autoComplete="new-password" icon={<KeyRound />} placeholder="••••••••" value={form.password} onChange={set('password')} onBlur={touch('password')} />
        </Field>
        <PasswordStrength password={form.password} />
        <Field label="Confirmar senha" htmlFor="confirm_password" error={show('confirm_password')}>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            icon={<KeyRound />}
            placeholder="••••••••"
            value={form.confirm_password}
            onChange={set('confirm_password')}
            onBlur={touch('confirm_password')}
            trailing={form.confirm_password && !errors.confirm_password ? <Check className="mr-2.5 size-4 text-success" /> : undefined}
          />
        </Field>
        {serverError && !serverError.includes('usuário') && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger">{serverError}</div>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading} icon={<UserPlus className="size-4" />}>
          Criar conta
        </Button>
        <p className="text-center text-xs text-muted">Sua senha é armazenada com criptografia bcrypt e nunca em texto puro.</p>
      </form>
    </AuthLayout>
  )
}
