import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { listImports } from '../../services/productImportService'
import type { ProductImport } from '../../types/productImport'
import Spinner from '../ui/Spinner'

const STATUS_CFG: Record<string, { label: string; badge: string }> = {
  concluido:   { label: 'Concluído',   badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400' },
  processando: { label: 'Processando', badge: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-400'               },
  erro:        { label: 'Erro',        badge: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-400'                    },
  pendente:    { label: 'Pendente',    badge: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400'           },
}

function fmtSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function ImportHistory() {
  const [imports, setImports] = useState<ProductImport[]>([])
  const [loading, setLoading] = useState(true)

  async function fetch() {
    setLoading(true)
    const data = await listImports()
    setImports(data)
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  if (loading) return <Spinner fullScreen />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Últimas {imports.length} importações registradas
        </p>
        <button onClick={fetch}
          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400
            hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          <ArrowPathIcon className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {['Data', 'Arquivo', 'Tamanho', 'Usuário', 'Total', 'Importados', 'Erros', 'Status', 'Observação'].map(h => (
                  <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {imports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    Nenhuma importação realizada ainda.
                  </td>
                </tr>
              ) : imports.map(imp => {
                const cfg = STATUS_CFG[imp.status] ?? STATUS_CFG.pendente
                return (
                  <tr key={imp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400">
                      {format(parseISO(imp.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                      title={imp.arquivo_nome}>
                      {imp.arquivo_nome}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {fmtSize(imp.arquivo_tamanho)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {(imp as ProductImport & { usuario?: { nome: string } | null }).usuario?.nome ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-800 dark:text-slate-200 text-right">
                      {imp.total_registros.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 text-right">
                      {imp.registros_importados.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-right">
                      {imp.registros_com_erro > 0
                        ? <span className="text-red-600 dark:text-red-400">{imp.registros_com_erro.toLocaleString('pt-BR')}</span>
                        : <span className="text-slate-300 dark:text-slate-600">0</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 max-w-[180px] truncate"
                      title={imp.observacao ?? ''}>
                      {imp.observacao ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
