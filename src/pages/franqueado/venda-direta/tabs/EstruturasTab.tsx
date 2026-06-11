import Spinner from '../../../../components/ui/Spinner'

interface EstruturaRow {
  cod_estrutura: number
  nome_estrutura: string
  cod_pdv: number
  cidade: string
  revendedoras: number
  receita_bruta: number
  receita_liquida: number
  volume: number
}

interface Props {
  data: { data: EstruturaRow[] } | null
  loading: boolean
  error: string | null
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function initials(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const EST_COLORS = [
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
]

export default function EstruturasTab({ data, loading, error }: Props) {
  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (error)   return <p className="text-center text-red-500 py-12">{error}</p>
  if (!data)   return null

  const maxRB   = data.data[0]?.receita_bruta   || 1
  const maxRevs = data.data[0]?.revendedoras     || 1

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-10">#</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Estrutura</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Cidade</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Revendedoras</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Rec. Bruta</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Rec. Liquida</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Volume</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
          {data.data.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">Nenhuma estrutura encontrada.</td>
            </tr>
          )}
          {data.data.map((row, idx) => {
            const rbPct   = (row.receita_bruta / maxRB * 100).toFixed(1)
            const revsPct = (row.revendedoras  / maxRevs * 100).toFixed(1)
            const colorCls = EST_COLORS[idx % EST_COLORS.length]
            return (
              <tr key={row.cod_estrutura} className="hover:bg-violet-50/20 dark:hover:bg-violet-950/10 transition-colors">
                <td className="px-4 py-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                    idx === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' :
                    idx === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400' :
                    idx === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-slate-100 text-slate-400 dark:bg-slate-800'
                  }`}>
                    {idx + 1}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${colorCls}`}>
                      {initials(row.nome_estrutura)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">{row.nome_estrutura}</p>
                      <p className="text-[10px] text-slate-400">PDV {row.cod_pdv}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell">{row.cidade}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{row.revendedoras.toLocaleString('pt-BR')}</span>
                    <div className="w-12 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-400 dark:bg-emerald-600" style={{ width: `${revsPct}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold text-violet-700 dark:text-violet-400">{brl(row.receita_bruta)}</span>
                    <div className="w-16 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-violet-400 dark:bg-violet-600" style={{ width: `${rbPct}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 hidden lg:table-cell">{brl(row.receita_liquida)}</td>
                <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400 hidden sm:table-cell">{row.volume.toLocaleString('pt-BR')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
