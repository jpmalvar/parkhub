import clsx from 'clsx'
import { displayPlate, plateFormat } from '../lib/format'

const sizes = {
  xs: { box: 'h-6 min-w-[74px] text-[11px] rounded-[5px]', band: 'h-[5px]', label: 'hidden', pad: 'px-1.5 pt-[5px]' },
  sm: { box: 'h-8 min-w-[96px] text-[14px] rounded-md', band: 'h-[7px]', label: 'text-[4.5px]', pad: 'px-2 pt-[7px]' },
  md: { box: 'h-11 min-w-[132px] text-[20px] rounded-lg', band: 'h-[10px]', label: 'text-[6.5px]', pad: 'px-3 pt-[10px]' },
  lg: { box: 'h-16 min-w-[196px] text-[30px] rounded-xl', band: 'h-[15px]', label: 'text-[9px]', pad: 'px-4 pt-[15px]' },
}

/** Placa brasileira desenhada no padrão Mercosul (ou cinza, no padrão antigo). */
export function Plate({ plate, size = 'md', className, placeholder }: { plate: string; size?: keyof typeof sizes; className?: string; placeholder?: boolean }) {
  const s = sizes[size]
  const format = plate.length >= 5 ? plateFormat(plate) : 'mercosul'
  const text = plate ? displayPlate(plate) : 'ABC1D23'

  if (format === 'antiga' && !placeholder) {
    return (
      <span
        className={clsx(
          'relative inline-flex shrink-0 items-center justify-center whitespace-nowrap border-2 border-[#3b3f47] bg-gradient-to-b from-[#d9dce1] to-[#b9bdc4] font-mono font-extrabold tracking-[0.08em] text-[#1d2027] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_4px_10px_-4px_rgba(0,0,0,0.5)]',
          s.box,
          s.pad.replace(/pt-\[\d+px\]/, ''),
          className,
        )}
      >
        {text}
      </span>
    )
  }

  return (
    <span
      className={clsx(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden whitespace-nowrap border-2 border-[#1c2433] bg-white font-mono font-extrabold tracking-[0.08em] text-[#11151c] shadow-[0_4px_12px_-4px_rgba(0,0,0,0.45)]',
        s.box,
        s.pad,
        placeholder && 'opacity-40',
        className,
      )}
    >
      <span className={clsx('absolute inset-x-0 top-0 flex items-center justify-between bg-[#1f4fb8] px-1', s.band)}>
        <span className={clsx('font-sans font-bold leading-none tracking-[0.25em] text-white', s.label)}>BRASIL</span>
        <span className={clsx('flex h-[70%] items-center', s.label === 'hidden' && 'hidden')}>
          <svg viewBox="0 0 14 10" className="h-full">
            <rect width="14" height="10" fill="#009c3b" />
            <path d="M7 1 13 5 7 9 1 5Z" fill="#ffdf00" />
            <circle cx="7" cy="5" r="2" fill="#002776" />
          </svg>
        </span>
      </span>
      <span className="relative leading-none">{text}</span>
    </span>
  )
}
