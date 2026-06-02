import { useCallback, useState, useRef } from 'react'
import { CloudArrowUpIcon, CheckCircleIcon, XCircleIcon, DocumentIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { parseXlsxFile, mapRowToProduct, saveImportRecord } from '../../services/productImportService'
import { truncateProducts, bulkInsertProducts } from '../../services/productsService'
import type { XlsxRawRow, ParseResult } from '../../services/productImportService'
import { REQUIRED_COLUMNS } from '../../types/productImport'

interface Props { onImportComplete: () => void }

type Stage = 'idle' | 'parsing' | 'preview' | 'importing' | 'done' | 'error'

export default function ProductUpload({ onImportComplete }: Props) {
  const { user } = useAuth()
  const [stage, setStage]         = useState<Stage>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile]           = useState<File | null>(null)
  const [parsed, setParsed]       = useState<ParseResult | null>(null)
  const [progress, setProgress]   = useState(0)
  const [result, setResult]       = useState<{ inserted: number; errors: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (f: File) => {
    setFile(f); setStage('parsing'); setProgress(0); setParsed(null)
    try {
      const res = await parseXlsxFile(f)
      setParsed(res)
      setStage(res.valid ? 'preview' : 'error')
      if (!res.valid) toast.error(`Colunas ausentes: ${res.missingColumns.join(', ')}`)
    } catch {
      setStage('error')
      toast.error('Erro ao ler o arquivo XLSX.')
    }
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleImport() {
    if (!parsed || !file || !user) return
    setStage('importing'); setProgress(0)

    try {
      // 1. Truncate
      await truncateProducts()

      // 2. Mapear e inserir
      const rows = parsed.rows.map(mapRowToProduct)
      const res  = await bulkInsertProducts(rows, (done, total) => {
        setProgress(Math.round((done / total) * 100))
      })
      setResult(res)

      // 3. Salvar histórico
      await saveImportRecord({
        arquivo_nome:         file.name,
        arquivo_tamanho:      file.size,
        usuario_id:           user.id,
        total_registros:      parsed.rows.length,
        registros_importados: res.inserted,
        registros_com_erro:   res.errors,
        status:               res.errors === 0 ? 'concluido' : 'erro',
        observacao:           res.errors > 0 ? `${res.errors} registros com erro` : undefined,
      })

      setStage('done')
      toast.success(`${res.inserted.toLocaleString('pt-BR')} produtos importados!`)
      onImportComplete()
    } catch (err: unknown) {
      setStage('error')
      toast.error(err instanceof Error ? err.message : 'Erro na importação.')
    }
  }

  function reset() {
    setStage('idle'); setFile(null); setParsed(null); setProgress(0); setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      {(stage === 'idle' || stage === 'parsing') && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => stage === 'idle' && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed
            py-16 px-8 text-center transition-all
            ${stage === 'idle'
              ? isDragging
                ? 'border-ank-500 bg-ank-50 dark:bg-ank-950/30 scale-[1.01] cursor-pointer'
                : 'border-slate-300 dark:border-slate-700 hover:border-ank-400 hover:bg-ank-50/50 cursor-pointer'
              : 'border-slate-200 dark:border-slate-700'
            }`}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

          {stage === 'idle' && (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ank-100 dark:bg-ank-900/40">
                <CloudArrowUpIcon className="h-8 w-8 text-ank-600 dark:text-ank-400" />
              </div>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Arraste o arquivo XLSX da base de produtos
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">ou clique para selecionar</p>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-500">
                .XLSX · .XLS
              </span>
            </>
          )}

          {stage === 'parsing' && (
            <>
              <DocumentIcon className="h-12 w-12 text-ank-400 mb-4 animate-pulse" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Lendo arquivo…</p>
              <p className="text-sm text-slate-400 mt-1">{file?.name}</p>
            </>
          )}
        </div>
      )}

      {/* Erro de estrutura */}
      {stage === 'error' && parsed && !parsed.valid && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <XCircleIcon className="h-6 w-6 text-red-500 shrink-0" />
            <p className="font-semibold text-red-700 dark:text-red-400">Estrutura inválida</p>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">
            As seguintes colunas obrigatórias estão ausentes:
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {parsed.missingColumns.map(c => (
              <span key={c} className="rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-2.5 py-0.5 text-xs font-mono">
                {c}
              </span>
            ))}
          </div>
          <button onClick={reset}
            className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline">
            ← Tentar outro arquivo
          </button>
        </div>
      )}

      {/* Preview */}
      {stage === 'preview' && parsed && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total de registros', value: parsed.rows.length.toLocaleString('pt-BR'), color: 'text-slate-900 dark:text-slate-100' },
              { label: 'Colunas encontradas', value: `${parsed.headers.length}/${REQUIRED_COLUMNS.length}`, color: 'text-emerald-600' },
              { label: 'Arquivo', value: file?.name ?? '', color: 'text-slate-500', mono: true },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <p className={`text-lg font-bold truncate ${s.color} ${s.mono ? 'font-mono text-xs mt-1' : ''}`}>{s.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Pré-visualização */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Primeiras {Math.min(20, parsed.rows.length)} linhas
              </p>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                  <tr>
                    {['Cód', 'Nome Produto', 'Nome Curto', 'Marca', 'Linha', 'Família', 'Fora de Linha'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parsed.rows.slice(0, 20).map((row: XlsxRawRow, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2 font-mono">{String(row['Cod. Produto'] ?? '')}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate">{String(row['Nome Produto'] ?? '')}</td>
                      <td className="px-3 py-2 max-w-[140px] truncate">{String(row['NomeCurto Produto'] ?? '')}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{String(row['Marca'] ?? '')}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{String(row['Linha'] ?? '')}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{String(row['Familia'] ?? '')}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{String(row['Fora de Linha'] ?? '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Aviso */}
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            ⚠️ <strong>Atenção:</strong> Esta operação irá <strong>substituir toda a base de produtos</strong>.
            A tabela será truncada e reimportada com os dados deste arquivo.
          </div>

          <div className="flex gap-3">
            <button onClick={reset}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium
                text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              ← Cancelar
            </button>
            <button onClick={handleImport}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--admin-primary, #5086C6)' }}>
              Confirmar e Importar {parsed.rows.length.toLocaleString('pt-BR')} produtos
            </button>
          </div>
        </div>
      )}

      {/* Importando */}
      {stage === 'importing' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
          <CloudArrowUpIcon className="h-12 w-12 text-ank-500 mb-4 mx-auto animate-bounce" />
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Importando produtos…</p>
          <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-ank-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{progress}% concluído</p>
        </div>
      )}

      {/* Concluído */}
      {stage === 'done' && result && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-8 text-center">
          <CheckCircleIcon className="h-14 w-14 text-emerald-500 mb-4 mx-auto" />
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-2">Importação concluída!</p>
          <div className="flex justify-center gap-6 text-sm mt-4">
            <div>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{result.inserted.toLocaleString('pt-BR')}</p>
              <p className="text-slate-500">Importados</p>
            </div>
            {result.errors > 0 && (
              <div>
                <p className="text-2xl font-black text-red-600">{result.errors.toLocaleString('pt-BR')}</p>
                <p className="text-slate-500">Com erro</p>
              </div>
            )}
          </div>
          <button onClick={reset} className="mt-6 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
            Importar outro arquivo
          </button>
        </div>
      )}
    </div>
  )
}
