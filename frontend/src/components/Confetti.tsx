import { useMemo } from 'react'
import { motion } from 'framer-motion'

const COLORS = ['#3f72dc', '#f2bf2f', '#2fae70', '#ffffff', '#e05252']

/** Explosão leve de confetes para momentos de sucesso. */
export function Confetti({ count = 46 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 640,
        y: -(Math.random() * 320 + 120),
        rotate: Math.random() * 720 - 360,
        delay: Math.random() * 0.15,
        color: COLORS[i % COLORS.length],
        w: Math.random() * 6 + 5,
        h: Math.random() * 10 + 6,
        round: Math.random() > 0.7,
      })),
    [count],
  )
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-50" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block"
          style={{ width: p.w, height: p.round ? p.w : p.h, background: p.color, borderRadius: p.round ? 999 : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 520], opacity: [1, 1, 0], rotate: p.rotate, scale: 1 }}
          transition={{ duration: 2.4, delay: p.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  )
}
