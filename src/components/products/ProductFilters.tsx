import { useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import type { ProductFilters } from '../../types/product'

interface Props {
  filters: ProductFilters
  onApply: (f: ProductFilters) => void
}

export default function ProductFiltersComponent({ filters, onApply }: Props) {
  const [local, setLocal] = useState<ProductFilters>(filters)

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') onApply(local)
  }

  return (
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
  )
}
