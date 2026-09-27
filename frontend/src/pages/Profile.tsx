import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarDays, KeyRound, LogOut, Monitor, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react'
import { errorMessage, post } from '../lib/api'
import { useMe } from '../lib/hooks'
import { useTheme } from '../lib/theme'
import { dateOnly, dateTime, initials } from '../lib/format'
import { PasswordStrength } from '../components/PasswordStrength'
import { Badge, Button, Card, CardHeader, Field, Input, Page, PageHeader, Segmented } from '../components/ui'

export default function Profile() {
  const { data: user } = useMe()
  const { theme, setTheme } = useTheme()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)

  if (!user) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) {
      toast.error('As senhas não coincidem.')
      return
    }
    setLoading(true)
    try {
      await post('/auth/change-password', form)
      toast.success('Senha alterada! Outras sessões abertas foram encerradas por segurança.')
      setForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await post('/auth/logout').catch(() => {})
    qc.setQueryData(['me'], null)
    navigate('/')
  }

  return (
    <Page>
      <PageHeader eyebrow="Conta" title="Minha conta" subtitle="Gerencie seus dados, segurança e preferências." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="h-24 bg-brand" />
            <div className="-mt-10 px-6 pb-6">
              <div className="flex size-20 items-center justify-center rounded-xl border-4 border-surface bg-brand text-2xl font-bold text-white shadow-xl">{initials(user.full_name)}</div>
              <div className="mt-4 flex items-center gap-2">
                <h2 className="text-xl font-bold">{user.full_name}</h2>
                <Badge tone={user.role === 'admin' ? 'brand' : 'neutral'}>{user.role === 'admin' ? 'Administrador' : 'Cliente'}</Badge>
              </div>
              <div className="text-sm text-muted">@{user.username}</div>
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <CalendarDays className="size-4 text-muted" />
                  <dt className="text-muted">Membro desde</dt>
                  <dd className="ml-auto font-medium">{dateOnly(user.created_at)}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <UserRound className="size-4 text-muted" />
                  <dt className="text-muted">Último acesso</dt>
                  <dd className="ml-auto font-medium">{dateTime(user.last_login_at)}</dd>
                </div>
              </dl>
              <Button variant="outline" className="mt-6 w-full" icon={<LogOut className="size-4" />} onClick={logout}>
                Sair da conta
              </Button>
            </div>
          </Card>
          <Card>
            <CardHeader title="Aparência" subtitle="Escolha o tema da interface" icon={<Monitor className="size-4" />} />
            <div className="p-5">
              <Segmented
                className="w-full"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'light', label: 'Claro', icon: <Sun /> },
                  { value: 'dark', label: 'Escuro', icon: <Moon /> },
                ]}
              />
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Alterar senha" subtitle="Ao trocar a senha, todas as outras sessões são encerradas." icon={<KeyRound className="size-4" />} />
          <form onSubmit={submit} className="space-y-4 p-6">
            <Field label="Senha atual" htmlFor="cur">
              <Input id="cur" type="password" autoComplete="current-password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />
            </Field>
            <Field label="Nova senha" htmlFor="new">
              <Input id="new" type="password" autoComplete="new-password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />
            </Field>
            <PasswordStrength password={form.new_password} />
            <Field label="Confirmar nova senha" htmlFor="conf" error={form.confirm_password && form.confirm_password !== form.new_password ? 'As senhas não coincidem.' : null}>
              <Input id="conf" type="password" autoComplete="new-password" value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} />
            </Field>
            <Button type="submit" loading={loading} disabled={!form.current_password || form.new_password.length < 8} icon={<ShieldCheck className="size-4" />}>
              Atualizar senha
            </Button>
          </form>
        </Card>
      </div>
    </Page>
  )
}
