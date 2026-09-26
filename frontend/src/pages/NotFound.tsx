import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { CarTop } from '../components/GarageMap'
import { Logo } from '../components/Logo'
import { ButtonLink } from '../components/ui'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-12" />
      <div className="relative flex h-40 w-72 items-center justify-center rounded-3xl border-2 border-dashed border-border">
        <span className="absolute top-3 font-mono text-xs font-bold text-muted">VAGA 404</span>
        <motion.div initial={{ x: -260 }} animate={{ x: [-260, 0, 0, 16, 0] }} transition={{ duration: 2.2, times: [0, 0.6, 0.75, 0.85, 1] }}>
          <CarTop color="#f43f5e" className="h-24 rotate-90" />
        </motion.div>
      </div>
      <h1 className="mt-10 text-4xl font-extrabold tracking-tight">Vaga não encontrada</h1>
      <p className="mt-3 max-w-md text-muted">A página que você procura não existe ou mudou de andar.</p>
      <ButtonLink to="/" className="mt-8" icon={<ArrowLeft className="size-4" />}>
        Voltar ao início
      </ButtonLink>
    </div>
  )
}
