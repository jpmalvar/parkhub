import { motion } from 'framer-motion'
import { Wifi } from 'lucide-react'

export function detectBrand(number: string) {
  const n = number.replace(/\D/g, '')
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n)) return 'Elo'
  if (/^4/.test(n)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard'
  if (/^3[47]/.test(n)) return 'Amex'
  if (/^(606282|3841)/.test(n)) return 'Hipercard'
  return ''
}

export function luhn(number: string) {
  const digits = number.replace(/\D/g, '').split('').reverse().map(Number)
  if (digits.length < 13) return false
  const sum = digits.reduce((acc, d, i) => {
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    return acc + d
  }, 0)
  return sum % 10 === 0
}

const GRADIENTS: Record<string, string> = {
  Visa: 'linear-gradient(135deg,#1a1f71 0%,#2e3bd1 55%,#5b8cff 100%)',
  Mastercard: 'linear-gradient(135deg,#1b1b1f 0%,#3d2b1f 55%,#eb001b 140%)',
  Elo: 'linear-gradient(135deg,#111 0%,#333 50%,#ffcb05 150%)',
  Amex: 'linear-gradient(135deg,#0b5e7a 0%,#2e8fb5 60%,#9bd3e8 100%)',
  Hipercard: 'linear-gradient(135deg,#7a0b14 0%,#b3131b 60%,#ff6b6b 100%)',
  '': 'linear-gradient(135deg,#2a2c31 0%,#44474f 100%)',
}

/** Cartão 3D que gira para mostrar o verso quando o CVV é digitado. */
export function CreditCardPreview({ number, holder, expiry, cvv, flipped }: { number: string; holder: string; expiry: string; cvv: string; flipped: boolean }) {
  const brand = detectBrand(number)
  const digits = number.replace(/\D/g, '').padEnd(16, '•').slice(0, 16)
  const groups = digits.match(/.{1,4}/g) ?? []

  return (
    <div className="mx-auto aspect-[1.586] w-full max-w-[340px] [perspective:1200px]">
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
        className="relative size-full [transform-style:preserve-3d]"
      >
        <div
          className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-xl p-5 text-white shadow-2xl [backface-visibility:hidden]"
          style={{ background: GRADIENTS[brand] }}
        >
          <div className="relative flex items-center justify-between">
            <div className="h-8 w-11 rounded-md bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 shadow-inner" />
            <Wifi className="size-5 rotate-90 opacity-80" />
          </div>
          <div className="relative flex justify-between font-mono text-lg tracking-[0.12em] sm:text-xl">
            {groups.map((g, i) => (
              <motion.span key={i} initial={false} animate={{ opacity: 1 }}>
                {g}
              </motion.span>
            ))}
          </div>
          <div className="relative flex items-end justify-between">
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-widest opacity-60">Titular</div>
              <div className="truncate text-sm font-semibold uppercase tracking-wide">{holder || 'NOME DO TITULAR'}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-widest opacity-60">Validade</div>
              <div className="font-mono text-sm font-semibold">{expiry || 'MM/AA'}</div>
            </div>
            <div className="ml-4 text-lg font-extrabold italic tracking-tight">{brand || 'CARD'}</div>
          </div>
        </div>
        <div
          className="absolute inset-0 overflow-hidden rounded-xl text-white shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{ background: GRADIENTS[brand] }}
        >
          <div className="mt-6 h-10 bg-black/80" />
          <div className="mx-5 mt-5 flex items-center gap-3">
            <div className="h-9 flex-1 rounded bg-white/85 [background-image:repeating-linear-gradient(-45deg,transparent_0_4px,rgba(0,0,0,.06)_4px_8px)]" />
            <div className="flex h-9 w-16 items-center justify-center rounded bg-white font-mono font-bold text-black">{cvv || '•••'}</div>
          </div>
          <div className="mx-5 mt-4 text-[9px] leading-relaxed opacity-60">Pagamento simulado para demonstração. Nenhum dado de cartão é armazenado.</div>
        </div>
      </motion.div>
    </div>
  )
}
