import { useState, useEffect } from 'react'
import { ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useVDQuery } from '../venda-direta/hooks/useVDQuery'
import VDFilters from '../venda-direta/components/VDFilters'
import PapelBadge from '../venda-direta/components/PapelBadge'
import Spinner from '../../../components/ui/Spinner'
import type { VDFolhaItem, VDFilters as VDFiltersType } from '../../../types'

type CicloItem = { ciclo: string; receita_bruta: number; receita_liquida: number; volume: number }

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function exportCSV(rows: VDFolhaItem[], ciclo?: string) {
  const headers = ['Tipo', 'Nome', 'CPF', 'Usuario Extranet', 'Papel', 'Estrutura',
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
      r.estrutura, r.receita_bruta, r.receita_liquida, r.volume, r.pedidos,
    ].map(escape).join(',')),
  ]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `folha-vd${ciclo ? `-${ciclo.replace('/', '-')}` : ''}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function FolhaVDSetor() {
  const [filters, setFilters] = useState<VDFiltersType>({})

  const ciclosList = useVDQuery<{ ciclos: CicloItem[] }>({ queryType: 'ciclos_list' })

  useEffect(() => {
    const ciclos = ciclosList.data?.ciclos
    if (ciclos && ciclos.length > 0 && !filters.ciclo) {
      setFilters({ ciclo: ciclos[ciclos.length - 1].ciclo })
    }
  }, [ciclosList.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const folha = useVDQuery<{ data: VDFolhaItem[] }>({
    queryType: 'folha',
    filters,
    enabled: !!filters.ciclo,
  })

  const ciclosDisponiveis = (ciclosList.data?.ciclos ?? []).map(c => c.ciclo)
  const rows = folha.data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Supervisores e revendedoras com desempenho no ciclo selecionado.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { ciclosList.refetch(); folha.refetch() }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2
              text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Atualizar
          </button>
          <button
            disabled={rows.length === 0}
            onClick={() => exportCSV(rows, filters.ciclo)}
            className="flex items-center gap-1.5 rounded-xl franchise-btn-primary px-3 py-2
              text-xs font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      <VDFilters
        filters={filters}
        onChange={f => setFilters(f)}
        ciclosDisponiveis={ciclosDisponiveis}
      />

      {folha.loading && !ciclosList.loading && (
        <div className="flex justify-center py-20"><Spinner /></div>
      )}
      {!folha.loading && folha.error && (
        <p className="text-center text-red-500 py-12">{folha.error}</p>
      )}
      {(ciclosList.loading || (!folha.loading && !folha.error)) && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Papel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Estrutura</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">CPF</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Rec. Bruta</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Rec. Liquida</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Volume</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Pedidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(ciclosList.loading || folha.loading) && (
                <tr><td colSpan={8} className="px-4 py-10 text-center"><Spinner /></td></tr>
              )}
              {!ciclosList.loading && !folha.loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-xs">
                    Nenhum dado encontrado. Selecione um ciclo nos filtros.
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={i} className={[
                  'hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors',
                  r.tipo === 'supervisor' ? 'bg-violet-50/30 dark:bg-violet-950/10 font-medium' : '',
                ].join(' ')}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{r.nome}</p>
                    {r.usuario_extranet && (
                      <p className="text-[11px] text-slate-400">{r.usuario_extranet}</p>
                    )}
                  </td>
                  <td className="px-4 py-3"><PapelBadge papel={r.papel} /></td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{r.estrutura}</td>
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
      )}
    </div>
  )
}
