import type { PapelRevendedora } from '../../../../types'

const CORES: Record<string, string> = {
  'Bronze':        'bg-orange-100  text-orange-700  dark:bg-orange-950/40 dark:text-orange-400',
  'Prata':         'bg-slate-100   text-slate-600   dark:bg-slate-800     dark:text-slate-300',
  'Ouro':          'bg-yellow-100  text-yellow-700  dark:bg-yellow-950/40 dark:text-yellow-400',
  'Platina':       'bg-cyan-100    text-cyan-700    dark:bg-cyan-950/40   dark:text-cyan-400',
  'Rubi':          'bg-red-100     text-red-700     dark:bg-red-950/40    dark:text-red-400',
  'Esmeralda GB':  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  'Diamante GB':   'bg-blue-100    text-blue-700    dark:bg-blue-950/40   dark:text-blue-400',
  'Revendedor':    'bg-violet-100  text-violet-700  dark:bg-violet-950/40 dark:text-violet-400',
  'Consumidor Final': 'bg-slate-50 text-slate-500   dark:bg-slate-900     dark:text-slate-400',
}

export default function PapelBadge({ papel }: { papel: string }) {
  const cls = CORES[papel] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {papel}
    </span>
  )
}

export type { PapelRevendedora }
