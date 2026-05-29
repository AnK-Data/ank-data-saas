import { useCallback, useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { CloudArrowUpIcon, CheckCircleIcon, XCircleIcon, DocumentIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

// ─── Spec 05: Colunas obrigatórias do arquivo Boticário ───────────────────────
const REQUIRED_COLUMNS = [
  'Cod. Estrutura',
  'AnoMes',
  'Nome Vendedor',
  'Papel',
  'Cod. PDV',
]

type UploadState = 'idle' | 'validating' | 'uploading' | 'success' | 'error'

interface ValidationResult {
  valid: boolean
  found: string[]
  missing: string[]
}

type FileType = 'csv' | 'xlsx' | 'xls' | 'parquet' | 'unknown'

function detectType(filename: string): FileType {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'csv')     return 'csv'
  if (ext === 'xlsx')    return 'xlsx'
  if (ext === 'xls')     return 'xls'
  if (ext === 'parquet') return 'parquet'
  return 'unknown'
}

// ─── Leitores de header por tipo ─────────────────────────────────────────────

async function readCsvHeaders(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const firstLine = text.split('\n')[0] ?? ''
      const delimiter = firstLine.includes(';') ? ';' : ','
      const headers = firstLine
        .split(delimiter)
        .map(h => h.trim().replace(/^["']|["']$/g, ''))
      resolve(headers)
    }
    reader.onerror = reject
    reader.readAsText(file.slice(0, 8192), 'utf-8')
  })
}

async function readExcelHeaders(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array', sheetRows: 1 })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1 })
        resolve((rows[0] ?? []).map(String))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function validateHeaders(headers: string[]): ValidationResult {
  const normalize = (s: string) => s.toLowerCase().replace(/[\s.]/g, '')
  const found   = REQUIRED_COLUMNS.filter(r => headers.some(h => normalize(h) === normalize(r)))
  const missing = REQUIRED_COLUMNS.filter(r => !headers.some(h => normalize(h) === normalize(r)))
  return { valid: missing.length === 0, found, missing }
}

// ─── Componente principal ─────────────────────────────────────────────────────

const ACCEPTED_TYPES = '.csv,.xlsx,.xls,.parquet'
const FORMAT_LABELS = ['.CSV', '.XLSX', '.XLS', '.Parquet']

export default function UploadPage() {
  const { user, profile } = useAuth()
  const [state, setState]           = useState<UploadState>('idle')
  const [progress, setProgress]     = useState(0)
  const [fileName, setFileName]     = useState('')
  const [fileType, setFileType]     = useState<FileType>('unknown')
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    const type = detectType(file.name)

    if (type === 'unknown') {
      toast.error('Formato não suportado. Use CSV, XLSX, XLS ou Parquet.')
      return
    }

    setFileName(file.name)
    setFileType(type)
    setState('validating')
    setProgress(15)
    setValidation(null)

    try {
      // Parquet: valida apenas formato, sem leitura de headers no browser
      if (type === 'parquet') {
        setProgress(60)
        setState('uploading')
        await registerUpload(file.name, type)
        setProgress(100)
        setState('success')
        toast.success('Arquivo Parquet registrado com sucesso!')
        return
      }

      // CSV / Excel: valida colunas localmente
      const headers = type === 'csv'
        ? await readCsvHeaders(file)
        : await readExcelHeaders(file)

      const result = validateHeaders(headers)
      setValidation(result)
      setProgress(40)

      if (!result.valid) {
        setState('error')
        toast.error(`Arquivo inválido: ${result.missing.length} coluna(s) ausente(s).`)
        return
      }

      setState('uploading')
      setProgress(70)
      await registerUpload(file.name, type)
      setProgress(100)
      setState('success')
      toast.success('Arquivo enviado e registrado com sucesso!')

    } catch (err: unknown) {
      setState('error')
      toast.error(err instanceof Error ? err.message : 'Erro ao processar o arquivo.')
    }

    async function registerUpload(nome: string, tipo: string) {
      const { error } = await supabase.from('upload_logs').insert({
        tenant_id:    profile?.tenant_id,
        usuario_id:   user?.id,
        nome_arquivo: nome,
        data_upload:  new Date().toISOString(),
      })
      if (error) throw error
      // Dispara atualização de conformidade
      window.dispatchEvent(new CustomEvent('ank:upload-completed'))
    }
  }, [user, profile])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function reset() {
    setState('idle'); setProgress(0); setFileName(''); setValidation(null)
  }

  const typeLabel: Record<FileType, string> = {
    csv: 'CSV', xlsx: 'Excel (XLSX)', xls: 'Excel (XLS)', parquet: 'Parquet', unknown: 'Desconhecido',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Zona Drag & Drop ─────────────────────────────────────── */}
      <Card>
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => state === 'idle' && inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed
            py-16 px-8 text-center transition-all
            ${state === 'idle'
              ? isDragging
                ? 'border-ank-500 bg-ank-50 dark:bg-ank-950/30 scale-[1.01] cursor-pointer'
                : 'border-slate-300 dark:border-slate-700 hover:border-ank-400 hover:bg-ank-50/50 dark:hover:bg-ank-950/20 cursor-pointer'
              : 'border-slate-200 dark:border-slate-700 cursor-default'
            }`}
        >
          <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} className="hidden" onChange={onFileChange} />

          {state === 'idle' && (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ank-100 dark:bg-ank-900/40">
                <CloudArrowUpIcon className="h-8 w-8 text-ank-600 dark:text-ank-400" />
              </div>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Arraste seu arquivo de vendas do Boticário aqui
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">ou clique para selecionar</p>
              <div className="flex flex-wrap justify-center gap-2">
                {FORMAT_LABELS.map(f => (
                  <span key={f} className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {f}
                  </span>
                ))}
              </div>
            </>
          )}

          {state === 'validating' && (
            <>
              <DocumentIcon className="h-12 w-12 text-ank-400 mb-4 animate-pulse" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                Validando estrutura {typeLabel[fileType]}…
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{fileName}</p>
            </>
          )}

          {state === 'uploading' && (
            <>
              <CloudArrowUpIcon className="h-12 w-12 text-ank-500 mb-4 animate-bounce" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Registrando upload…</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{fileName}</p>
            </>
          )}

          {state === 'success' && (
            <>
              <CheckCircleIcon className="h-14 w-14 text-emerald-500 mb-4" />
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">Upload concluído!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">{fileName}</p>
              <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); reset() }}>
                Enviar outro arquivo
              </Button>
            </>
          )}

          {state === 'error' && (
            <>
              <XCircleIcon className="h-14 w-14 text-red-500 mb-4" />
              <p className="text-lg font-bold text-red-700 dark:text-red-400">Upload não realizado</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">{fileName}</p>
              <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); reset() }}>
                Tentar novamente
              </Button>
            </>
          )}
        </div>

        {/* Barra de progresso */}
        {state !== 'idle' && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>
                {state === 'validating' ? 'Validando colunas…'
                  : state === 'uploading' ? 'Registrando…'
                  : state === 'success'   ? 'Concluído ✓'
                  : 'Erro na validação'}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  state === 'error'   ? 'bg-red-500'     :
                  state === 'success' ? 'bg-emerald-500' : 'franchise-btn-primary'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── Resultado da validação ────────────────────────────────── */}
      {validation && (
        <Card>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Validação de Colunas — {typeLabel[fileType]}
          </p>
          <div className="space-y-2">
            {REQUIRED_COLUMNS.map(col => {
              const ok = validation.found.some(f =>
                f.toLowerCase().replace(/[\s.]/g, '') === col.toLowerCase().replace(/[\s.]/g, '')
              )
              return (
                <div key={col} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm
                  ${ok ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                       : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'}`}>
                  {ok ? <CheckCircleIcon className="h-4 w-4 shrink-0" />
                      : <XCircleIcon className="h-4 w-4 shrink-0" />}
                  <span className="font-mono">{col}</span>
                  <span className="ml-auto text-xs">{ok ? 'Encontrada' : 'AUSENTE'}</span>
                </div>
              )
            })}
          </div>
          {!validation.valid && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              ⚠ Verifique o relatório exportado pelo sistema do Boticário e tente novamente.
            </p>
          )}
        </Card>
      )}

      {/* ── Instruções ───────────────────────────────────────────── */}
      {state === 'idle' && (
        <Card>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Colunas obrigatórias no arquivo
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {REQUIRED_COLUMNS.map(col => (
              <span key={col} className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-mono text-slate-600 dark:text-slate-400">
                {col}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Exporte o relatório de vendas direto do sistema do Boticário e arraste aqui.
            O sistema valida a estrutura localmente antes de enviar.
          </p>
        </Card>
      )}
    </div>
  )
}
