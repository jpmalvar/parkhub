import { motion } from 'framer-motion'
import clsx from 'clsx'

export function passwordScore(pw: string) {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(4, score)
}

const LABELS = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Excelente']
const COLORS = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success']

export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password)
  if (!password) return null
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <motion.div
              className={clsx('h-full rounded-full', COLORS[score])}
              initial={false}
              animate={{ width: i < score ? '100%' : '0%' }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>
          Força: <strong className="text-fg">{LABELS[score]}</strong>
        </span>
        <span>mín. 8 caracteres, letras e números</span>
      </div>
    </div>
  )
}
