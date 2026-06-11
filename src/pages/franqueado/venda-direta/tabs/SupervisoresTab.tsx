import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import Spinner from '../../../../components/ui/Spinner'
import type { VDSupervisor } from '../../../../types'

interface Props {
  data: { data: VDSupervisor[] } | null
  loading: boolean
  error: string | null
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
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
]

function avatarColor(name: string) {
  const code = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function SupervisoresTab({ data, loading, error }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (error)   return <p className="text-center text-red-500 py-12">{error}</p>
  if (!data)   return null
  if (data.data.length === 0) return <p className="text-center text-slate-400 text-sm py-12">Nenhum supervisor encontrado.</p>

  const toggle = (nome: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(nome) ? next.delete(nome) : next.add(nome)
      return next
    })

  const maxRB = data.data[0]?.receita_bruta || 1

  return (
    <div className="space-y-2.5">
      {data.data.map((sup, idx) => {
        const open = expanded.has(sup.nome_supervisor)
        const rbPct = (sup.receita_bruta / maxRB * 100).toFixed(1)
        return (
          <div
            key={sup.nome_supervisor}
            className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <button
              onClick={() => toggle(sup.nome_supervisor)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
            >
              {/* Rank */}
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                idx === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' :
                idx === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400' :
                idx === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                'bg-slate-100 text-slate-400 dark:bg-slate-800'
              }`}>
                {idx + 1}
              </span>

              {/* Avatar + Nome */}
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(sup.nome_supervisor)}`}>
                {initials(sup.nome_supervisor)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{sup.nome_supervisor}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{sup.supervisor_curto}</p>
              </div>

              {/* KPIs inline — tela media+ */}
              <div className="hidden sm:flex items-center gap-5 text-right shrink-0">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Revendedoras</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{sup.revendedoras_ativas.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Pedidos</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{sup.pedidos.toLocaleString('pt-BR')}</p>
                </div>
                <div className="min-w-[96px]">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Rec. Bruta</p>
                  <p className="font-bold text-violet-600 dark:text-violet-400 text-sm">{brl(sup.receita_bruta)}</p>
                  <div className="mt-1 h-1 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-violet-400 dark:bg-violet-600 transition-all duration-500" style={{ width: `${rbPct}%` }} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">Volume</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{sup.volume.toLocaleString('pt-BR')}</p>
                </div>
              </div>

              {/* Chevron */}
              <div className="shrink-0 text-slate-400">
                {open
                  ? <ChevronDownIcon  className="h-4 w-4" />
                  : <ChevronRightIcon className="h-4 w-4" />
                }
              </div>
            </button>

            {open && (
              <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4 bg-slate-50/50 dark:bg-slate-800/20">
                {/* KPIs mobile */}
                <div className="grid grid-cols-2 sm:hidden gap-3 mb-4">
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3">
                    <p className="text-[10px] text-slate-400 uppercase">Revendedoras</p>
                    <p className="font-bold text-slate-700 dark:text-slate-300">{sup.revendedoras_ativas.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 p-3">
                    <p className="text-[10px] text-slate-400 uppercase">Rec. Bruta</p>
                    <p className="font-bold text-violet-600 dark:text-violet-400">{brl(sup.receita_bruta)}</p>
                  </div>
                </div>

                {/* Estruturas */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Estruturas ({sup.estruturas.filter(Boolean).length})
                  </p>
                  {sup.estruturas.filter(Boolean).length === 0
                    ? <p className="text-xs text-slate-400">—</p>
                    : (
                      <div className="flex flex-wrap gap-1.5">
                        {sup.estruturas.filter(Boolean).map(e => (
                          <span
                            key={e}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    )
                  }
                </div>

                {/* Receita Liquida + Volume — detalhe extra */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span>Rec. Liquida: <strong className="text-slate-700 dark:text-slate-300">{brl(sup.receita_liquida)}</strong></span>
                  <span>Volume: <strong className="text-slate-700 dark:text-slate-300">{sup.volume.toLocaleString('pt-BR')}</strong> un</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
