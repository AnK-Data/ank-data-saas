import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend, ReferenceLine,
} from 'recharts'
import {
  CubeIcon, MapPinIcon, TruckIcon, CurrencyDollarIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { useVDQuery } from '../venda-direta/hooks/useVDQuery'
import VDFilters from '../venda-direta/components/VDFilters'
import VDKpiCard from '../venda-direta/components/VDKpiCard'
import Spinner from '../../../components/ui/Spinner'
import type { VDFilters as VDFiltersType } from '../../../types'

type CicloItem = { ciclo: string; receita_bruta: number; receita_liquida: number; volume: number }

interface LogisticaData {
  kpis: { volume: number; pedidos: number; receita_bruta: number; cidades: number }
  por_entrega:   Array<{ tipo: string; volume: number; pedidos: number; receita_bruta: number }>
  top_cidades:   Array<{ cidade: string; volume: number; pedidos: number; receita_bruta: number }>
  por_estrutura: Array<{ estrutura: string; volume: number; pedidos: number; receita_bruta: number }>
  por_marca:     Array<{ marca: string; volume: number; pedidos: number }>
}

const PIE_COLORS = ['#7c3aed', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626']

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function fmt(v: number) { return v.toLocaleString('pt-BR') }

function CustomTooltipTrend({ active, payload, label }: Record<string, unknown>) {
  if (!active || !payload || !(payload as unknown[]).length) return null
  const d = (payload as Array<{ value: number }>)[0]
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{String(label)}</p>
      <p className="text-violet-600 dark:text-violet-400 font-bold">{fmt(d.value)} un</p>
    </div>
  )
}

export default function LogisticaPage() {
  const [filters, setFilters] = useState<VDFiltersType>({})

  const ciclosList = useVDQuery<{ ciclos: CicloItem[] }>({ queryType: 'ciclos_list' })

  useEffect(() => {
    const ciclos = ciclosList.data?.ciclos
    if (ciclos && ciclos.length > 0 && !filters.ciclo) {
      setFilters({ ciclo: ciclos[ciclos.length - 1].ciclo })
    }
  }, [ciclosList.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const logistica = useVDQuery<LogisticaData>({
    queryType: 'logistica',
    filters,
    enabled: !!filters.ciclo,
  })

  const ciclosDisponiveis = (ciclosList.data?.ciclos ?? []).map(c => c.ciclo)
  const trendData  = ciclosList.data?.ciclos ?? []
  const d = logistica.data
  const ticketMedio = d ? (d.kpis.receita_bruta / (d.kpis.pedidos || 1)) : 0

  // Delta vs ciclo anterior
  const cicloIdx  = trendData.findIndex(c => c.ciclo === filters.ciclo)
  const prevCiclo = cicloIdx > 0 ? trendData[cicloIdx - 1] : null
  const volDelta  = (d && prevCiclo) ? ((d.kpis.volume - prevCiclo.volume) / (prevCiclo.volume || 1) * 100) : null

  const maxCidade = d?.top_cidades[0]?.volume || 1
  const maxEst    = d?.por_estrutura[0]?.receita_bruta || 1
  const maxMarca  = d?.por_marca[0]?.volume || 1

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Logistica</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Distribuicao de volume, cobertura geografica e mix de entrega
          </p>
        </div>
        {(ciclosList.refreshing || logistica.refreshing) && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
            Atualizando...
          </span>
        )}
      </div>

      {/* Filtros */}
      <VDFilters filters={filters} onChange={setFilters} ciclosDisponiveis={ciclosDisponiveis} />

      {/* Tendencia de Volume — carrega imediatamente */}
      {trendData.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Volume de Entregas — Historico de Ciclos</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {trendData.length} ciclos · {trendData[0]?.ciclo} — {trendData[trendData.length - 1]?.ciclo}
              </p>
            </div>
            {filters.ciclo && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-400">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 inline-block" />
                Ciclo {filters.ciclo}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
              <XAxis
                dataKey="ciclo"
                tick={{ fontSize: 10, fill: 'currentColor' }}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={v => fmt(Number(v))}
                tick={{ fontSize: 10, fill: 'currentColor' }}
                width={48}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltipTrend />} />
              {filters.ciclo && (
                <ReferenceLine
                  x={filters.ciclo}
                  stroke="#7c3aed"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  label={{ value: filters.ciclo, position: 'insideTopRight', fontSize: 9, fill: '#7c3aed', dy: -4 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="volume"
                stroke="#7c3aed"
                strokeWidth={2.5}
                fill="url(#gradVol)"
                dot={false}
                activeDot={{ r: 5, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {logistica.loading && <div className="flex justify-center py-16"><Spinner /></div>}
      {!logistica.loading && logistica.error && (
        <p className="text-center text-red-500 py-12">{logistica.error}</p>
      )}

      {d && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <VDKpiCard
              label="Volume Total"
              value={fmt(d.kpis.volume)}
              sub="unidades entregues"
              accent="violet"
              icon={CubeIcon}
              delta={volDelta}
            />
            <VDKpiCard
              label="Pedidos"
              value={fmt(d.kpis.pedidos)}
              sub="pedidos unicos"
              accent="blue"
              icon={TruckIcon}
            />
            <VDKpiCard
              label="Cidades Cobertas"
              value={fmt(d.kpis.cidades)}
              sub="alcance geografico"
              accent="emerald"
              icon={MapPinIcon}
            />
            <VDKpiCard
              label="Ticket Medio"
              value={brl(ticketMedio)}
              sub="receita / pedido"
              accent="amber"
              icon={CurrencyDollarIcon}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Tipo de Entrega */}
            {d.por_entrega.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Distribuicao por Tipo de Entrega</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={d.por_entrega}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={72}
                      dataKey="volume" nameKey="tipo"
                      paddingAngle={3}
                      startAngle={90} endAngle={-270}
                    >
                      {d.por_entrega.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [fmt(Number(v)), 'Volume (un)']}
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  {d.por_entrega.map((e, i) => {
                    const total = d.por_entrega.reduce((s, x) => s + x.volume, 0)
                    const pct = (e.volume / total * 100).toFixed(1)
                    return (
                      <div key={e.tipo} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{e.tipo || '—'}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
                          <span className="text-slate-400 w-16 text-right">{fmt(e.volume)} un</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Top Cidades */}
            {d.top_cidades.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Top {Math.min(d.top_cidades.length, 12)} Cidades por Volume
                </p>
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {d.top_cidades.slice(0, 12).map((c, i) => (
                    <div key={c.cidade} className="flex items-center gap-3">
                      <span className="w-5 text-[10px] text-slate-400 shrink-0 text-right font-medium">{i + 1}</span>
                      <p className="w-28 text-xs font-medium text-slate-600 dark:text-slate-400 truncate shrink-0">
                        {c.cidade || '—'}
                      </p>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-500 transition-all duration-500"
                          style={{ width: `${(c.volume / maxCidade * 100).toFixed(1)}%` }}
                        />
                      </div>
                      <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 w-14 text-right shrink-0">
                        {fmt(c.volume)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Performance por Estrutura */}
          {d.por_estrutura.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Performance por Estrutura</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="pb-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-8">#</th>
                      <th className="pb-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Estrutura</th>
                      <th className="pb-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Volume</th>
                      <th className="pb-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Pedidos</th>
                      <th className="pb-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Rec. Bruta</th>
                      <th className="pb-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Ticket Medio</th>
                      <th className="pb-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Part. %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {d.por_estrutura.map((e, idx) => {
                      const ticket = e.receita_bruta / (e.pedidos || 1)
                      const pct    = (e.volume / (d.kpis.volume || 1) * 100).toFixed(1)
                      const rbPct  = (e.receita_bruta / maxEst * 100).toFixed(1)
                      return (
                        <tr key={e.estrutura} className="hover:bg-violet-50/20 dark:hover:bg-violet-950/10 transition-colors">
                          <td className="py-3 text-[10px] text-slate-400 font-medium">{idx + 1}</td>
                          <td className="py-3 text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[180px]">
                            {e.estrutura || '—'}
                          </td>
                          <td className="py-3 text-right text-slate-600 dark:text-slate-400">{fmt(e.volume)}</td>
                          <td className="py-3 text-right text-slate-600 dark:text-slate-400">{fmt(e.pedidos)}</td>
                          <td className="py-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-bold text-violet-700 dark:text-violet-400">{brl(e.receita_bruta)}</span>
                              <div className="w-16 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div className="h-full rounded-full bg-violet-400 dark:bg-violet-600" style={{ width: `${rbPct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-right text-slate-500 dark:text-slate-400 hidden sm:table-cell">{brl(ticket)}</td>
                          <td className="py-3 text-right">
                            <span className="inline-flex items-center rounded-full bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-400">
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Volume por Marca */}
          {d.por_marca.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Volume por Marca</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <ResponsiveContainer width="100%" height={Math.min(200, d.por_marca.length * 40 + 20)}>
                  <BarChart data={d.por_marca} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => fmt(Number(v))} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="marca" tick={{ fontSize: 11 }} width={90} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => [fmt(Number(v)), 'Volume (un)']} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                      {d.por_marca.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-2.5">
                  {d.por_marca.map((m, i) => (
                    <div key={m.marca} className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="flex-1 text-xs text-slate-600 dark:text-slate-400 truncate">{m.marca}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden max-w-[80px]">
                        <div className="h-full rounded-full" style={{ width: `${(m.volume / maxMarca * 100).toFixed(1)}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-14 text-right shrink-0">{fmt(m.volume)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!logistica.loading && !logistica.error && !d && ciclosList.loading && (
        <div className="flex justify-center py-20"><Spinner /></div>
      )}
    </div>
  )
}
