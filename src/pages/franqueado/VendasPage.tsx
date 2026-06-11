import { useState, useEffect, useCallback } from 'react'
import {
  TableCellsIcon,
  CircleStackIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import { supabase } from '../../lib/supabaseClient'

// Types

interface ParquetColumn {
  index: number
  name: string
  type: string
  nullable: boolean
  physical_type?: number
  converted_type?: number | null
}

interface SchemaResult {
  columns: ParquetColumn[]
  num_rows: string | null
  file_size: number
  file_name: string
}

interface DataResult {
  rows: Record<string, unknown>[]
  total_rows: number
  offset: number
  limit: number
  file_name: string
}

type LoadState = 'idle' | 'loading' | 'success' | 'error'

// Tabs

type TabId = 'estrutura' | 'pedidos' | 'itens'

interface TabItem {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
  soon?: boolean
}

const TABS: TabItem[] = [
  { id: 'estrutura', label: 'Estrutura',     icon: TableCellsIcon },
  { id: 'pedidos',   label: 'Pedidos',        icon: CircleStackIcon },
  { id: 'itens',     label: 'Itens/Vendedor', icon: CircleStackIcon, soon: true },
]

// Type badge colors

type ColorPair = [string, string]

const TYPE_COLORS: ColorPair[] = [
  ['String',    'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:ring-blue-800'],
  ['Int',       'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:ring-violet-800'],
  ['Uint',      'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:ring-violet-800'],
  ['Float',     'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800'],
  ['Double',    'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-800'],
  ['Decimal',   'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:ring-orange-800'],
  ['Date',      'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800'],
  ['Timestamp', 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800'],
  ['Time',      'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-800'],
  ['Boolean',   'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:ring-rose-800'],
  ['JSON',      'bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-400 dark:ring-cyan-800'],
]

function typeBadge(type: string): string {
  const found = TYPE_COLORS.find(([prefix]) => type.startsWith(prefix))
  return found
    ? found[1]
    : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'
}

// Utilities

function formatBytes(b: number): string {
  if (b < 1024)       return `${b} B`
  if (b < 1024 ** 2)  return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 ** 2).toFixed(1)} MB`
}

function formatRows(s: string | null): string {
  if (!s) return '-'
  const n = Number(s)
  return isNaN(n) ? s : n.toLocaleString('pt-BR')
}

// ParquetOptimizationGuide — mostrado quando o arquivo tem row groups muito grandes

function ParquetOptimizationGuide() {
  return (
    <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-5 space-y-4">
      <div className="flex gap-3">
        <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
            Arquivo parquet nao esta otimizado para leitura online
          </p>
          <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
            O arquivo foi gerado com um unico bloco de dados (row group) contendo todas as
            linhas. Para ler qualquer pagina, o sistema precisaria baixar o arquivo inteiro
            (~17 MB), o que excede o limite do servidor.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">
          Como corrigir no ETL (Python):
        </p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 dark:bg-slate-950 p-4 text-xs text-green-400 leading-relaxed">
{`# Opcao 1 — se usa pandas:
df.to_parquet(
    "pedidosUnificado.parquet",
    engine="pyarrow",
    row_group_size=10000,   # <- adicione esta linha
)

# Opcao 2 — se usa pyarrow diretamente:
import pyarrow.parquet as pq
pq.write_table(
    table,
    "pedidosUnificado.parquet",
    row_group_size=10000,   # <- adicione esta linha
)`}
        </pre>
        <p className="text-xs text-orange-600 dark:text-orange-500">
          Apos regenerar o arquivo, faca o upload novamente para o Google Drive.
          Com 10.000 linhas por bloco, cada pagina baixara apenas ~270 KB em vez de 17 MB.
        </p>
      </div>
    </div>
  )
}

// SetupGuide

function SetupGuide() {
  return (
    <div className="mx-6 mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
      <div className="flex gap-3">
        <InformationCircleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Configuracao necessaria para leitura do Drive
          </p>
          <ol className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-decimal list-inside">
            <li>O suporte AnK configura as credenciais da Service Account nos secrets da plataforma.</li>
            <li>
              Compartilhe sua pasta do Google Drive com o e-mail da service account
              {' '}(permissao <strong>Leitor</strong>).
            </li>
            <li>
              Verifique se o <strong>Google Drive Folder ID</strong> esta correto nas configuracoes do tenant.
            </li>
          </ol>
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Duvidas? <strong>suporte@ankdata.com.br</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

// TabBar

function TabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <div className="flex gap-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 p-1 w-fit">
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => !t.soon && onChange(t.id)}
          className={[
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all select-none',
            t.soon ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
            active === t.id && !t.soon
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
          ].join(' ')}
        >
          <t.icon className="h-4 w-4 flex-shrink-0" />
          {t.label}
          {t.soon && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              Em breve
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// EstruturaTab

function EstruturaTab({ tenantId }: { tenantId: string }) {
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [schema,    setSchema]    = useState<SchemaResult | null>(null)
  const [error,     setError]     = useState<{ message: string; code?: string } | null>(null)
  const [search,    setSearch]    = useState('')

  const load = useCallback(async () => {
    setLoadState('loading')
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('drive-parquet-schema', {
        body: { tenant_id: tenantId },
      })
      if (fnErr) throw { message: fnErr.message }
      if (data?.error) throw { message: data.error, code: data.code }
      setSchema(data as SchemaResult)
      setLoadState('success')
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string }
      setError({ message: e.message ?? 'Erro desconhecido.', code: e.code })
      setLoadState('error')
    }
  }, [tenantId])

  useEffect(() => { load() }, [load])

  const filtered = schema?.columns.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.type.toLowerCase().includes(search.toLowerCase()),
  ) ?? []

  const showSetupGuide =
    error?.code === 'CREDENTIALS_MISSING' || error?.code === 'FOLDER_NOT_SET'

  return (
    <Card padding={false}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Estrutura do arquivo de dados
          </h2>
          {schema ? (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 text-[11px]">
                {schema.file_name}
              </code>
              {' · '}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {schema.columns.length} colunas
              </span>
              {' · '}
              {formatRows(schema.num_rows)} linhas
              {' · '}
              {formatBytes(schema.file_size)}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-400">pedidosUnificado.parquet</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {schema && (
            <input
              type="text"
              placeholder="Buscar coluna..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-40 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ank-300 dark:focus:ring-ank-800"
            />
          )}
          <button
            onClick={load}
            disabled={loadState === 'loading'}
            className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-ank-600 hover:bg-ank-50 dark:hover:bg-ank-950/30 disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loadState === 'loading' ? 'animate-spin' : ''}`} />
            {loadState === 'loading' ? 'Lendo...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loadState === 'loading' && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Lendo metadados do parquet no Drive...
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Apenas o footer e lido - sem baixar o arquivo inteiro.
          </p>
        </div>
      )}

      {/* Error */}
      {loadState === 'error' && error && (
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {error.code === 'FILE_NOT_FOUND'
                  ? 'Arquivo nao encontrado no Drive'
                  : error.code === 'CREDENTIALS_MISSING'
                  ? 'Integracao Google Drive nao configurada'
                  : error.code === 'FOLDER_NOT_SET'
                  ? 'Pasta do Google Drive nao configurada'
                  : 'Erro ao ler arquivo'}
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{error.message}</p>
            </div>
          </div>
          {showSetupGuide && <SetupGuide />}
        </div>
      )}

      {/* Columns table */}
      {loadState === 'success' && schema && (
        <>
          {filtered.length === 0 && search ? (
            <p className="px-6 py-10 text-center text-sm text-slate-400">
              Nenhuma coluna para &quot;{search}&quot;.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="w-10 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Coluna
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Restricao
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {filtered.map(col => (
                    <tr
                      key={col.name}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] text-slate-300 dark:text-slate-600">
                        {col.index}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[13px] text-slate-800 dark:text-slate-200">
                        {col.name}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${typeBadge(col.type)}`}>
                          {col.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[12px]">
                        {col.nullable
                          ? <span className="text-slate-400 dark:text-slate-500">opcional</span>
                          : <span className="font-medium text-slate-600 dark:text-slate-300">obrigatorio</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 dark:border-slate-800 px-6 py-3 text-xs text-slate-400">
            <span>{schema.columns.length} colunas total</span>
            {search && filtered.length !== schema.columns.length && (
              <span className="text-ank-500">{filtered.length} exibidas</span>
            )}
            <span className="ml-auto">
              Google Drive · pasta do tenant
            </span>
          </div>
        </>
      )}
    </Card>
  )
}

// Cell formatting

const DATE_ISO_RE = /^\d{4}-\d{2}-\d{2}T/

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? 'Sim' : 'Nao'
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return val.toLocaleString('pt-BR')
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (typeof val === 'string') {
    if (DATE_ISO_RE.test(val)) {
      try { return new Date(val).toLocaleDateString('pt-BR') } catch { /* fall through */ }
    }
    return val
  }
  return String(val)
}

const PAGE_SIZE = 100

// PedidosTab

function PedidosTab({ tenantId }: { tenantId: string }) {
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [result,    setResult]    = useState<DataResult | null>(null)
  const [error,     setError]     = useState<{ message: string; code?: string } | null>(null)
  const [page,      setPage]      = useState(0)

  const load = useCallback(async (pageIndex: number) => {
    setLoadState('loading')
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('drive-parquet-data', {
        body: { tenant_id: tenantId, limit: PAGE_SIZE, offset: pageIndex * PAGE_SIZE },
      })
      if (fnErr) throw { message: fnErr.message }
      if (data?.error) throw { message: data.error, code: data.code }
      setResult(data as DataResult)
      setLoadState('success')
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string }
      setError({ message: e.message ?? 'Erro desconhecido.', code: e.code })
      setLoadState('error')
    }
  }, [tenantId])

  useEffect(() => { load(page) }, [load, page])

  const isLoading   = loadState === 'loading'
  const columns     = result?.rows?.[0] ? Object.keys(result.rows[0]) : []
  const totalPages  = result ? Math.ceil(result.total_rows / PAGE_SIZE) : 0
  const rowFrom     = result ? result.offset + 1 : 0
  const rowTo       = result ? result.offset + result.rows.length : 0

  const showSetupGuide =
    error?.code === 'CREDENTIALS_MISSING' || error?.code === 'FOLDER_NOT_SET'

  return (
    <Card padding={false}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Dados de Pedidos
          </h2>
          {result ? (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 text-[11px]">
                {result.file_name}
              </code>
              {' · '}
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {result.total_rows.toLocaleString('pt-BR')} linhas
              </span>
              {' · '}
              {columns.length} colunas
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-400">pedidosUnificado.parquet</p>
          )}
        </div>

        <button
          onClick={() => load(page)}
          disabled={loadState === 'loading'}
          className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-ank-600 hover:bg-ank-50 dark:hover:bg-ank-950/30 disabled:opacity-50 transition-colors"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${loadState === 'loading' ? 'animate-spin' : ''}`} />
          {loadState === 'loading' ? 'Carregando...' : 'Atualizar'}
        </button>
      </div>

      {/* Loading */}
      {loadState === 'loading' && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Lendo dados do parquet no Drive...
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Apenas os chunks necessarios sao baixados.
          </p>
        </div>
      )}

      {/* Error */}
      {loadState === 'error' && error && (
        <div className="p-6 space-y-4">
          {error.code === 'ROW_GROUP_TOO_LARGE' ? (
            <ParquetOptimizationGuide />
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  {error.code === 'FILE_NOT_FOUND'
                    ? 'Arquivo nao encontrado no Drive'
                    : error.code === 'CREDENTIALS_MISSING'
                    ? 'Integracao Google Drive nao configurada'
                    : error.code === 'FOLDER_NOT_SET'
                    ? 'Pasta do Google Drive nao configurada'
                    : 'Erro ao ler arquivo'}
                </p>
                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{error.message}</p>
              </div>
            </div>
          )}
          {showSetupGuide && <SetupGuide />}
        </div>
      )}

      {/* Table */}
      {loadState === 'success' && result && (
        <>
          {result.rows.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-400">
              Nenhum dado encontrado no arquivo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {columns.map(col => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {result.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {columns.map(col => (
                        <td
                          key={col}
                          className="px-4 py-2 text-[12px] text-slate-700 dark:text-slate-300"
                        >
                          {formatCell(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 px-6 py-3">
            <span className="text-xs text-slate-400">
              Linhas {rowFrom.toLocaleString('pt-BR')}–{rowTo.toLocaleString('pt-BR')} de {result.total_rows.toLocaleString('pt-BR')}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 0 || isLoading}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Anterior
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {page + 1} / {Math.max(totalPages, 1)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page + 1 >= totalPages || isLoading}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Proxima
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

// SoonTab

function SoonTab({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CircleStackIcon className="h-12 w-12 text-slate-200 dark:text-slate-700 mb-4" />
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
        <p className="mt-1 text-sm text-slate-400 max-w-sm">{description}</p>
        <span className="mt-4 inline-flex rounded-full bg-ank-50 dark:bg-ank-950/30 px-3 py-1 text-xs font-medium text-ank-600 dark:text-ank-400 ring-1 ring-ank-200 dark:ring-ank-800">
          Em desenvolvimento
        </span>
      </div>
    </Card>
  )
}

// Page

export default function VendasPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('estrutura')
  const tenantId = profile?.tenant_id ?? ''

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-slate-500">Carregando perfil...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'estrutura' && <EstruturaTab tenantId={tenantId} />}

      {activeTab === 'pedidos' && <PedidosTab tenantId={tenantId} />}

      {activeTab === 'itens' && (
        <SoonTab
          title="Itens por Vendedor"
          description="Performance individual dos consultores e mix de produtos. Disponivel em breve."
        />
      )}
    </div>
  )
}
