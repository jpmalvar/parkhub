export type Role = 'user' | 'admin'
export type VehicleKind = 'carro' | 'moto'
export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro' | 'isento'

export interface User {
  id: number
  username: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
  last_login_at: string | null
}

export interface SpotRef {
  id: number
  floor: number
  number: number
  code: string
  kind: VehicleKind
}

export interface Ticket {
  code: string
  plate: string
  plate_display: string
  plate_format: 'antiga' | 'mercosul'
  vehicle_kind: VehicleKind
  spot: SpotRef
  entry_at: string
  exit_at: string | null
  status: 'active' | 'paid'
  amount_cents: number | null
  billed_hours: number | null
  payment_method: PaymentMethod | null
  payment_detail: string | null
  payment_ref: string | null
  duration_minutes: number | null
  user?: { id: number; username: string; full_name: string }
}

export interface Tariff {
  hourly_cents: number
  daily_cap_cents: number
  grace_minutes: number
}

export interface Quote extends Tariff {
  minutes: number
  billed_hours: number
  full_days: number
  gross_cents: number
  amount_cents: number
  grace_applied: boolean
  cap_applied: boolean
}

export interface MapSpot extends SpotRef {
  occupied: boolean
  mine: boolean
  color_seed: number | null
  ticket: {
    code: string
    plate: string
    plate_display: string
    vehicle_kind: VehicleKind
    entry_at: string
    user: { username: string; full_name: string } | null
  } | null
}

export interface MapFloor {
  floor: number
  spots: MapSpot[]
}

export interface FloorOccupancy {
  floor: number
  total: number
  occupied: number
  free: number
  car_total: number
  car_occupied: number
  moto_total: number
  moto_occupied: number
}

export interface Prices {
  carro: { hourly_cents: number; daily_cap_cents: number }
  moto: { hourly_cents: number; daily_cap_cents: number }
  grace_minutes: number
}

export interface Overview {
  floors: FloorOccupancy[]
  total: number
  occupied: number
  free: number
  entries_today: number
  prices: Prices
}

export interface Vehicle {
  id: number
  plate: string
  plate_display: string
  plate_format: 'antiga' | 'mercosul'
  kind: VehicleKind
  nickname: string | null
  created_at: string
}

export interface Settings {
  hourly_car_cents: number
  hourly_moto_cents: number
  daily_cap_car_cents: number
  daily_cap_moto_cents: number
  grace_minutes: number
}

export interface AuditEntry {
  id: number
  created_at: string
  username: string | null
  action: string
  detail: string
  ip?: string | null
}

export interface AdminStats {
  days: number
  kpis: {
    revenue_today_cents: number
    revenue_cents: number
    prev_revenue_cents: number
    tickets: number
    avg_ticket_cents: number
    avg_stay_minutes: number
    occupied: number
    total_spots: number
    occupancy_pct: number
    customers: number
    new_customers: number
  }
  revenue_series: { date: string; label: string; revenue_cents: number; tickets: number }[]
  entries_by_hour: { hour: number; entries: number }[]
  by_kind: { kind: VehicleKind; revenue_cents: number; tickets: number }[]
  by_method: { method: PaymentMethod; label: string; revenue_cents: number; tickets: number }[]
  floors: FloorOccupancy[]
  recent: AuditEntry[]
}

export interface MeSummary {
  total_spent_cents: number
  visits: number
  active: number
  total_minutes: number
  avg_minutes: number
  favorite_floor: number | null
  monthly: { label: string; amount_cents: number }[]
}

export interface AdminUser extends User {
  tickets: number
  spent_cents: number
  active_tickets: number
}
