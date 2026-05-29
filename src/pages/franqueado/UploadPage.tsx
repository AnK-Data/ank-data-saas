import { useCallback, useState, useRef } from 'react'
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

// ─── Lê as colunas de um CSV sem carregar o arquivo inteiro ──────────────────
function readCsvHeaders(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    // Lê apenas os primeiros 4KB (suficiente para headers)
    const slice = file.slice(0, 4096)
    reader.onload = e => {
      const text = e.target?.result as string
      const firstLine = text.split('\n')[0] ?? ''
      const delimiter = firstLine.includes(';') ? ';' : ','
      const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''))
      resolve(headers)
    }
    reader.onerror = reject
    reader.readAsText(slice, 'utf-8')
  })
}

function validateHeaders(headers: string[]): ValidationResult {
  const found   = REQUIRED_COLUMNS.filter(r => headers.some(h => h.toLowerCase() === r.toLowerCase()))
  const missing = REQUIRED_COLUMNS.filter(r => !headers.some(h => h.toLowerCase() === r.toLowerCase()))
  return { valid: missing.length === 0, found, missing }
}

export default function UploadPage() {
  const { user, profile } = useAuth()
  const [state, setState]       = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState('')
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(csv|parquet)$/i)) {
      toast.error('Formato inválido. Envie um arquivo .CSV ou .Parquet.')
      return
    }

    setFileName(file.name)
    setState('validating')
    setProgress(10)
    setValidation(null)

    try {
      // ── Spec 05: Valida colunas localmente (sem tráfego pesado) ──────────
      const headers = await readCsvHeaders(file)
      const result  = validateHeaders(headers)
      setValidation(result)
      setProgress(30)

      if (!result.valid) {
        setState('error')
        toast.error(`Arquivo inválido: ${result.missing.length} coluna(s) ausente(s).`)
        return
      }

      // ── Salva no Supabase upload_logs ─────────────────────────────────────
      setState('uploading')
      setProgress(60)

      const { error } = await supabase.from('upload_logs').insert({
        tenant_id:    profile?.tenant_id,
        usuario_id:   user?.id,
        nome_arquivo: file.name,
        data_upload:  new Date().toISOString(),
      })

      if (error) throw error

      setProgress(100)
      setState('success')
      toast.success('Arquivo enviado e registrado com sucesso!')

    } catch (err: unknown) {
      setState('error')
      toast.error(err instanceof Error ? err.message : 'Erro ao processar o arquivo.')
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
    setState('idle')
    setProgress(0)
    setFileName('')
    setValidation(null)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Zona de Drag & Drop ───────────────────────────────────────── */}
      <Card>
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => state === 'idle' && inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed
            py-16 px-8 text-center transition-all cursor-pointer
            ${state === 'idle'
              ? isDragging
                ? 'border-ank-500 bg-ank-50 scale-[1.01]'
                : 'border-slate-300 hover:border-ank-400 hover:bg-ank-50/50'
              : 'border-slate-200 cursor-default'
            }`}
        >
          <input ref={inputRef} type="file" accept=".csv,.parquet" className="hidden" onChange={onFileChange} />

          {/* Estado: idle */}
          {state === 'idle' && (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ank-100">
                <CloudArrowUpIcon className="h-8 w-8 text-ank-600" />
              </div>
              <p className="text-lg font-semibold text-slate-800 mb-1">
                Arraste seu arquivo de vendas do Boticário aqui
              </p>
              <p className="text-sm text-slate-500 mb-4">ou clique para selecionar</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 font-medium">
                Formatos aceitos: .CSV · .Parquet
              </span>
            </>
          )}

          {/* Estado: validating */}
          {state === 'validating' && (
            <>
              <DocumentIcon className="h-12 w-12 text-ank-400 mb-4 animate-pulse" />
              <p className="text-base font-semibold text-slate-700">Validando estrutura do arquivo…</p>
              <p className="text-sm text-slate-500 mt-1">{fileName}</p>
            </>
          )}

          {/* Estado: uploading */}
          {state === 'uploading' && (
            <>
              <CloudArrowUpIcon className="h-12 w-12 text-ank-500 mb-4 animate-bounce" />
              <p className="text-base font-semibold text-slate-700">Enviando arquivo…</p>
              <p className="text-sm text-slate-500 mt-1">{fileName}</p>
            </>
          )}

          {/* Estado: success */}
          {state === 'success' && (
            <>
              <CheckCircleIcon className="h-14 w-14 text-emerald-500 mb-4" />
              <p className="text-lg font-bold text-emerald-700">Upload concluído!</p>
              <p className="text-sm text-slate-500 mt-1 mb-4">{fileName}</p>
              <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); reset() }}>
                Enviar outro arquivo
              </Button>
            </>
          )}

          {/* Estado: error */}
          {state === 'error' && (
            <>
              <XCircleIcon className="h-14 w-14 text-red-500 mb-4" />
              <p className="text-lg font-bold text-red-700">Upload não realizado</p>
              <p className="text-sm text-slate-500 mt-1 mb-4">{fileName}</p>
              <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); reset() }}>
                Tentar novamente
              </Button>
            </>
          )}
        </div>

        {/* Barra de progresso */}
        {state !== 'idle' && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{state === 'validating' ? 'Validando schema…' : state === 'uploading' ? 'Registrando…' : state === 'success' ? 'Concluído' : 'Erro'}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  state === 'error' ? 'bg-red-500' : state === 'success' ? 'bg-emerald-500' : 'bg-ank-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── Resultado da validação ─────────────────────────────────────── */}
      {validation && (
        <Card>
          <p className="text-sm font-semibold text-slate-700 mb-3">Validação de Colunas</p>
          <div className="space-y-2">
            {REQUIRED_COLUMNS.map(col => {
              const found = validation.found.some(f => f.toLowerCase() === col.toLowerCase())
              return (
                <div key={col} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm
                  ${found ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {found
                    ? <CheckCircleIcon className="h-4 w-4 shrink-0" />
                    : <XCircleIcon className="h-4 w-4 shrink-0" />
                  }
                  <span className="font-mono">{col}</span>
                  <span className="ml-auto text-xs">{found ? 'Encontrada' : 'AUSENTE'}</span>
                </div>
              )
            })}
          </div>
          {!validation.valid && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              ⚠ O arquivo não possui todas as colunas obrigatórias do sistema Boticário. Verifique o relatório exportado e tente novamente.
            </p>
          )}
        </Card>
      )}

      {/* ── Instrução de uso ──────────────────────────────────────────── */}
      {state === 'idle' && (
        <Card>
          <p className="text-sm font-semibold text-slate-700 mb-3">Colunas obrigatórias no arquivo</p>
          <div className="flex flex-wrap gap-2">
            {REQUIRED_COLUMNS.map(col => (
              <span key={col} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono text-slate-600">
                {col}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Exporte o relatório de vendas direto do sistema do Boticário e arraste aqui. O sistema valida a estrutura localmente antes de enviar.
          </p>
        </Card>
      )}
    </div>
  )
}
