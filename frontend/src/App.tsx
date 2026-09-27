import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useTheme } from './lib/theme'
import { AppShell } from './components/AppShell'
import { FullScreenLoader, GuestOnly, RequireAuth } from './components/RequireAuth'
import { Spinner } from './components/ui'

const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Profile = lazy(() => import('./pages/Profile'))

const UserDashboard = lazy(() => import('./pages/user/Dashboard'))
const Park = lazy(() => import('./pages/user/Park'))
const TicketPage = lazy(() => import('./pages/user/TicketPage'))
const Pay = lazy(() => import('./pages/user/Pay'))
const HistoryPage = lazy(() => import('./pages/user/History'))
const Vehicles = lazy(() => import('./pages/user/Vehicles'))

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const LiveMap = lazy(() => import('./pages/admin/LiveMap'))
const Reports = lazy(() => import('./pages/admin/Reports'))
const UsersPage = lazy(() => import('./pages/admin/Users'))
const Tariffs = lazy(() => import('./pages/admin/Tariffs'))
const Audit = lazy(() => import('./pages/admin/Audit'))

const TITLES: [RegExp, string][] = [
  [/^\/entrar/, 'Entrar'],
  [/^\/cadastro/, 'Criar conta'],
  [/^\/app\/estacionar/, 'Estacionar'],
  [/^\/app\/ticket/, 'Ticket'],
  [/^\/app\/pagar/, 'Pagamento'],
  [/^\/app\/historico/, 'Histórico'],
  [/^\/app\/veiculos/, 'Meus veículos'],
  [/\/perfil/, 'Minha conta'],
  [/^\/app/, 'Painel'],
  [/^\/admin\/mapa/, 'Mapa ao vivo'],
  [/^\/admin\/relatorios/, 'Relatórios'],
  [/^\/admin\/usuarios/, 'Usuários'],
  [/^\/admin\/tarifas/, 'Tarifas'],
  [/^\/admin\/auditoria/, 'Auditoria'],
  [/^\/admin/, 'Dashboard'],
]

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="size-7" />
    </div>
  )
}

function useDocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const match = TITLES.find(([re]) => re.test(pathname))
    document.title = pathname === '/' ? 'ParkHub' : `${match ? match[1] : 'Página não encontrada'} · ParkHub`
    window.scrollTo({ top: 0 })
  }, [pathname])
}

export default function App() {
  const { theme } = useTheme()
  useDocumentTitle()

  return (
    <>
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/entrar" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/cadastro" element={<GuestOnly><Register /></GuestOnly>} />

          <Route path="/app" element={<RequireAuth role="user"><AppShell variant="user" /></RequireAuth>}>
            <Route index element={<Suspense fallback={<PageFallback />}><UserDashboard /></Suspense>} />
            <Route path="estacionar" element={<Suspense fallback={<PageFallback />}><Park /></Suspense>} />
            <Route path="ticket/:code" element={<Suspense fallback={<PageFallback />}><TicketPage /></Suspense>} />
            <Route path="pagar/:code" element={<Suspense fallback={<PageFallback />}><Pay /></Suspense>} />
            <Route path="historico" element={<Suspense fallback={<PageFallback />}><HistoryPage /></Suspense>} />
            <Route path="veiculos" element={<Suspense fallback={<PageFallback />}><Vehicles /></Suspense>} />
            <Route path="perfil" element={<Suspense fallback={<PageFallback />}><Profile /></Suspense>} />
          </Route>

          <Route path="/admin" element={<RequireAuth role="admin"><AppShell variant="admin" /></RequireAuth>}>
            <Route index element={<Suspense fallback={<PageFallback />}><AdminDashboard /></Suspense>} />
            <Route path="mapa" element={<Suspense fallback={<PageFallback />}><LiveMap /></Suspense>} />
            <Route path="relatorios" element={<Suspense fallback={<PageFallback />}><Reports /></Suspense>} />
            <Route path="usuarios" element={<Suspense fallback={<PageFallback />}><UsersPage /></Suspense>} />
            <Route path="tarifas" element={<Suspense fallback={<PageFallback />}><Tariffs /></Suspense>} />
            <Route path="auditoria" element={<Suspense fallback={<PageFallback />}><Audit /></Suspense>} />
            <Route path="pagar/:code" element={<Suspense fallback={<PageFallback />}><Pay /></Suspense>} />
            <Route path="perfil" element={<Suspense fallback={<PageFallback />}><Profile /></Suspense>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster theme={theme} position="top-right" richColors closeButton toastOptions={{ className: 'font-sans' }} />
    </>
  )
}
