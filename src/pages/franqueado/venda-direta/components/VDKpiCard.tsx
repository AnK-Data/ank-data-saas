import type { ComponentType, SVGProps } from 'react'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid'

interface VDKpiCardProps {
  label: string
  value: string
  sub?: string
  accent?: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose'
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  delta?: number | null
}

const A = {
  blue:    { border: 'border-blue-200 dark:border-blue-800/50',    bg: 'from-blue-50/70 dark:from-blue-950/20',    val: 'text-blue-700 dark:text-blue-400',    ic: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' },
  emerald: { border: 'border-emerald-200 dark:border-emerald-800/50', bg: 'from-emerald-50/70 dark:from-emerald-950/20', val: 'text-emerald-700 dark:text-emerald-400', ic: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' },
  violet:  { border: 'border-violet-200 dark:border-violet-800/50',  bg: 'from-violet-50/70 dark:from-violet-950/20',  val: 'text-violet-700 dark:text-violet-400',  ic: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' },
  amber:   { border: 'border-amber-200 dark:border-amber-800/50',   bg: 'from-amber-50/70 dark:from-amber-950/20',   val: 'text-amber-700 dark:text-amber-400',   ic: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' },
  rose:    { border: 'border-rose-200 dark:border-rose-800/50',    bg: 'from-rose-50/70 dark:from-rose-950/20',    val: 'text-rose-700 dark:text-rose-400',    ic: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400' },
}

export default function VDKpiCard({ label, value, sub, accent = 'blue', icon: Icon, delta }: VDKpiCardProps) {
  const cls = A[accent]
  const isUp   = delta != null && delta > 0.05
  const isDown = delta != null && delta < -0.05

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${cls.border} ${cls.bg} to-white dark:to-slate-900 p-5 transition-shadow hover:shadow-md`}>
      <div className="flex items-center justify-between mb-3">
        {Icon
          ? <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${cls.ic}`}><Icon className="h-5 w-5" /></div>
          : <div />
        }
        {delta != null && (
          <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            isUp   ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' :
            isDown ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
                     'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            {isUp   && <ArrowTrendingUpIcon   className="h-3 w-3" />}
            {isDown && <ArrowTrendingDownIcon className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold leading-tight ${cls.val}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  )
}
