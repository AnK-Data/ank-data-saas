import { useEffect, useState, useCallback } from 'react'
import {
  FlagIcon, PlusIcon, ArrowUpTrayIcon, ArrowDownTrayIcon,
  PencilSquareIcon, TrashIcon, FunnelIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { MetasService } from '../../services/metas.service'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import MetaFormModal from './MetaFormModal'
import MetaImportModal from './MetaImportModal'
import type { Meta, MetaFilters } from '../../types'
import { CICLO_MES, MESES_LABELS, MARCAS_BOTICARIO } from '../../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ANO_ATUAL = new Date().getFullYear()
const CICLOS = Array.from({ length: 17 }, (_, i) => i + 1)
const CANAL_OPTS = ['LOJA', 'VD'] as const

const brl = (v: number | null | undefined) =>
  v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'

const pct = (v: number | null | undefined) =>
  v != null ? `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—'

function exportCSV(rows: Meta[]) {
  const cols: (keyof Meta)[] = [
    'ciclo_key','ano','ciclo','mes','cod_pdv','cod_cp','nome_cp','canal','marca',
    'gmv','rpa','base_total','atividade_total','ativas_totais','ativas_totais_gb',
    'penetracao','numero_boletos','boleto_medio','fonte',
  ]
  const header = cols.join(';')
  const lines  = rows.map(r =>
    cols.map(c => {
      const v = r[c]
      if (v == null) return ''
      if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`
      return String(v)
    }).join(';')
  )
  const csv  = [header, ...lines].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `metas_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Componente de select de filtro ──────────────────────────────────────────

function FilterSelect({ value, onChange, children, className }: {
  value: string; onChange: (v: string) => void
  children: React.ReactNode; className?: string
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
        text-slate-700 dark:text-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-ank-400 ${className ?? ''}`}>
      {children}
    </select>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MetasPage() {
  const { profile } = useAuth()
  const tenantId    = profile?.tenant_id ?? ''

  // Dados
  const [metas,   setMetas]   = useState<Meta[]>([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(0)
  const PAGE_SIZE = 50

  // Filtros
  const [ano,    setAno]    = useState(String(ANO_ATUAL))
  const [ciclo,  setCiclo]  = useState('')
  const [mes,    setMes]    = useState('')
  const [canal,  setCanal]  = useState('')
  const [marca,  setMarca]  = useState('')
  const [search, setSearch] = useState('')

  // KPIs
  const [kpis, setKpis] = useState({ pdvs: 0, gmvTotal: 0, rpaMedio: 0, penetMed: 0 })

  // Anos disponíveis
  const [anos, setAnos] = useState<number[]>([ANO_ATUAL])

  // Modais
  const [formOpen,   setFormOpen]   = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing,    setEditing]    = useState<Meta | null>(null)

  // Derivado: quando ciclo muda, mês é derivado automaticamente
  useEffect(() => {
    if (ciclo) setMes(String(CICLO_MES[parseInt(ciclo)] ?? ''))
    else setMes('')
  }, [ciclo])

  const filters: MetaFilters = {
    ano:    ano ? parseInt(ano, 10) : undefined,
    ciclo:  ciclo ? parseInt(ciclo, 10) : undefined,
    mes:    mes && !ciclo ? parseInt(mes, 10) : undefined,
    canal:  canal ? (canal as 'LOJA' | 'VD') : undefined,
    marca:  marca || undefined,
    cod_pdv: search.trim() || undefined,
  }

  const fetchMetas = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    const { data, total: t } = await MetasService.list(tenantId, filters, page, PAGE_SIZE)
    setMetas(data); setTotal(t); setLoading(false)
  }, [tenantId, ano, ciclo, mes, canal, marca, search, page])  // eslint-disable-line react-hooks/exhaustive-deps

  const fetchKpis = useCallback(async () => {
    if (!tenantId) return
    const k = await MetasService.resumo(tenantId, filters)
    setKpis(k)
  }, [tenantId, ano, ciclo, mes, canal, marca, search])  // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnos = useCallback(async () => {
    if (!tenantId) return
    const a = await MetasService.anosDisponiveis(tenantId)
    setAnos(a)
  }, [tenantId])

  useEffect(() => { fetchAnos() }, [fetchAnos])
  useEffect(() => { setPage(0) }, [ano, ciclo, mes, canal, marca, search])
  useEffect(() => { fetchMetas(); fetchKpis() }, [fetchMetas, fetchKpis])

  async function handleDelete(m: Meta) {
    if (!confirm(`Deletar meta do PDV ${m.cod_pdv} — Ciclo ${m.ciclo}/${m.ano}?`)) return
    const { error } = await MetasService.remove(m.id)
    if (error) { toast.error('Erro ao deletar.'); return }
    toast.success('Meta deletada.')
    fetchMetas(); fetchKpis()
  }

  function handleEdit(m: Meta) { setEditing(m); setFormOpen(true) }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (loading && metas.length === 0) return <Spinner fullScreen />

  return (
    <div className="space-y-5">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ank-100 dark:bg-ank-900/40 shrink-0">
          <FlagIcon className="h-6 w-6 text-ank-600 dark:text-ank-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Gestão de Metas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Metas por PDV · ciclo · canal · marca
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="sm"
            leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
            onClick={() => exportCSV(metas)}>
            Exportar CSV
          </Button>
          <Button variant="secondary" size="sm"
            leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
            onClick={() => setImportOpen(true)}>
            Importar Excel
          </Button>
          <Button size="sm" leftIcon={<PlusIcon className="h-4 w-4" />}
            onClick={() => { setEditing(null); setFormOpen(true) }}>
            Nova Meta
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'PDVs com meta',   value: kpis.pdvs,     fmt: (v: number) => v.toString(),                           color: 'text-ank-600 dark:text-ank-400' },
          { label: 'GMV Total previsto', value: kpis.gmvTotal, fmt: (v: number) => brl(v),                              color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'RPA Médio',       value: kpis.rpaMedio, fmt: (v: number) => brl(v),                                 color: 'text-slate-800 dark:text-slate-100' },
          { label: 'Penetração Média',value: kpis.penetMed, fmt: (v: number) => `${v.toFixed(1)}%`,                     color: 'text-violet-600 dark:text-violet-400' },
        ].map(s => (
          <Card key={s.label}>
            <p className={`text-xl font-black ${s.color}`}>{s.fmt(s.value)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* ── Filtros ────────────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <FunnelIcon className="h-4 w-4" /> Filtrar:
          </div>

          {/* Ano */}
          <FilterSelect value={ano} onChange={setAno}>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </FilterSelect>

          {/* Ciclo */}
          <FilterSelect value={ciclo} onChange={setCiclo}>
            <option value="">Ciclo: todos</option>
            {CICLOS.map(c => (
              <option key={c} value={c}>Ciclo {c} — {MESES_LABELS[CICLO_MES[c]]}</option>
            ))}
          </FilterSelect>

          {/* Mês — readonly quando ciclo selecionado */}
          <FilterSelect value={mes} onChange={setMes} className={ciclo ? 'opacity-60 cursor-not-allowed' : ''}>
            <option value="">Mês: todos</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{MESES_LABELS[m]}</option>
            ))}
          </FilterSelect>

          {/* Canal */}
          <FilterSelect value={canal} onChange={setCanal}>
            <option value="">Canal: todos</option>
            {CANAL_OPTS.map(c => <option key={c} value={c}>{c}</option>)}
          </FilterSelect>

          {/* Marca */}
          <FilterSelect value={marca} onChange={setMarca}>
            <option value="">Marca: todas</option>
            {MARCAS_BOTICARIO.map(m => <option key={m} value={m}>{m}</option>)}
          </FilterSelect>

          {/* Busca PDV */}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar Cod. PDV…"
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100 placeholder:text-slate-400 px-3 py-2 text-sm
              focus:outline-none focus:border-ank-400 w-36" />

          {/* Limpar */}
          {(ciclo || mes || canal || marca || search) && (
            <button onClick={() => { setCiclo(''); setMes(''); setCanal(''); setMarca(''); setSearch('') }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors">
              ✕ Limpar
            </button>
          )}

          <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
            {total.toLocaleString('pt-BR')} metas
          </span>
        </div>
      </Card>

      {/* ── Tabela ────────────────────────────────────────────────── */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <tr className="text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {['Ciclo','Mês','Canal','Marca','PDV','CP','GMV','RPA','Ativas','At. GB','Penet.','Boletos','Bol. Médio','Fonte','Ações'].map(h => (
                  <th key={h} className="px-3 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={15} className="px-4 py-10 text-center">
                  <div className="flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-ank-500 border-t-transparent" />
                  </div>
                </td></tr>
              ) : metas.length === 0 ? (
                <tr><td colSpan={15} className="px-4 py-14 text-center text-slate-400 dark:text-slate-500">
                  <FlagIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">Nenhuma meta encontrada.</p>
                  <p className="text-xs mt-1">Use "+ Nova Meta" ou "Importar Excel" para começar.</p>
                </td></tr>
              ) : metas.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {m.ano}·{String(m.ciclo).padStart(2,'0')}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {MESES_LABELS[m.mes]}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold
                      ${m.canal === 'LOJA'
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'}`}>
                      {m.canal}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">{m.marca}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-400">{m.cod_pdv}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <p className="font-mono">{m.cod_cp}</p>
                    {m.nome_cp && <p className="text-[10px] text-slate-400 truncate max-w-[100px]">{m.nome_cp}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap text-right">{brl(m.gmv)}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap text-right">{brl(m.rpa)}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 text-right">{m.ativas_totais ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 text-right">{m.ativas_totais_gb ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 text-right">{pct(m.penetracao)}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 text-right">{m.numero_boletos ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap text-right">{brl(m.boleto_medio)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold
                      ${m.fonte === 'manual'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      {m.fonte}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(m)} title="Editar"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-ank-600 hover:bg-ank-50 dark:hover:bg-ank-950/30 transition-colors">
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(m)} title="Deletar"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total.toLocaleString('pt-BR')}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium
                  text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800">
                ← Anterior
              </button>
              <span className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium
                text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800">
                {page + 1} / {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium
                  text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800">
                Próxima →
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modais */}
      <MetaFormModal
        open={formOpen}
        initial={editing}
        tenantId={tenantId}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSaved={() => { setFormOpen(false); setEditing(null); fetchMetas(); fetchKpis() }}
      />

      <MetaImportModal
        open={importOpen}
        tenantId={tenantId}
        onClose={() => setImportOpen(false)}
        onImported={() => { setImportOpen(false); fetchMetas(); fetchKpis(); fetchAnos() }}
      />
    </div>
  )
}
