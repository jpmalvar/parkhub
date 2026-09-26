import { useEffect, useRef, useState } from 'react'
import { animate, useInView, useReducedMotion } from 'framer-motion'

/** Número que "conta" suavemente até o valor final quando entra na tela ou muda. */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString('pt-BR'),
  duration = 1.1,
  className,
}: {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(0)
  const current = useRef(0)

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      current.current = value
      setDisplay(value)
      return
    }
    const controls = animate(current.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        current.current = v
        setDisplay(v)
      },
    })
    return () => controls.stop()
  }, [value, inView, duration, reduce])

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {format(display)}
    </span>
  )
}
