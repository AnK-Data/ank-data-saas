import { useState } from 'react'
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { ProductFilters, ProductFilterOptions } from '../../types/product'
import { EMPTY_FILTERS } from '../../types/product'

interface Props {
  filters: ProductFilters
  options: ProductFilterOptions
  onApply: (f: ProductFilters) => void
  onReset: () => void
}

export default function ProductFiltersComponent({ filters, options, onApply, onReset }: Props) {
  const [local, setLocal] = useState<ProductFilters>(filters)

  function set(field: keyof ProductFilters, value: string) {
    const updated = { ...local, [field]: value }
    setLocal(updated)
    // Aplica imediatamente (exceto busca)
    if (field !== 'search') onApply(updated)
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') onApply(local)
  }

  const hasFilters = Object.values(filters).some(v => v !== '')

  const selectCls = `rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
    text-slate-900 dark:text-slate-100 px-3 py-1.5 text-xs focus:border-ank-400 focus:outline-none`

  return (
    <div className="space-y-3">
      {/* Busca */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={local.search}
          onChange={e => setLocal(p => ({ ...p, search: e.target.value }))}
          onKeyDown={handleSearchKeyDown}
          placeholder="Buscar por código, nome ou nome curto… (Enter para buscar)"
          className="block w-full rounded-xl border border-slate-200 dark:border-slate-700
            bg-slate-50 dark:bg-slate-800 pl-9 pr-4 py-2.5 text-sm
            text-slate-900 dark:text-slate-100 placeholder:text-slate-400
            focus:border-ank-400 focus:outline-none focus:ring-2 focus:ring-ank-200"
        />
      </div>

      {/* Filtros em linha */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <FunnelIcon className="h-3.5 w-3.5" /> Filtrar:
        </div>

        {[
          { key: 'marca',  label: 'Marca',    opts: options.marcas   },
          { key: 'linha',  label: 'Linha',    opts: options.linhas   },
          { key: 'familia',label: 'Família',  opts: options.familias },
          { key: 'secao',  label: 'Seção',    opts: options.secoes   },
          { key: 'grupo',  label: 'Grupo',    opts: options.grupos   },
          { key: 'subgrupo', label: 'Subgrupo', opts: options.subgrupos },
          { key: 'fora_de_linha', label: 'Fora de Linha', opts: ['S', 'N'] },
        ].map(({ key, label, opts }) => (
          <select
            key={key}
            value={local[key as keyof ProductFilters]}
            onChange={e => set(key as keyof ProductFilters, e.target.value)}
            className={selectCls}
          >
            <option value="">{label}: todos</option>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}

        {hasFilters && (
          <button
            onClick={() => { setLocal(EMPTY_FILTERS); onReset() }}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors
              px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <XMarkIcon className="h-3.5 w-3.5" /> Limpar
          </button>
        )}
      </div>
    </div>
  )
}
