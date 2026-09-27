import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarDays, Camera, KeyRound, LogOut, Monitor, Moon, Pencil, ShieldCheck, Sun, Trash2, UserRound } from 'lucide-react'
import { del, errorMessage, patch, post, put } from '../lib/api'
import { useMe, useSetMe } from '../lib/hooks'
import { squareThumbnail } from '../lib/image'
import type { User } from '../lib/types'
import { useTheme } from '../lib/theme'
import { dateOnly, dateTime } from '../lib/format'
import { Avatar } from '../components/Avatar'
import { PasswordStrength } from '../components/PasswordStrength'
import { Badge, Button, Card, CardHeader, Field, IconButton, Input, Page, PageHeader, Segmented, Spinner } from '../components/ui'

/** Foto + nome, com edição. Cada alteração já volta com o usuário atualizado da API. */
function ProfileCard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const setMe = useSetMe()
  const qc = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.full_name)
  const [saving, setSaving] = useState<'name' | 'photo' | null>(null)

  const updated = (next: User) => {
    setMe(next)
    qc.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const saveName = async (e: FormEvent) => {
    e.preventDefault()
    setSaving('name')
    try {
      const res = await patch<{ user: User }>('/me/profile', { full_name: name })
      updated(res.user)
      setName(res.user.full_name)
      setEditing(false)
      toast.success('Nome atualizado.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(null)
    }
  }

  const pickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // deixa escolher o mesmo arquivo de novo
    if (!file) return
    setSaving('photo')
    try {
      const image = await squareThumbnail(file)
      const res = await put<{ user: User }>('/me/avatar', { image })
      updated(res.user)
      toast.success('Foto atualizada.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(null)
    }
  }

  const removePhoto = async () => {
    setSaving('photo')
    try {
      const res = await del<{ user: User }>('/me/avatar')
      updated(res.user)
      toast.success('Foto removida.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-24 bg-brand" />
      <div className="-mt-10 px-6 pb-6">
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={saving === 'photo'}
            className="group relative rounded-xl border-4 border-surface"
            title="Trocar foto"
          >
            <Avatar user={user} className="size-20 rounded-lg bg-brand text-2xl text-white" />
            <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition group-hover:opacity-100 group-disabled:opacity-100">
              {saving === 'photo' ? <Spinner className="size-5 text-white" /> : <Camera className="size-5" />}
            </span>
          </button>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pickPhoto} />
          <div className="mb-1 flex gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()} disabled={saving === 'photo'}>
              {user.avatar_url ? 'Trocar foto' : 'Adicionar foto'}
            </Button>
            {user.avatar_url && (
              <IconButton label="Remover foto" onClick={removePhoto} disabled={saving === 'photo'}>
                <Trash2 className="size-4" />
              </IconButton>
            )}
          </div>
        </div>

        {editing ? (
          <form onSubmit={saveName} className="mt-4 space-y-2">
            <Input autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-label="Nome completo" />
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={saving === 'name'} disabled={name.trim().length < 3 || name.trim() === user.full_name}>
                Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setName(user.full_name)
                  setEditing(false)
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            <h2 className="text-xl font-bold">{user.full_name}</h2>
            <IconButton label="Editar nome" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
            </IconButton>
            <Badge tone={user.role === 'admin' ? 'brand' : 'neutral'} className="ml-auto">
              {user.role === 'admin' ? 'Administrador' : 'Cliente'}
            </Badge>
          </div>
        )}
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
        <Button variant="outline" className="mt-6 w-full" icon={<LogOut className="size-4" />} onClick={onLogout}>
          Sair da conta
        </Button>
      </div>
    </Card>
  )
}

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
      <PageHeader eyebrow="Conta" title="Minha conta" subtitle="Seu nome, foto, senha e tema." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="space-y-6">
          <ProfileCard user={user} onLogout={logout} />
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
