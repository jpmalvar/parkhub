import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from './ui'

export function Pagination({ page, pages, onChange, label }: { page: number; pages: number; onChange: (p: number) => void; label?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm text-muted">
      <span>{label}</span>
      <div className="flex items-center gap-1">
        <IconButton label="Página anterior" disabled={page <= 1} onClick={() => onChange(page - 1)} className="disabled:opacity-30">
          <ChevronLeft className="size-4" />
        </IconButton>
        <span className="px-2 num">
          {page} / {pages}
        </span>
        <IconButton label="Próxima página" disabled={page >= pages} onClick={() => onChange(page + 1)} className="disabled:opacity-30">
          <ChevronRight className="size-4" />
        </IconButton>
      </div>
    </div>
  )
}
