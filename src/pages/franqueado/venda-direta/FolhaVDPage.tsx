import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon, ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useVDQuery } from './hooks/useVDQuery'
import VDFilters from './components/VDFilters'
import PapelBadge from './components/PapelBadge'
import Spinner from '../../../components/ui/Spinner'
import type { VDFolhaItem, VDFilters as VDFiltersType } from '../../../types'

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function exportCSV(rows: VDFolhaItem[]) {
  const headers = ['Tipo', 'Nome', 'CPF', 'Usuario Extranet', 'Papel', 'Estrutura', 'Canal',
    'Receita Bruta', 'Receita Liquida', 'Volume', 'Pedidos']
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      r.tipo, r.nome, r.cpf ?? '', r.usuario_extranet ?? '', r.papel,
      r.estrutura, r.canal, r.receita_bruta, r.receita_liquida, r.volume, r.pedidos,
    ].map(escape).join(',')),
  ]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'folha-vd.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function FolhaVDPage() {
  const [filters, setFilters] = useState<VDFiltersType>({})

  // Para popular os ciclos disponiveis
  const overview = useVDQuery<{ ciclos_disponiveis: string[]; por_marca: Array<{ marca: string }> }>({
    queryType: 'overview',
    filters,
  })

  const folha = useVDQuery<{ data: VDFolhaItem[] }>({
    queryType: 'folha',
    filters,
  })

  const ciclosDisponiveis = overview.data?.ciclos_disponiveis ?? []
  const marcasDisponiveis = (overview.data?.por_marca ?? []).map(m => m.marca)

  const rows = folha.data?.data ?? []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/franqueado/venda-direta"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Venda Direta
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Folha VD</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { overview.refetch(); folha.refetch() }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2
              text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Atualizar
          </button>
          <button
            disabled={rows.length === 0}
            onClick={() => exportCSV(rows)}
            className="flex items-center gap-1.5 rounded-xl franchise-btn-primary px-3 py-2
              text-xs font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros */}
      <VDFilters
        filters={filters}
        onChange={f => setFilters(f)}
        ciclosDisponiveis={ciclosDisponiveis}
        marcasDisponiveis={marcasDisponiveis}
      />

      {/* Tabela */}
      {folha.loading
        ? <div className="flex justify-center py-20"><Spinner /></div>
        : folha.error
          ? <p className="text-center text-red-500 py-12">{folha.error}</p>
          : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Papel</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Estrutura</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Canal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">CPF</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Rec. Bruta</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Rec. Liquida</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Volume</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Pedidos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-xs">
                        {folha.loading ? '' : 'Nenhum dado encontrado. Selecione um ciclo nos filtros.'}
                      </td>
                    </tr>
                  )}
                  {rows.map((r, i) => (
                    <tr key={i} className={[
                      'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors',
                      r.tipo === 'supervisor'
                        ? 'bg-violet-50/30 dark:bg-violet-950/10 font-medium'
                        : '',
                    ].join(' ')}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{r.nome}</p>
                        {r.usuario_extranet && (
                          <p className="text-[11px] text-slate-400">{r.usuario_extranet}</p>
                        )}
                      </td>
                      <td className="px-4 py-3"><PapelBadge papel={r.papel} /></td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{r.estrutura}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{r.canal}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">{r.cpf ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">{brl(r.receita_bruta)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{brl(r.receita_liquida)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{r.volume.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">{r.pedidos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }
    </div>
  )
}
