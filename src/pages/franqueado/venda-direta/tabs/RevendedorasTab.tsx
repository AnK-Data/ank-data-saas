import { useState } from 'react'
import { MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import PapelBadge from '../components/PapelBadge'
import Spinner from '../../../../components/ui/Spinner'
import type { VDRevendedora } from '../../../../types'

interface Props {
  data: { data: VDRevendedora[]; total: number } | null
  loading: boolean
  error: string | null
  page: number
  pageSize: number
  onPageChange: (p: number) => void
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
]

function avatarColor(name: string) {
  const code = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function RankBadge({ n }: { n: number }) {
  if (n === 1) return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">1</span>
  if (n === 2) return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold">2</span>
  if (n === 3) return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-bold">3</span>
  return <span className="w-6 text-center text-[10px] text-slate-400">{n}</span>
}

export default function RevendedorasTab({ data, loading, error, page, pageSize, onPageChange }: Props) {
  const [search, setSearch] = useState('')

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (error)   return <p className="text-center text-red-500 py-12">{error}</p>
  if (!data)   return null

  const rows  = data.data.filter(r =>
    !search ||
    r.nome_vendedor.toLowerCase().includes(search.toLowerCase()) ||
    r.cod_revendedor.toLowerCase().includes(search.toLowerCase())
  )
  const total = data.total
  const pages = Math.ceil(total / pageSize)
  const maxRB = data.data[0]?.receita_bruta || 1
  const globalOffset = page * pageSize

  return (
    <div className="space-y-4">

      {/* Barra de busca + contador */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou codigo..."
            className="w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800
              pl-9 pr-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400
              focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
            {total.toLocaleString('pt-BR')} revendedoras
          </span>
          {search && rows.length !== data.data.length && (
            <span className="rounded-full bg-violet-100 dark:bg-violet-900/30 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-400">
              {rows.length} resultado{rows.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-10">#</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Revendedora</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Papel</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Supervisor</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Estrutura</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Rec. Bruta</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Volume</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Pedidos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">
                  Nenhum resultado para "{search}"
                </td>
              </tr>
            )}
            {rows.map((r, i) => {
              const rank = search ? i + 1 : globalOffset + i + 1
              const rbPct = (r.receita_bruta / maxRB * 100).toFixed(1)
              return (
                <tr key={r.cod_revendedor} className="hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-colors group">
                  <td className="px-4 py-3">
                    <RankBadge n={rank} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarColor(r.nome_vendedor)}`}>
                        {initials(r.nome_vendedor)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">{r.nome_vendedor}</p>
                        <p className="text-[10px] text-slate-400">{r.cod_revendedor} · {r.cidade}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><PapelBadge papel={r.papel} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px] hidden md:table-cell">
                    {r.nome_supervisor || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px] hidden lg:table-cell">
                    {r.nome_estrutura || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold text-violet-700 dark:text-violet-400 text-sm">{brl(r.receita_bruta)}</span>
                      <div className="w-16 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-400 dark:bg-violet-600" style={{ width: `${rbPct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 text-sm hidden sm:table-cell">
                    {r.volume.toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400 text-sm hidden sm:table-cell">
                    {r.pedidos}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginacao */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Pagina {page + 1} de {pages} · {total.toLocaleString('pt-BR')} total
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5
                text-xs font-medium text-slate-600 dark:text-slate-400
                disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" /> Anterior
            </button>
            <button
              disabled={page >= pages - 1}
              onClick={() => onPageChange(page + 1)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5
                text-xs font-medium text-slate-600 dark:text-slate-400
                disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Proxima <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
