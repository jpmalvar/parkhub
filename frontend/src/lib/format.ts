const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const brl = (cents: number | null | undefined) => brlFormatter.format((cents ?? 0) / 100)

export const intFmt = (n: number) => new Intl.NumberFormat('pt-BR').format(Math.round(n))

export function dateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function dateOnly(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function timeOnly(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function duration(minutes: number) {
  const m = Math.max(0, Math.floor(minutes))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  const mm = m % 60
  if (d) return `${d}d ${h}h ${String(mm).padStart(2, '0')}min`
  if (h) return `${h}h ${String(mm).padStart(2, '0')}min`
  return `${mm}min`
}

export function clock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function relative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 45) return 'agora mesmo'
  if (diff < 3600) return `há ${Math.round(diff / 60)} min`
  if (diff < 86400) return `há ${Math.round(diff / 3600)} h`
  if (diff < 86400 * 7) return `há ${Math.round(diff / 86400)} d`
  return dateOnly(iso)
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function firstName(fullName: string) {
  return fullName.split(' ')[0]
}

export function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export const cleanPlate = (raw: string) => raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7)

export const isValidPlate = (plate: string) => /^[A-Z]{3}\d{4}$/.test(plate) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(plate)

export const plateFormat = (plate: string): 'antiga' | 'mercosul' => (/^[A-Z]{3}\d{4}$/.test(plate) ? 'antiga' : 'mercosul')

export const displayPlate = (plate: string) => (/^[A-Z]{3}\d{4}$/.test(plate) ? `${plate.slice(0, 3)}-${plate.slice(3)}` : plate)

export const kindLabel = (kind: string) => (kind === 'moto' ? 'Moto' : 'Carro')

export const methodLabel: Record<string, string> = {
  pix: 'Pix',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
  isento: 'Isento',
}

/** Converte "12,50" / "12.50" / "R$ 12,50" em centavos. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  if (!cleaned) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? Math.round(value * 100) : null
}

export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')
