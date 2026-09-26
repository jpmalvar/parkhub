import { motion } from 'framer-motion'
import { CarTop } from './GarageMap'

/** Animação de sucesso: a cancela sobe e o carro passa. */
export function GateSuccess() {
  return (
    <div className="relative mx-auto h-44 w-80 overflow-hidden rounded-2xl border border-border bg-surface-2/60">
      <div className="lane animate-lane absolute inset-x-0 bottom-0 h-16" />
      {/* poste e sinaleiro */}
      <div className="absolute left-[30%] top-[98px] h-[78px] w-2.5 rounded-full bg-gradient-to-b from-slate-300 to-slate-500 shadow" />
      <motion.div
        className="absolute left-[calc(30%-3px)] top-[88px] size-4 rounded-full"
        initial={{ backgroundColor: '#f43f5e', boxShadow: '0 0 14px #f43f5e' }}
        animate={{ backgroundColor: '#10b981', boxShadow: '0 0 16px #10b981' }}
        transition={{ delay: 0.3, duration: 0.3 }}
      />
      {/* braço da cancela */}
      <motion.div
        className="absolute left-[calc(30%+5px)] top-[102px] h-2.5 w-[120px] origin-left rounded-full bg-[repeating-linear-gradient(90deg,#f43f5e_0_14px,#fff_14px_28px)] shadow-md"
        initial={{ rotate: 0 }}
        animate={{ rotate: -68 }}
        transition={{ delay: 0.45, duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
      />
      {/* carro passando */}
      <motion.div
        className="absolute bottom-[14px] h-9"
        initial={{ left: '-25%' }}
        animate={{ left: '115%' }}
        transition={{ delay: 1.2, duration: 1.8, ease: [0.45, 0, 0.2, 1] }}
      >
        <CarTop color="#7c6dff" className="h-16 -translate-y-3.5 rotate-90" />
      </motion.div>
    </div>
  )
}

export function AnimatedCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" className={className}>
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      <motion.path
        d="M15 27l7 7 15-16"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
      />
    </svg>
  )
}
