import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { VDFilters } from '../../../../types'

interface VDFiltersProps {
  filters: VDFilters
  onChange: (f: VDFilters) => void
  ciclosDisponiveis?: string[]
  marcasDisponiveis?: string[]
  supervisoresDisponiveis?: string[]
  estruturasDisponiveis?: string[]
}

const sel = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ' +
  'px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 ' +
  'focus:ring-violet-500/40 transition-all'

export default function VDFilters({
  filters,
  onChange,
  ciclosDisponiveis = [],
  marcasDisponiveis = [],
  supervisoresDisponiveis = [],
  estruturasDisponiveis = [],
}: VDFiltersProps) {
  const set = (key: keyof VDFilters, value: string) =>
    onChange({ ...filters, [key]: value || undefined })

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FunnelIcon className="h-4 w-4 text-slate-400 shrink-0" />

      {ciclosDisponiveis.length > 0 && (
        <select value={filters.ciclo ?? ''} onChange={e => set('ciclo', e.target.value)} className={sel}>
          <option value="">Todos os ciclos</option>
          {ciclosDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}

      {marcasDisponiveis.length > 0 && (
        <select value={filters.marca ?? ''} onChange={e => set('marca', e.target.value)} className={sel}>
          <option value="">Todas as marcas</option>
          {marcasDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      )}

      {supervisoresDisponiveis.length > 0 && (
        <select value={filters.supervisor ?? ''} onChange={e => set('supervisor', e.target.value)} className={sel}>
          <option value="">Todos os supervisores</option>
          {supervisoresDisponiveis.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      )}

      {estruturasDisponiveis.length > 0 && (
        <select value={filters.estrutura ?? ''} onChange={e => set('estrutura', e.target.value)} className={sel}>
          <option value="">Todas as estruturas</option>
          {estruturasDisponiveis.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      )}

      {hasFilters && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2
            text-xs font-medium text-slate-500 hover:text-red-600 hover:border-red-300 transition-colors"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
          Limpar
        </button>
      )}
    </div>
  )
}
