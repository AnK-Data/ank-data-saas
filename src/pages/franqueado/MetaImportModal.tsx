import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import { CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'
import { MetasService } from '../../services/metas.service'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import { CICLO_MES, MARCAS_BOTICARIO } from '../../types'
import type { MetaUpsertData } from '../../types'

// ─── Helpers de parse ────────────────────────────────────────────────────────

const ANO_ATUAL = new Date().getFullYear()

function parseBRL(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return v
  const s = String(v).replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseIntSafe(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = parseInt(String(v), 10)
  return isNaN(n) ? null : n
}

function parsePct(v: unknown): number | null {
  if (v == null || v === '') return null
  const s = String(v).replace('%', '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

/** Extrai ano e ciclo de um ciclo_key YYYYCC ou ciclo puro 1-17 */
function parseCicloKey(raw: unknown, defaultAno: number): { ano: number; ciclo: number } | null {
  const s = String(raw ?? '').trim()
  if (/^\d{6}$/.test(s)) {
    const ano   = parseInt(s.slice(0, 4), 10)
    const ciclo = parseInt(s.slice(4), 10)
    if (ciclo >= 1 && ciclo <= 17) return { ano, ciclo }
  }
  const n = parseInt(s, 10)
  if (!isNaN(n) && n >= 1 && n <= 17) return { ano: defaultAno, ciclo: n }
  return null
}

// ─── Tipos internos ──────────────────────────────────────────────────────────

type PlanilhaTipo = 'A' | 'B' | 'C' | 'desconhecido'

interface ParsedRow {
  ano: number; ciclo: number; mes: number
  cod_pdv: string; cod_cp: string; nome_cp?: string
  canal: 'LOJA' | 'VD'; marca: string
  gmv?: number | null; rpa?: number | null
  base_total?: number | null; atividade_total?: number | null
  ativas_totais?: number | null; ativas_totais_gb?: number | null
  penetracao?: number | null
  numero_boletos?: number | null; boleto_medio?: number | null
}

interface Props {
  open: boolean
  tenantId: string
  onClose: () => void
  onImported: () => void
}

// ─── Detecção do tipo de planilha ────────────────────────────────────────────

function detectType(headers: string[]): PlanilhaTipo {
  const h = headers.map(s => s.toLowerCase())
  if (h.some(s => s.includes('rpa')))              return 'A'
  if (h.some(s => s.includes('boleto')))           return 'C'
  if (h.some(s => s.includes('gmv') || s.includes('faturamento'))) return 'B'
  return 'desconhecido'
}

// ─── Normalização de headers ─────────────────────────────────────────────────

function findCol(headers: string[], ...terms: string[]): string | undefined {
  return headers.find(h => terms.some(t => h.toLowerCase().includes(t.toLowerCase())))
}

function parseRows(rawRows: Record<string, unknown>[], headers: string[], _tipo: PlanilhaTipo, defaultAno: number): ParsedRow[] {
  const col = (h: string[]) => findCol(headers, ...h)

  const colCiclo   = col(['ciclo', 'ciclo_key'])
  const colPdv     = col(['cod. pdv', 'cod_pdv', 'pdv', 'codigo pdv'])
  const colCp      = col(['cod. cp', 'cod_cp', 'cp', 'codigo cp'])
  const colNomeCp  = col(['nome cp', 'nome_cp', 'nome da franquia', 'franquia'])
  const colCanal   = col(['canal'])
  const colMarca   = col(['marca'])
  const colGmv     = col(['gmv', 'faturamento'])
  const colRpa     = col(['rpa'])
  const colBase    = col(['base total', 'base_total'])
  const colAtiv    = col(['atividade total', 'atividade_total'])
  const colAtivas  = col(['ativas totais', 'ativas_totais'])
  const colAtivasGb= col(['ativas totais gb', 'ativas_totais_gb', 'gb'])
  const colPen     = col(['penetracao', 'penetração', 'penetracao_%'])
  const colBolNum  = col(['numero boletos', 'num boletos', 'numero_boletos', 'boletos'])
  const colBolMed  = col(['boleto medio', 'boleto_medio', 'ticket boleto'])

  const rows: ParsedRow[] = []

  for (const raw of rawRows) {
    const cicloRaw = colCiclo ? raw[colCiclo] : null
    const parsed   = parseCicloKey(cicloRaw, defaultAno)
    if (!parsed) continue

    const pdv   = String(colPdv   ? raw[colPdv]   ?? '' : '').trim().toUpperCase()
    const cp    = String(colCp    ? raw[colCp]    ?? '' : '').trim()
    const canal = String(colCanal ? raw[colCanal] ?? 'LOJA' : 'LOJA').trim().toUpperCase()
    const marca = String(colMarca ? raw[colMarca] ?? 'BOT' : 'BOT').trim().toUpperCase()

    if (!pdv || !cp) continue

    const canalVal: 'LOJA' | 'VD' = canal === 'VD' || canal.includes('VENDA') ? 'VD' : 'LOJA'
    const marcaVal = MARCAS_BOTICARIO.includes(marca as typeof MARCAS_BOTICARIO[number]) ? marca : 'BOT'

    rows.push({
      ano:              parsed.ano,
      ciclo:            parsed.ciclo,
      mes:              CICLO_MES[parsed.ciclo],
      cod_pdv:          pdv,
      cod_cp:           cp,
      nome_cp:          colNomeCp ? String(raw[colNomeCp] ?? '').trim() || undefined : undefined,
      canal:            canalVal,
      marca:            marcaVal,
      gmv:              colGmv    ? parseBRL(raw[colGmv])       : null,
      rpa:              colRpa    ? parseBRL(raw[colRpa])        : null,
      base_total:       colBase   ? parseBRL(raw[colBase])       : null,
      atividade_total:  colAtiv   ? parseBRL(raw[colAtiv])       : null,
      ativas_totais:    colAtivas ? parseIntSafe(raw[colAtivas]) : null,
      ativas_totais_gb: colAtivasGb ? parseIntSafe(raw[colAtivasGb]) : null,
      penetracao:       colPen    ? parsePct(raw[colPen])        : null,
      numero_boletos:   colBolNum ? parseIntSafe(raw[colBolNum]) : null,
      boleto_medio:     colBolMed ? parseBRL(raw[colBolMed])     : null,
    })
  }

  return rows
}

// ─── Componente ──────────────────────────────────────────────────────────────

type Stage = 'upload' | 'preview' | 'importing' | 'done'

export default function MetaImportModal({ open, tenantId, onClose, onImported }: Props) {
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  const [stage,       setStage]       = useState<Stage>('upload')
  const [isDragging,  setIsDragging]  = useState(false)
  const [fileName,    setFileName]    = useState('')
  const [_tipo,       setTipo]        = useState<PlanilhaTipo>('desconhecido')
  const [headers,     setHeaders]     = useState<string[]>([])
  const [rawRows,     setRawRows]     = useState<Record<string, unknown>[]>([])
  const [parsedRows,  setParsedRows]  = useState<ParsedRow[]>([])
  const [defaultAno,  setDefaultAno]  = useState(String(ANO_ATUAL))
  const [progress,    setProgress]    = useState(0)
  const [result,      setResult]      = useState<{ ok: number; err: number } | null>(null)

  function reset() {
    setStage('upload'); setFileName(''); setTipo('desconhecido')
    setHeaders([]); setRawRows([]); setParsedRows([]); setProgress(0); setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name)
    try {
      const buf  = await file.arrayBuffer()
      const wb   = XLSX.read(buf, { type: 'array', cellDates: false })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: false })
      const hdrs = data.length > 0 ? Object.keys(data[0]) : []
      setHeaders(hdrs)
      setRawRows(data)
      setTipo(detectType(hdrs) as PlanilhaTipo)
      setStage('preview')
    } catch {
      toast.error('Erro ao ler o arquivo. Verifique o formato.')
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  // Reparsa quando o ano default muda
  function onAnoChange(v: string) {
    setDefaultAno(v)
    const parsed = parseRows(rawRows, headers, _tipo, parseInt(v, 10) || ANO_ATUAL)
    setParsedRows(parsed)
  }

  function preparePreview() {
    const parsed = parseRows(rawRows, headers, 'A', parseInt(defaultAno, 10) || ANO_ATUAL)
    setParsedRows(parsed)
  }

  async function handleImport() {
    if (!parsedRows.length) return
    setStage('importing'); setProgress(0)

    const BATCH = 200
    let ok = 0; let err = 0

    const upsertRows: MetaUpsertData[] = parsedRows.map(r => ({
      tenant_id:        tenantId,
      ano:              r.ano,
      ciclo:            r.ciclo,
      mes:              r.mes,
      cod_pdv:          r.cod_pdv,
      cod_cp:           r.cod_cp,
      nome_cp:          r.nome_cp ?? null,
      canal:            r.canal,
      marca:            r.marca,
      gmv:              r.gmv ?? null,
      rpa:              r.rpa ?? null,
      base_total:       r.base_total ?? null,
      atividade_total:  r.atividade_total ?? null,
      ativas_totais:    r.ativas_totais ?? null,
      ativas_totais_gb: r.ativas_totais_gb ?? null,
      penetracao:       r.penetracao ?? null,
      numero_boletos:   r.numero_boletos ?? null,
      boleto_medio:     r.boleto_medio ?? null,
      fonte:            'upload',
      importado_por:    user?.id ?? null,
    }))

    for (let i = 0; i < upsertRows.length; i += BATCH) {
      const batch = upsertRows.slice(i, i + BATCH)
      const { error } = await MetasService.upsert(batch)
      if (error) { err += batch.length; console.warn('[Metas] upsert error:', error.message) }
      else ok += batch.length
      setProgress(Math.round(((i + BATCH) / upsertRows.length) * 100))
    }

    setResult({ ok, err }); setStage('done')
    if (ok > 0) { toast.success(`${ok} metas importadas!`); onImported() }
    if (err > 0) toast.error(`${err} linhas com erro.`)
  }

  const brl = (v: number | null | undefined) =>
    v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'

  const tipoLabel: Record<PlanilhaTipo, string> = {
    A: 'Tipo A — KPIs completos (tem RPA)',
    B: 'Tipo B — Consolidado por GMV/Mês',
    C: 'Tipo C — Planilha de boletos',
    desconhecido: 'Tipo desconhecido — verifique o arquivo',
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} size="lg"
      title="Importar Metas via Excel"
      footer={
        <>
          <Button variant="secondary" onClick={() => { reset(); onClose() }} disabled={stage === 'importing'}>
            {stage === 'done' ? 'Fechar' : 'Cancelar'}
          </Button>
          {stage === 'preview' && (
            <Button onClick={handleImport} disabled={parsedRows.length === 0}>
              Importar {parsedRows.length} metas
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">

        {/* Etapa 1 — Upload */}
        {stage === 'upload' && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed
                py-14 cursor-pointer transition-all text-center
                ${isDragging
                  ? 'border-ank-500 bg-ank-50 dark:bg-ank-950/30 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-600 hover:border-ank-400 hover:bg-ank-50/40'}`}
            >
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
              <CloudArrowUpIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Arraste a planilha aqui</p>
              <p className="text-sm text-slate-400 mt-1">.xlsx · .xls · .csv</p>
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <p className="font-semibold">Formatos suportados:</p>
              <p>• <strong>Tipo A</strong>: Planilha completa de KPIs (colunas: Ciclo, PDV, Canal, Marca, GMV, RPA, Ativas...)</p>
              <p>• <strong>Tipo B</strong>: Consolidado GMV por mês</p>
              <p>• <strong>Tipo C</strong>: Planilha de boletos</p>
              <p className="mt-1">A coluna <strong>Ciclo</strong> pode estar no formato <code>202510</code> (YYYYCC) ou apenas <code>10</code>.</p>
            </div>
          </>
        )}

        {/* Etapa 2 — Preview */}
        {stage === 'preview' && (
          <>
            {/* Info arquivo */}
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{fileName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {tipoLabel[_tipo]} · {rawRows.length} linhas brutas
                </p>
              </div>
              <button onClick={reset} className="text-xs text-slate-400 hover:text-red-500">Trocar</button>
            </div>

            {/* Ano default (se ciclo for só número) */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">
                Ano de referência
              </label>
              <input type="number" value={defaultAno}
                onChange={e => onAnoChange(e.target.value)}
                className="w-28 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800
                  text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:border-ank-400 focus:outline-none" />
              <p className="text-xs text-slate-400">Usado quando o ciclo estiver no formato numérico (1–17)</p>
              <Button variant="secondary" size="sm" onClick={preparePreview}>Aplicar</Button>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Metas a importar', value: parsedRows.length, color: 'text-ank-600 dark:text-ank-400' },
                { label: 'PDVs únicos',       value: new Set(parsedRows.map(r => r.cod_pdv)).size, color: 'text-slate-800 dark:text-slate-200' },
                { label: 'Linhas ignoradas',  value: rawRows.length - parsedRows.length, color: parsedRows.length < rawRows.length ? 'text-amber-600' : 'text-emerald-600' },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-center">
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Preview das primeiras 5 linhas */}
            {parsedRows.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Primeiras {Math.min(5, parsedRows.length)} linhas parseadas
                  </p>
                </div>
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                      <tr className="text-left text-slate-500 dark:text-slate-400">
                        {['Ano','Ciclo','Mês','PDV','CP','Canal','Marca','GMV','RPA','Ativas'].map(h => (
                          <th key={h} className="px-3 py-2 whitespace-nowrap font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {parsedRows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-3 py-1.5">{r.ano}</td>
                          <td className="px-3 py-1.5">{r.ciclo}</td>
                          <td className="px-3 py-1.5">{r.mes}</td>
                          <td className="px-3 py-1.5 font-mono">{r.cod_pdv}</td>
                          <td className="px-3 py-1.5 font-mono">{r.cod_cp}</td>
                          <td className="px-3 py-1.5">{r.canal}</td>
                          <td className="px-3 py-1.5">{r.marca}</td>
                          <td className="px-3 py-1.5">{brl(r.gmv)}</td>
                          <td className="px-3 py-1.5">{brl(r.rpa)}</td>
                          <td className="px-3 py-1.5">{r.ativas_totais ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {parsedRows.length === 0 && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                ⚠️ Nenhuma linha válida detectada. Verifique se as colunas <strong>Ciclo</strong>, <strong>Cod. PDV</strong> e <strong>Cod. CP</strong> estão presentes.
              </div>
            )}
          </>
        )}

        {/* Etapa 3 — Importando */}
        {stage === 'importing' && (
          <div className="flex flex-col items-center py-10 text-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 dark:border-slate-700 border-t-ank-500" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Importando metas…</p>
            <div className="w-full max-w-sm">
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-ank-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-1">{progress}%</p>
            </div>
          </div>
        )}

        {/* Etapa 4 — Concluído */}
        {stage === 'done' && result && (
          <div className="flex flex-col items-center py-8 text-center gap-3">
            <CheckCircleIcon className="h-14 w-14 text-emerald-500" />
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">Importação concluída!</p>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-2xl font-black text-emerald-600">{result.ok}</p>
                <p className="text-slate-500">importadas</p>
              </div>
              {result.err > 0 && (
                <div>
                  <p className="text-2xl font-black text-red-500">{result.err}</p>
                  <p className="text-slate-500">com erro</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
