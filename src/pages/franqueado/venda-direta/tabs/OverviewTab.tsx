import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, ReferenceLine,
} from 'recharts'
import {
  BanknotesIcon, CurrencyDollarIcon, CubeIcon,
  ShoppingCartIcon, UsersIcon,
} from '@heroicons/react/24/outline'
import VDKpiCard from '../components/VDKpiCard'
import Spinner from '../../../../components/ui/Spinner'

interface OverviewData {
  kpis: { receita_bruta: number; receita_liquida: number; volume: number; pedidos: number; revendedoras_ativas: number }
  por_marca: Array<{ marca: string; receita_bruta: number; pct: number }>
  por_meio_captacao: Array<{ meio: string; receita_bruta: number }>
}

type CicloItem = { ciclo: string; receita_bruta: number; receita_liquida: number; volume: number }

interface Props {
  data: OverviewData | null
  loading: boolean
  error: string | null
  ciclosData: CicloItem[]
  selectedCiclo?: string
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function fmt(v: number) { return v.toLocaleString('pt-BR') }

const PIE_COLORS = ['#7c3aed', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777']

function calcDelta(curr: number, prev: number | undefined): number | null {
  if (!prev || prev === 0) return null
  return (curr - prev) / prev * 100
}

function CustomTooltipTrend({ active, payload, label }: Record<string, unknown>) {
  if (!active || !payload || !(payload as unknown[]).length) return null
  const d = (payload as Array<{ value: number }>)[0]
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{String(label)}</p>
      <p className="text-violet-600 dark:text-violet-400 font-bold">{brl(d.value)}</p>
    </div>
  )
}

export default function OverviewTab({ data, loading, error, ciclosData, selectedCiclo }: Props) {
  const cicloIdx  = ciclosData.findIndex(c => c.ciclo === selectedCiclo)
  const prevCiclo = cicloIdx > 0 ? ciclosData[cicloIdx - 1] : null

  const rbDelta  = (data && prevCiclo) ? calcDelta(data.kpis.receita_bruta,       prevCiclo.receita_bruta)    : null
  const rlDelta  = (data && prevCiclo) ? calcDelta(data.kpis.receita_liquida,     prevCiclo.receita_liquida)  : null
  const volDelta = (data && prevCiclo) ? calcDelta(data.kpis.volume,              prevCiclo.volume)           : null

  const maxMeio = data?.por_meio_captacao[0]?.receita_bruta || 1
  const totalMeio = data?.por_meio_captacao.reduce((s, m) => s + m.receita_bruta, 0) || 1

  return (
    <div className="space-y-6">

      {/* Grafico de tendencia de Receita Bruta — carrega imediatamente */}
      {ciclosData.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Receita Bruta — Historico de Ciclos</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {ciclosData.length} ciclos · {ciclosData[0]?.ciclo} — {ciclosData[ciclosData.length - 1]?.ciclo}
              </p>
            </div>
            {selectedCiclo && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-400">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 inline-block" />
                Ciclo {selectedCiclo}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={ciclosData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradRB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}    />
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
                tickFormatter={v => `R$${(Number(v) / 1000).toFixed(0)}k`}
                tick={{ fontSize: 10, fill: 'currentColor' }}
                width={52}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltipTrend />} />
              {selectedCiclo && (
                <ReferenceLine
                  x={selectedCiclo}
                  stroke="#7c3aed"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  label={{ value: selectedCiclo, position: 'insideTopRight', fontSize: 9, fill: '#7c3aed', dy: -4 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="receita_bruta"
                stroke="#7c3aed"
                strokeWidth={2.5}
                fill="url(#gradRB)"
                dot={false}
                activeDot={{ r: 5, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {loading && <div className="flex justify-center py-16"><Spinner /></div>}
      {!loading && error && <p className="text-center text-red-500 py-12">{error}</p>}
      {!loading && !error && !data && ciclosData.length === 0 && <div className="flex justify-center py-16"><Spinner /></div>}

      {data && (
        <>
          {/* KPIs com delta vs ciclo anterior */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <VDKpiCard
              label="Receita Bruta"
              value={brl(data.kpis.receita_bruta)}
              accent="violet"
              icon={BanknotesIcon}
              delta={rbDelta}
              sub={prevCiclo ? `ant. ${brl(prevCiclo.receita_bruta)}` : undefined}
            />
            <VDKpiCard
              label="Receita Liquida"
              value={brl(data.kpis.receita_liquida)}
              accent="emerald"
              icon={CurrencyDollarIcon}
              delta={rlDelta}
            />
            <VDKpiCard
              label="Volume"
              value={fmt(data.kpis.volume)}
              sub="unidades"
              accent="blue"
              icon={CubeIcon}
              delta={volDelta}
            />
            <VDKpiCard
              label="Pedidos"
              value={fmt(data.kpis.pedidos)}
              accent="amber"
              icon={ShoppingCartIcon}
            />
            <VDKpiCard
              label="Revendedoras"
              value={fmt(data.kpis.revendedoras_ativas)}
              sub="ativas no ciclo"
              accent="rose"
              icon={UsersIcon}
            />
          </div>

          {/* Marca + Meio */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Mix por Marca */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
              <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Mix por Marca</p>
              {data.por_marca.length === 0
                ? <p className="text-xs text-slate-400 py-8 text-center">Sem dados</p>
                : (
                  <div className="flex flex-col gap-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={data.por_marca}
                          cx="50%" cy="50%"
                          innerRadius={55} outerRadius={80}
                          dataKey="receita_bruta" nameKey="marca"
                          paddingAngle={2}
                          startAngle={90} endAngle={-270}
                        >
                          {data.por_marca.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => [brl(Number(v ?? 0)), 'Rec. Bruta']}
                          contentStyle={{ borderRadius: 12, fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {data.por_marca.map(({ marca, receita_bruta, pct }, i) => (
                        <div key={marca} className="flex items-center gap-2.5 text-xs">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="flex-1 text-slate-600 dark:text-slate-400 truncate">{marca}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">{pct}%</span>
                          <span className="text-slate-400 shrink-0 w-20 text-right">{brl(receita_bruta)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }
            </div>

            {/* Meio de Captacao */}
            {data.por_meio_captacao.length > 0 && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Meio de Captacao</p>
                <div className="space-y-3">
                  {data.por_meio_captacao.map(({ meio, receita_bruta }, i) => {
                    const pct = (receita_bruta / totalMeio * 100).toFixed(1)
                    const colors = ['#7c3aed', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626']
                    return (
                      <div key={meio}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate max-w-[160px]">{meio || '—'}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{pct}%</span>
                            <span className="text-[10px] text-slate-400">{brl(receita_bruta)}</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(receita_bruta / maxMeio * 100).toFixed(1)}%`,
                              background: colors[i % colors.length],
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
