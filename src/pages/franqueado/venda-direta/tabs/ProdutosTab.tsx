import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import Spinner from '../../../../components/ui/Spinner'

interface ProdutosData {
  por_secao:   Array<{ secao: string; receita_bruta: number; volume: number }>
  por_marca:   Array<{ marca: string; receita_bruta: number; volume: number }>
  por_meio:    Array<{ meio: string; receita_bruta: number; pedidos: number }>
  por_entrega: Array<{ tipo: string; receita_bruta: number }>
}

interface Props {
  data: ProdutosData | null
  loading: boolean
  error: string | null
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function fmt(v: number) { return v.toLocaleString('pt-BR') }

const PIE_COLORS = ['#7c3aed', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#6366f1']
const BAR_COLORS = ['#7c3aed', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626']

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p>
      {children}
    </div>
  )
}

function ColoredBars({ items, labelKey, valueKey, formatter }: {
  items: Record<string, unknown>[]
  labelKey: string
  valueKey: string
  formatter: (v: number) => string
}) {
  const max = (items[0]?.[valueKey] as number) || 1
  const total = items.reduce((s, i) => s + (i[valueKey] as number), 0)
  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((item, i) => {
        const v    = item[valueKey] as number
        const pct  = (v / total * 100).toFixed(1)
        const wpct = (v / max * 100).toFixed(1)
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate max-w-[160px]">
                {String(item[labelKey] || '—')}
              </span>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{pct}%</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{formatter(v)}</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${wpct}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function ProdutosTab({ data, loading, error }: Props) {
  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (error)   return <p className="text-center text-red-500 py-12">{error}</p>
  if (!data)   return null

  return (
    <div className="space-y-6">

      {/* Secao + Marca */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <SectionCard title="Receita por Secao">
          {data.por_secao.length === 0
            ? <p className="text-xs text-slate-400 py-4 text-center">Sem dados</p>
            : <ColoredBars items={data.por_secao as Record<string, unknown>[]} labelKey="secao" valueKey="receita_bruta" formatter={brl} />
          }
        </SectionCard>

        <SectionCard title="Mix por Marca">
          {data.por_marca.length === 0
            ? <p className="text-xs text-slate-400 py-4 text-center">Sem dados</p>
            : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={data.por_marca.slice(0, 8)}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={72}
                      dataKey="receita_bruta" nameKey="marca"
                      paddingAngle={2}
                      startAngle={90} endAngle={-270}
                    >
                      {data.por_marca.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [brl(Number(v ?? 0)), 'Rec. Bruta']} contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {data.por_marca.slice(0, 8).map(({ marca, receita_bruta }, i) => {
                    const total = data.por_marca.reduce((s, m) => s + m.receita_bruta, 0)
                    return (
                      <div key={marca} className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="flex-1 text-slate-600 dark:text-slate-400 truncate">{marca}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{(receita_bruta / total * 100).toFixed(0)}%</span>
                        <span className="text-slate-400 w-20 text-right">{brl(receita_bruta)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }
        </SectionCard>
      </div>

      {/* Meio captacao + Entrega */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <SectionCard title="Captacao de Pedidos por Canal">
          {data.por_meio.length === 0
            ? <p className="text-xs text-slate-400 py-4 text-center">Sem dados</p>
            : (
              <div className="space-y-4">
                <ColoredBars items={data.por_meio as Record<string, unknown>[]} labelKey="meio" valueKey="receita_bruta" formatter={brl} />
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data.por_meio.slice(0, 6)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                      <XAxis dataKey="meio" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={40} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={v => fmt(Number(v))} width={36} />
                      <Tooltip formatter={(v) => [fmt(Number(v)), 'Pedidos']} contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                      <Bar dataKey="pedidos" radius={[4, 4, 0, 0]}>
                        {data.por_meio.slice(0, 6).map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          }
        </SectionCard>

        <SectionCard title="Receita por Tipo de Entrega">
          {data.por_entrega.length === 0
            ? <p className="text-xs text-slate-400 py-4 text-center">Sem dados</p>
            : (
              <div className="space-y-4">
                <ColoredBars items={data.por_entrega as Record<string, unknown>[]} labelKey="tipo" valueKey="receita_bruta" formatter={brl} />
                {data.por_entrega.length > 1 && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={data.por_entrega}
                          cx="50%" cy="50%"
                          innerRadius={40} outerRadius={65}
                          dataKey="receita_bruta" nameKey="tipo"
                          paddingAngle={3}
                          label={({ name, percent }) =>
                            (percent ?? 0) > 0.08 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ''
                          }
                          labelLine={false}
                        >
                          {data.por_entrega.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [brl(Number(v ?? 0)), 'Rec. Bruta']} contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )
          }
        </SectionCard>

      </div>
    </div>
  )
}
