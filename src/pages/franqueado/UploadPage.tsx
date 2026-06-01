import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CloudArrowUpIcon, CheckCircleIcon, XCircleIcon,
  DocumentIcon, FunnelIcon, XMarkIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Card, { CardHeader } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'validating' | 'uploading' | 'success' | 'error'
type FileStatus  = 'concluido' | 'processando' | 'pendente' | 'erro'

interface UploadRecord {
  id: string
  nome_arquivo: string
  data_upload: string
  status: FileStatus
  usuario_id: string | null
  usuario?: { nome: string } | null
}

// ─── Config visual de status ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<FileStatus, { label: string; badge: string; dot: string }> = {
  concluido:   { label: 'Concluído',   badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  processando: { label: 'Processando', badge: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/30 dark:text-blue-400',                dot: 'bg-blue-500 animate-pulse' },
  pendente:    { label: 'Pendente',    badge: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400',             dot: 'bg-amber-400' },
  erro:        { label: 'Erro',        badge: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/30 dark:text-red-400',                       dot: 'bg-red-500' },
}

function StatusBadge({ status }: { status: FileStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendente
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

const ACCEPTED = '.csv,.xlsx,.xls,.parquet'
const ACCEPTED_LABEL = 'CSV · XLSX · XLS · Parquet'

// ─── Página ───────────────────────────────────────────────────────────────────

export default function UploadPage() {
  const { user, profile } = useAuth()
  const tenantId = profile?.tenant_id ?? ''

  // Upload state
  const [state, setState]       = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Histórico
  const [history, setHistory]         = useState<UploadRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Filtros
  const [filterStatus, setFilterStatus] = useState<FileStatus | ''>('')
  const [filterUser, setFilterUser]     = useState('')
  const [filterDate, setFilterDate]     = useState('')
  const [filterName, setFilterName]     = useState('')

  async function fetchHistory() {
    if (!tenantId) return
    const { data } = await supabase
      .from('upload_logs')
      .select('id, nome_arquivo, data_upload, status, usuario_id, usuario:profiles!upload_logs_usuario_id_fkey(nome)')
      .eq('tenant_id', tenantId)
      .order('data_upload', { ascending: false })
      .limit(100)
    setHistory((data ?? []) as UploadRecord[])
    setLoadingHistory(false)
  }

  useEffect(() => { fetchHistory() }, [tenantId])
  useEffect(() => {
    window.addEventListener('ank:upload-completed', fetchHistory)
    return () => window.removeEventListener('ank:upload-completed', fetchHistory)
  }, [tenantId])

  // Opções únicas para filtros de select
  const uniqueUsers = useMemo(() =>
    [...new Set(history.map(h => h.usuario?.nome ?? 'Desconhecido'))].sort(),
  [history])

  // Filtros aplicados
  const filtered = useMemo(() => history.filter(h => {
    if (filterStatus && h.status !== filterStatus) return false
    if (filterUser  && (h.usuario?.nome ?? 'Desconhecido') !== filterUser) return false
    if (filterName  && !h.nome_arquivo.toLowerCase().includes(filterName.toLowerCase())) return false
    if (filterDate) {
      try {
        const d = parseISO(h.data_upload)
        const ref = parseISO(filterDate)
        if (!isWithinInterval(d, { start: startOfDay(ref), end: endOfDay(ref) })) return false
      } catch { return true }
    }
    return true
  }), [history, filterStatus, filterUser, filterDate, filterName])

  const hasFilters = filterStatus || filterUser || filterDate || filterName

  function clearFilters() {
    setFilterStatus(''); setFilterUser(''); setFilterDate(''); setFilterName('')
  }

  // Upload
  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls', 'parquet'].includes(ext ?? '')) {
      toast.error('Formato não suportado. Use CSV, XLSX, XLS ou Parquet.')
      return
    }

    setFileName(file.name); setErrorMsg('')
    setState('validating'); setProgress(20)

    try {
      if (!profile?.tenant_id)
        throw new Error('Perfil não carregado. Aguarde e tente novamente.')

      setState('uploading'); setProgress(65)

      const { error: dbErr } = await supabase.from('upload_logs').insert({
        tenant_id:    profile.tenant_id,
        usuario_id:   user?.id,
        nome_arquivo: file.name,
        data_upload:  new Date().toISOString(),
        status:       'concluido',
      })

      if (dbErr) throw new Error(`Erro ao registrar: ${dbErr.message}`)

      setProgress(100); setState('success')
      toast.success('Arquivo registrado com sucesso!')
      window.dispatchEvent(new CustomEvent('ank:upload-completed'))
      await fetchHistory()

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar.'
      setErrorMsg(msg); setState('error'); toast.error(msg)
    }
  }, [user, profile])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]; if (f) processFile(f)
  }

  function reset() { setState('idle'); setProgress(0); setFileName(''); setErrorMsg('') }

  return (
    <div className="space-y-6">

      {/* ── Zona de upload ─────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto">
        <Card>
          <div
            onDragOver={e => { e.preventDefault(); if (state === 'idle') setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => state === 'idle' && inputRef.current?.click()}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed
              py-16 px-8 text-center transition-all
              ${state === 'idle'
                ? isDragging
                  ? 'border-ank-500 bg-ank-50 dark:bg-ank-950/30 scale-[1.01] cursor-pointer'
                  : 'border-slate-300 dark:border-slate-700 hover:border-ank-400 hover:bg-ank-50/50 cursor-pointer'
                : state === 'success' ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 cursor-default'
                : state === 'error'   ? 'border-red-300 dark:border-red-700 bg-red-50/40 cursor-default'
                : 'border-slate-200 dark:border-slate-700 cursor-default'}`}
          >
            <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }} />

            {state === 'idle' && (<>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ank-100 dark:bg-ank-900/40">
                <CloudArrowUpIcon className="h-8 w-8 text-ank-600 dark:text-ank-400" />
              </div>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">Arraste seu arquivo de vendas aqui</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">ou clique para selecionar</p>
              <div className="flex gap-2 flex-wrap justify-center">
                {ACCEPTED_LABEL.split(' · ').map(f => (
                  <span key={f} className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">{f}</span>
                ))}
              </div>
            </>)}

            {state === 'validating' && (<>
              <DocumentIcon className="h-12 w-12 text-ank-400 mb-4 animate-pulse" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Verificando arquivo…</p>
              <p className="text-sm text-slate-400 mt-1">{fileName}</p>
            </>)}

            {state === 'uploading' && (<>
              <CloudArrowUpIcon className="h-12 w-12 text-ank-500 mb-4 animate-bounce" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Registrando arquivo…</p>
              <p className="text-sm text-slate-400 mt-1">{fileName}</p>
            </>)}

            {state === 'success' && (<>
              <CheckCircleIcon className="h-14 w-14 text-emerald-500 mb-4" />
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">Arquivo aceito!</p>
              <p className="text-sm text-slate-400 mt-1 mb-4 max-w-xs truncate">{fileName}</p>
              <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); reset() }}>Enviar outro arquivo</Button>
            </>)}

            {state === 'error' && (<>
              <XCircleIcon className="h-14 w-14 text-red-500 mb-4" />
              <p className="text-lg font-bold text-red-700 dark:text-red-400">Falha no envio</p>
              <p className="text-xs text-slate-400 mt-0.5 mb-1 max-w-xs truncate">{fileName}</p>
              {errorMsg && <p className="text-xs text-red-600 dark:text-red-400 mb-4 max-w-xs text-center">{errorMsg}</p>}
              <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); reset() }}>Tentar novamente</Button>
            </>)}
          </div>

          {state !== 'idle' && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{state === 'validating' ? 'Verificando…' : state === 'uploading' ? 'Registrando…' : state === 'success' ? 'Concluído ✓' : 'Falhou'}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${state === 'error' ? 'bg-red-500' : state === 'success' ? 'bg-emerald-500' : 'bg-ank-500'}`}
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Histórico com filtros ──────────────────────────────────── */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <CardHeader
            title="Arquivos enviados"
            subtitle={`${filtered.length} de ${history.length} registro${history.length !== 1 ? 's' : ''}`}
          />
        </div>

        {/* Barra de filtros */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <FunnelIcon className="h-3.5 w-3.5" />
              Filtrar:
            </div>

            {/* Nome */}
            <input
              type="text"
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              placeholder="Buscar por nome…"
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
                px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400
                focus:border-ank-400 focus:outline-none focus:ring-1 focus:ring-ank-200 w-40"
            />

            {/* Status */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as FileStatus | '')}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
                px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100
                focus:border-ank-400 focus:outline-none focus:ring-1 focus:ring-ank-200"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>

            {/* Usuário */}
            <select
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
                px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100
                focus:border-ank-400 focus:outline-none focus:ring-1 focus:ring-ank-200"
            >
              <option value="">Todos os usuários</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            {/* Data */}
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
                px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100
                focus:border-ank-400 focus:outline-none focus:ring-1 focus:ring-ank-200"
            />

            {/* Limpar */}
            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors
                  px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30">
                <XMarkIcon className="h-3.5 w-3.5" />
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Tabela */}
        {loadingHistory ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <CloudArrowUpIcon className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {hasFilters ? 'Nenhum arquivo encontrado com esses filtros' : 'Nenhum arquivo enviado ainda'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-6 py-3 min-w-[260px]">Arquivo</th>
                  <th className="px-5 py-3 w-28">Status</th>
                  <th className="px-5 py-3 w-28">Data</th>
                  <th className="px-5 py-3 w-24">Hora</th>
                  <th className="px-5 py-3 min-w-[160px]">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Arquivo */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ank-50 dark:bg-ank-950/30">
                          <DocumentIcon className="h-4 w-4 text-ank-500 dark:text-ank-400" />
                        </div>
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate max-w-[220px]"
                          title={h.nome_arquivo}>
                          {h.nome_arquivo}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <StatusBadge status={h.status ?? 'concluido'} />
                    </td>

                    {/* Data */}
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                      {format(parseISO(h.data_upload), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>

                    {/* Hora */}
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 text-xs font-mono whitespace-nowrap">
                      {format(parseISO(h.data_upload), 'HH:mm:ss')}
                    </td>

                    {/* Usuário */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center
                          text-[10px] font-bold text-violet-700 dark:text-violet-400 uppercase shrink-0">
                          {(h.usuario?.nome ?? 'U').charAt(0)}
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {h.usuario?.nome ?? 'Desconhecido'}
                        </span>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
