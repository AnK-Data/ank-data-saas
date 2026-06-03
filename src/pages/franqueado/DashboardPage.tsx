import { useEffect, useState } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import { useLicense } from '../../hooks/useLicense'
import type { Loja } from '../../services/lojas.service'
import { supabase } from '../../lib/supabaseClient'

// ─── Tipos de filtro ──────────────────────────────────────────────────────────

type CanalFiltro  = 'todos' | 'Varejo' | 'Venda Direta'
type PeriodoFiltro = '7d' | '30d' | 'mes'

// ─── Componentes visuais ──────────────────────────────────────────────────────

function MetricCard({
  emoji, label, value, sub, trend, color = 'blue', locked = false,
}: {
  emoji: string; label: string; value?: string; sub?: string
  trend?: { dir: 'up' | 'down' | 'flat'; label: string }
  color?: 'blue' | 'violet' | 'emerald' | 'amber' | 'red' | 'slate'
  locked?: boolean
}) {
  const colors = {
    blue:    'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
    violet:  'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
    amber:   'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
    red:     'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400',
    slate:   'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  }

  return (
    <div className={`rounded-2xl border bg-white dark:bg-slate-900 p-5 flex flex-col gap-2
      ${locked ? 'border-dashed border-slate-200 dark:border-slate-700 opacity-75' : 'border-slate-200 dark:border-slate-700'}`}>
      <div className={`inline-flex w-fit rounded-xl px-2.5 py-1.5 text-base ${colors[color]}`}>
        {emoji}
      </div>
      {locked ? (
        <div className="space-y-1.5">
          <div className="h-6 w-20 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          <p className="text-sm text-slate-400 dark:text-slate-500">{label}</p>
          <p className="text-[10px] text-slate-300 dark:text-slate-600">Aguardando dados</p>
        </div>
      ) : (
        <div>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{value ?? '—'}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
          {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
          {trend && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-1.5 rounded-full px-2 py-0.5
              ${trend.dir === 'up' ? 'bg-emerald-50 text-emerald-600' : trend.dir === 'down' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
              {trend.dir === 'up' ? '↑' : trend.dir === 'down' ? '↓' : '→'} {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      {sub && <span className="text-xs text-slate-400 dark:text-slate-500">{sub}</span>}
    </div>
  )
}

// Barra comparativa simples (sem biblioteca)
function ComparBar({ labelA, labelB, valA = 0, valB = 0, colorA = 'bg-blue-500', colorB = 'bg-violet-500' }: {
  labelA: string; labelB: string; valA?: number; valB?: number
  colorA?: string; colorB?: string
}) {
  const total = valA + valB
  const pctA  = total > 0 ? (valA / total) * 100 : 50
  const pctB  = 100 - pctA
  return (
    <div className="space-y-2">
      <div className="flex rounded-full overflow-hidden h-3 bg-slate-100 dark:bg-slate-800">
        <div className={`${colorA} transition-all duration-700`} style={{ width: `${pctA}%` }} />
        <div className={`${colorB} transition-all duration-700`} style={{ width: `${pctB}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-medium">
        <span className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${colorA}`}/>{labelA} {total > 0 ? `${pctA.toFixed(0)}%` : ''}</span>
        <span className="flex items-center gap-1">{labelB} {total > 0 ? `${pctB.toFixed(0)}%` : ''}<span className={`h-2 w-2 rounded-full ${colorB}`}/></span>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function FranqueadoDashboardPage() {
  const { profile } = useAuth()
  const { license } = useLicense()
  const tenantId = profile?.tenant_id ?? ''

  const [canal, setCanal]         = useState<CanalFiltro>('todos')
  const [lojaFiltro, setLojaFiltro] = useState('')
  const [periodo, setPeriodo]     = useState<PeriodoFiltro>('30d')
  const [lojas, setLojas]         = useState<Loja[]>([])
  const [uploads, setUploads]     = useState(0)
  const [ultimoUpload, setUltimoUpload] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) return
    Promise.all([
      supabase.from('lojas').select('*').eq('tenant_id', tenantId).eq('ativo', true).order('nome'),
      supabase.from('upload_logs').select('data_upload').eq('tenant_id', tenantId).order('data_upload', { ascending: false }).limit(1),
      supabase.from('upload_logs').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    ]).then(([lojasRes, lastRes, countRes]) => {
      setLojas((lojasRes.data ?? []) as Loja[])
      setUltimoUpload(lastRes.data?.[0]?.data_upload ?? null)
      setUploads(countRes.count ?? 0)
    })
  }, [tenantId])

  const diasLicenca = license ? differenceInDays(parseISO(license.data_fim_ciclo), new Date()) : null
  const diasUpload  = ultimoUpload ? differenceInDays(new Date(), parseISO(ultimoUpload)) : null
  const hasData     = uploads > 0

  const lojasVarejo = lojas.filter(l => l.canal === 'Varejo' || l.canal === 'Híbrido').length
  const lojasVD     = lojas.filter(l => l.canal === 'Venda Direta' || l.canal === 'Híbrido').length

  return (
    <div className="space-y-6">

      {/* ── Barra de filtros ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl
        border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">

        {/* Canal */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {([
            ['todos',        '🌐 Todos canais'],
            ['Varejo',       '🏪 Varejo'],
            ['Venda Direta', '🚀 Venda Direta'],
          ] as [CanalFiltro, string][]).map(([val, lbl]) => (
            <button key={val} onClick={() => setCanal(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${canal === val
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Loja */}
        <div className="flex items-center gap-1.5">
          <BuildingStorefrontIcon className="h-4 w-4 text-slate-400" />
          <select value={lojaFiltro} onChange={e => setLojaFiltro(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100 px-3 py-1.5 text-xs focus:border-ank-400 focus:outline-none">
            <option value="">Todas as lojas</option>
            {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>

        {/* Período */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 ml-auto">
          {([['7d','7 dias'],['30d','30 dias'],['mes','Este mês']] as [PeriodoFiltro,string][]).map(([v,l]) => (
            <button key={v} onClick={() => setPeriodo(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${periodo === v ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPIs principais ────────────────────────────────────────── */}
      <div>
        <SectionTitle title="Resumo Comercial" sub={`· ${periodo === '7d' ? 'últimos 7 dias' : periodo === '30d' ? 'últimos 30 dias' : 'este mês'}`} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <MetricCard emoji="💰" label="Faturamento Total"  color="emerald" locked={!hasData} />
          <MetricCard emoji="📦" label="Pedidos"            color="blue"    locked={!hasData} />
          <MetricCard emoji="🎯" label="Ticket Médio"       color="violet"  locked={!hasData} />
          <MetricCard emoji="📊" label="PA Médio"           color="amber"   locked={!hasData}
            sub="Peças por atendimento" />
          <MetricCard emoji="📈" label="Conversão"          color="slate"   locked={!hasData} />
        </div>
      </div>

      {/* ── Varejo vs Venda Direta ──────────────────────────────────── */}
      {(canal === 'todos' || canal === 'Varejo' || canal === 'Venda Direta') && (
        <div>
          <SectionTitle title="Varejo vs Venda Direta" sub="· Comparativo de canais" />
          <div className={`grid gap-4 ${canal === 'todos' ? 'lg:grid-cols-2' : 'max-w-xl'}`}>

            {/* Varejo */}
            {(canal === 'todos' || canal === 'Varejo') && (
              <div className="rounded-2xl border-2 border-blue-100 dark:border-blue-900 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏪</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Varejo</h3>
                      <p className="text-[10px] text-slate-400">{lojasVarejo} loja{lojasVarejo !== 1 ? 's' : ''} ativa{lojasVarejo !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs font-semibold px-2.5 py-1 ring-1 ring-inset ring-blue-200 dark:ring-blue-800">
                    {uploads} upload{uploads !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { emoji: '💰', label: 'Faturamento' },
                    { emoji: '📦', label: 'Pedidos'     },
                    { emoji: '🎯', label: 'Ticket Médio'},
                    { emoji: '📊', label: 'PA'          },
                  ].map(k => (
                    <div key={k.label} className="rounded-xl bg-blue-50/60 dark:bg-blue-950/20 p-3">
                      <p className="text-base mb-0.5">{k.emoji}</p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-200">—</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{k.label}</p>
                    </div>
                  ))}
                </div>
                {!hasData && (
                  <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-[10px] text-amber-600 dark:text-amber-400">
                    ⚡ Envie arquivos de vendas para ver os indicadores deste canal
                  </div>
                )}
              </div>
            )}

            {/* Venda Direta */}
            {(canal === 'todos' || canal === 'Venda Direta') && (
              <div className="rounded-2xl border-2 border-violet-100 dark:border-violet-900 bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🚀</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Venda Direta</h3>
                      <p className="text-[10px] text-slate-400">{lojasVD} loja{lojasVD !== 1 ? 's' : ''} ativa{lojasVD !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 text-xs font-semibold px-2.5 py-1 ring-1 ring-inset ring-violet-200 dark:ring-violet-800">
                    0 uploads
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { emoji: '💰', label: 'Faturamento' },
                    { emoji: '📦', label: 'Pedidos'     },
                    { emoji: '🎯', label: 'Ticket Médio'},
                    { emoji: '📊', label: 'PA'          },
                  ].map(k => (
                    <div key={k.label} className="rounded-xl bg-violet-50/60 dark:bg-violet-950/20 p-3">
                      <p className="text-base mb-0.5">{k.emoji}</p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-200">—</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{k.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-[10px] text-slate-500 dark:text-slate-400">
                  Nenhum arquivo de Venda Direta enviado ainda
                </div>
              </div>
            )}
          </div>

          {/* Comparativo visual (apenas quando ambos visíveis) */}
          {canal === 'todos' && (
            <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Distribuição do Faturamento por Canal
              </p>
              <ComparBar labelA="Varejo" labelB="Venda Direta" valA={0} valB={0}
                colorA="bg-blue-500" colorB="bg-violet-500" />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-center">
                Disponível após o processamento dos arquivos de vendas
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Performance por loja ────────────────────────────────────── */}
      <div>
        <SectionTitle title="Performance por Loja" sub="· Ranking de faturamento" />
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          {lojas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-6">
              <span className="text-3xl mb-3">🏪</span>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nenhuma loja cadastrada</p>
              <p className="text-xs text-slate-400 mt-1">
                Cadastre suas lojas em <strong>Configuração → Lojas</strong>
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/60 dark:border-slate-700">
                <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-6 py-3">Loja</th>
                  <th className="px-6 py-3">Canal</th>
                  <th className="px-6 py-3 text-right">Faturamento</th>
                  <th className="px-6 py-3 text-right">Pedidos</th>
                  <th className="px-6 py-3 text-right">Ticket Médio</th>
                  <th className="px-6 py-3 text-right">PA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 dark:divide-slate-800">
                {lojas.map((loja, i) => (
                  <tr key={loja.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                          bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{loja.nome}</p>
                          {loja.codigo_pdv && (
                            <p className="text-[10px] font-mono text-slate-400">{loja.codigo_pdv}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset
                        ${loja.canal === 'Varejo' ? 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:ring-blue-800'
                          : loja.canal === 'Venda Direta' ? 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:ring-violet-800'
                          : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800'}`}>
                        {loja.canal}
                      </span>
                    </td>
                    {['—', '—', '—', '—'].map((v, j) => (
                      <td key={j} className="px-6 py-3.5 text-right text-slate-400 dark:text-slate-500 text-sm font-mono">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {lojas.length > 0 && (
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                ⚡ Dados disponíveis após o processamento dos arquivos de vendas · AnK Data Insights
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Indicadores de Saúde ────────────────────────────────────── */}
      <div>
        <SectionTitle title="Saúde do Negócio" sub="· Indicadores operacionais" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard emoji="📅" label="Dias de Licença"
            value={diasLicenca !== null ? `${diasLicenca}d` : '—'}
            color={diasLicenca !== null && diasLicenca <= 30 ? 'red' : 'emerald'}
            sub={license?.status} />
          <MetricCard emoji="📤" label="Total de Uploads"
            value={String(uploads)} color="blue"
            sub="desde o início" />
          <MetricCard emoji="⏱️" label="Dias sem Upload"
            value={diasUpload !== null ? `${diasUpload}d` : '—'}
            color={diasUpload !== null && diasUpload > 7 ? 'red' : 'emerald'}
            sub={diasUpload !== null && diasUpload > 7 ? 'Atenção!' : 'Em dia'} />
          <MetricCard emoji="🏪" label="Lojas Ativas"
            value={String(lojas.length)} color="slate"
            sub={`${lojasVarejo} Varejo · ${lojasVD} VD`} />
        </div>
      </div>

    </div>
  )
}
