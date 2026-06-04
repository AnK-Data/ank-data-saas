import { useEffect, useState, useCallback } from 'react'
import { parseISO, differenceInDays } from 'date-fns'
import {
  MagnifyingGlassIcon, TableCellsIcon, ViewColumnsIcon,
  ArrowPathIcon, PencilSquareIcon, ArrowTopRightOnSquareIcon,
  DocumentArrowDownIcon, PlusIcon,
} from '@heroicons/react/24/outline'
import { gerarOrcamentoPDF } from './gerarOrcamento'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import ClienteModal from './ClienteModal'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Situacao  = 'trial' | 'negociacao' | 'vigente' | 'cancelado' | 'suspenso'
export type Score     = 'risco' | 'atencao' | 'normal' | 'otimo'
export type ViewMode  = 'tabela' | 'kanban'

export interface Cliente {
  id: string
  nome_franquia: string
  codigo_cp: string | null
  plano: string | null
  mrr: number | null
  situacao: Situacao
  trial_end: string | null
  implantacao: number
  score: Score
  responsavel: string | null
  obs: string | null
  ativo: boolean
  created_at: string
  google_drive_folder_id?: string | null
  // Módulos e financeiro
  modulos_ids?: string[]
  desconto?: number
  desconto_setup?: number
  setup_total?: number
  // computed
  last_upload?: string | null
  n_usuarios?: number
  n_lojas?: number
  license_status?: string | null
  license_fim?: string | null
}

// ─── Config visual ────────────────────────────────────────────────────────────

export const SCORE_CONFIG: Record<Score, { label: string; dot: string; badge: string }> = {
  risco:   { label: 'Risco',   dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700 ring-red-200'         },
  atencao: { label: 'Atenção', dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 ring-amber-200'   },
  normal:  { label: 'Normal',  dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-600 ring-slate-200'   },
  otimo:   { label: 'Ótimo',   dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
}

export const SITUACAO_CONFIG: Record<Situacao, { label: string; badge: string }> = {
  trial:       { label: 'Em teste',    badge: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-400'               },
  negociacao:  { label: 'Negociação',  badge: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/30 dark:text-violet-400'     },
  vigente:     { label: 'Vigente',     badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400' },
  cancelado:   { label: 'Cancelado',   badge: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-400'                    },
  suspenso:    { label: 'Suspenso',    badge: 'bg-slate-100 text-slate-600 ring-slate-300 dark:bg-slate-800 dark:text-slate-400'             },
}

type FiltroSituacao = 'todos' | Situacao

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ClientesListPage() {
  const [clientes, setClientes]     = useState<Cliente[]>([])
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState<ViewMode>('tabela')
  const [search, setSearch]         = useState('')
  const [filtro, setFiltro]         = useState<FiltroSituacao>('todos')
  const [editing, setEditing]       = useState<Cliente | null>(null)
  const [creating, setCreating]     = useState(false)

  const fetchClientes = useCallback(async () => {
    // Usa RPC SECURITY DEFINER para bypassar RLS (mesma abordagem de Usuários das Empresas)
    const { data, error } = await supabase.rpc('get_tenants_for_admin')

    if (error) {
      console.warn('[ClientesLista] RPC error:', error.message)
      // Fallback: tenta query direta
      const { data: fallback } = await supabase
        .from('tenants')
        .select('*')
        .order('nome_franquia')
      if (fallback) setClientes(fallback as Cliente[])
    } else {
      setClientes((data ?? []) as Cliente[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  const filtered = clientes.filter(c => {
    if (filtro !== 'todos' && c.situacao !== filtro) return false
    if (search) {
      const s = search.toLowerCase()
      if (!c.nome_franquia.toLowerCase().includes(s) &&
          !(c.codigo_cp ?? '').toLowerCase().includes(s) &&
          !(c.responsavel ?? '').toLowerCase().includes(s)) return false
    }
    return true
  })

  // Contagens para os filtros
  const counts = {
    todos:     clientes.length,
    trial:     clientes.filter(c => c.situacao === 'trial').length,
    vigente:   clientes.filter(c => c.situacao === 'vigente').length,
    cancelado: clientes.filter(c => c.situacao === 'cancelado').length,
    suspenso:  clientes.filter(c => c.situacao === 'suspenso').length,
  }

  const mrrTotal = clientes
    .filter(c => c.situacao === 'vigente' && c.mrr)
    .reduce((acc, c) => acc + (c.mrr ?? 0), 0)

  if (loading) return <Spinner fullScreen />

  return (
    <>
      <div className="space-y-5">

        {/* ── Stats ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total de Clientes',  value: clientes.length,             color: 'text-slate-800 dark:text-slate-100' },
            { label: 'Em Trial',           value: counts.trial,                color: 'text-blue-600'   },
            { label: 'Vigentes',           value: counts.vigente,              color: 'text-emerald-600'},
            { label: 'Receita Mensal Total',
              value: `R$ ${mrrTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
              color: 'text-violet-600' },
          ].map(s => (
            <Card key={s.label}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* ── Filtros + busca + view ─────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Tabs de situação */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {([
              ['todos',     `Todos ${counts.todos}`],
              ['trial',     `Em teste ${counts.trial}`],
              ['vigente',   `Vigentes ${counts.vigente}`],
              ['cancelado', `Cancelados ${counts.cancelado}`],
            ] as [FiltroSituacao, string][]).map(([val, lbl]) => (
              <button key={val} onClick={() => setFiltro(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${filtro === val
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar empresa ou código CP…"
              className="block w-full rounded-xl border border-slate-200 dark:border-slate-600
                bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100
                placeholder:text-slate-400 focus:border-ank-400 focus:outline-none" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Atualizar */}
            <button onClick={() => { setLoading(true); fetchClientes() }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700
                text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800 transition-colors">
              <ArrowPathIcon className="h-4 w-4" />
            </button>

            {/* Toggle view */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              {([['tabela', TableCellsIcon], ['kanban', ViewColumnsIcon]] as const).map(([v, Icon]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${view === v ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>

            {/* Novo cliente */}
            <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />}
              onClick={() => setCreating(true)}>
              Novo Cliente
            </Button>
          </div>
        </div>

        {/* ── Conteúdo ──────────────────────────────────────────── */}
        {view === 'tabela'
          ? <TabelaView clientes={filtered} onEdit={setEditing} onRefresh={fetchClientes} />
          : <KanbanView clientes={filtered} onEdit={setEditing} onRefresh={fetchClientes} />
        }
      </div>

      {/* Modais */}
      {(creating || editing) && (
        <ClienteModal
          open
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={async () => { setCreating(false); setEditing(null); setLoading(true); await fetchClientes() }}
        />
      )}
    </>
  )
}

// ─── Visão Tabela ─────────────────────────────────────────────────────────────

function TabelaView({ clientes, onEdit, onRefresh }: {
  clientes: Cliente[]
  onEdit: (c: Cliente) => void
  onRefresh: () => void
}) {
  async function updateScore(id: string, score: Score) {
    await supabase.from('tenants').update({ score }).eq('id', id)
    toast.success('Score atualizado.')
    onRefresh()
  }

  return (
    <Card padding={false}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-amber-50/60 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/60 dark:border-slate-700">
            <tr className="text-left text-xs font-semibold text-slate-600 dark:text-slate-400">
              <th className="px-5 py-3">Empresa</th>
              <th className="px-5 py-3">Score</th>
              <th className="px-5 py-3">Implantação</th>
              <th className="px-5 py-3">Trial</th>
              <th className="px-5 py-3">Módulos</th>
              <th className="px-5 py-3">R/mês</th>
              <th className="px-5 py-3">Situação</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 dark:divide-slate-800">
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                  Nenhuma empresa encontrada.
                </td>
              </tr>
            ) : clientes.map(c => {
              const sitCfg   = SITUACAO_CONFIG[c.situacao]  ?? SITUACAO_CONFIG.trial
              const scoreCfg = SCORE_CONFIG[c.score ?? 'normal'] ?? SCORE_CONFIG.normal
              const trialDias = c.trial_end
                ? differenceInDays(parseISO(c.trial_end), new Date())
                : null

              return (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800/50 transition-colors group">

                  {/* Empresa */}
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{c.nome_franquia}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{c.codigo_cp ?? '—'}</p>
                    </div>
                  </td>

                  {/* Score */}
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => {
                        const scores: Score[] = ['risco', 'atencao', 'normal', 'otimo']
                        const idx = scores.indexOf(c.score ?? 'normal')
                        updateScore(c.id, scores[(idx + 1) % scores.length])
                      }}
                      className="flex items-center gap-1.5 group/score"
                      title="Clique para alterar o score"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${scoreCfg.dot}`} />
                      <span className={`text-xs font-medium ${scoreCfg.dot.replace('bg-', 'text-').replace('-500', '-700').replace('-400', '-600')}`}>
                        {scoreCfg.label}
                      </span>
                    </button>
                  </td>

                  {/* Implantação */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-ank-500 rounded-full transition-all"
                          style={{ width: `${c.implantacao ?? 0}%` }} />
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400">{c.implantacao ?? 0}%</span>
                    </div>
                  </td>

                  {/* Trial */}
                  <td className="px-5 py-3.5">
                    {c.trial_end ? (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset
                        ${trialDias !== null && trialDias < 0
                          ? 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-400'
                          : trialDias !== null && trialDias <= 7
                            ? 'bg-amber-50 text-amber-700 ring-amber-200'
                            : 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-400'
                        }`}>
                        {trialDias !== null && trialDias < 0
                          ? 'vencido'
                          : trialDias !== null ? `${trialDias}d` : '—'}
                      </span>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>

                  {/* Plano */}
                  <td className="px-5 py-3.5 text-sm text-slate-600 dark:text-slate-400">
                    {c.plano ?? '—'}
                  </td>

                  {/* MRR */}
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {c.mrr
                      ? `R$ ${c.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`
                      : <span className="text-slate-400">—</span>}
                  </td>

                  {/* Situação */}
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${sitCfg.badge}`}>
                      {sitCfg.label}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(c)} title="Editar"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-ank-600 hover:bg-ank-50 dark:hover:bg-ank-950/30 transition-colors">
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button title="Gerar orçamento PDF"
                        onClick={async () => {
                          if (!c.modulos_ids?.length) {
                            toast('Selecione os módulos editando o cliente primeiro.', { icon: '💡' })
                            onEdit(c); return
                          }
                          // Busca detalhes dos módulos
                          const { data: mods } = await supabase
                            .from('planos_catalogo')
                            .select('id, nome, preco_mensal, preco_setup')
                            .in('id', c.modulos_ids)
                          const modulos = (mods ?? []) as { id: string; nome: string; preco_mensal: number | null; preco_setup: number | null }[]
                          const subtotalMensal = modulos.reduce((s, m) => s + (m.preco_mensal ?? 0), 0)
                          const subtotalSetup  = modulos.reduce((s, m) => s + (m.preco_setup ?? 0), 0)
                          const desc    = c.desconto ?? 0
                          const descSet = c.desconto_setup ?? 0
                          gerarOrcamentoPDF({
                            nomeFranquia: c.nome_franquia,
                            codigoCp: c.codigo_cp ?? undefined,
                            responsavel: c.responsavel ?? undefined,
                            modulos,
                            subtotalMensal,
                            descontoMensal: desc,
                            mensalidadeFinal: Math.max(0, subtotalMensal - desc),
                            subtotalSetup,
                            descontoSetup: descSet,
                            setupFinal: Math.max(0, subtotalSetup - descSet),
                          })
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors">
                        <DocumentArrowDownIcon className="h-4 w-4" />
                      </button>
                      <button title="Ver painel"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ─── Visão Kanban ─────────────────────────────────────────────────────────────

const KANBAN_COLS: { id: Situacao; label: string; color: string }[] = [
  { id: 'trial',     label: 'Em Trial',  color: 'border-blue-400'    },
  { id: 'vigente',   label: 'Vigente',   color: 'border-emerald-500' },
  { id: 'suspenso',  label: 'Suspenso',  color: 'border-amber-400'   },
  { id: 'cancelado', label: 'Cancelado', color: 'border-red-400'     },
]

function KanbanView({ clientes, onEdit, onRefresh }: {
  clientes: Cliente[]
  onEdit: (c: Cliente) => void
  onRefresh: () => void
}) {
  async function handleDrop(e: React.DragEvent, situacao: Situacao) {
    const id = e.dataTransfer.getData('clienteId')
    if (!id) return
    await supabase.from('tenants').update({ situacao }).eq('id', id)
    toast.success('Cliente movido!')
    onRefresh()
  }

  return (
    <div className="grid grid-cols-4 gap-4 items-start">
      {KANBAN_COLS.map(col => {
        const items = clientes.filter(c => c.situacao === col.id)
        return (
          <div key={col.id}
            className={`rounded-2xl border-t-4 ${col.color} bg-slate-50 dark:bg-slate-900
              border border-slate-200 dark:border-slate-700 min-h-[200px]`}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, col.id)}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {col.label}
                </p>
                <span className="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-700
                  dark:text-slate-400 rounded-full px-2 py-0.5">
                  {items.length}
                </span>
              </div>
            </div>

            <div className="p-3 space-y-2">
              {items.map(c => {
                const scoreCfg = SCORE_CONFIG[c.score ?? 'normal'] ?? SCORE_CONFIG.normal
                return (
                  <div key={c.id}
                    draggable
                    onDragStart={e => e.dataTransfer.setData('clienteId', c.id)}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700
                      p-3.5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {c.nome_franquia}
                      </p>
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1 ${scoreCfg.dot}`} title={scoreCfg.label} />
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {c.plano && (
                        <span className="text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-2 py-0.5">
                          {c.plano}
                        </span>
                      )}
                      {c.mrr && (
                        <span className="text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-full px-2 py-0.5">
                          R$ {c.mrr.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>

                    {c.implantacao !== undefined && c.implantacao > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-ank-500 rounded-full" style={{ width: `${c.implantacao}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400">{c.implantacao}%</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      {c.codigo_cp && (
                        <span className="text-[10px] font-mono text-slate-400">CP: {c.codigo_cp}</span>
                      )}
                      <button onClick={() => onEdit(c)}
                        className="ml-auto p-1 rounded text-slate-400 hover:text-ank-600 transition-colors">
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {items.length === 0 && (
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-6">
                  Arraste um cliente aqui
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
