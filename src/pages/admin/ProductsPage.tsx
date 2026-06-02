import { useState } from 'react'
import {
  ArchiveBoxIcon, ArrowUpTrayIcon, ClockIcon,
} from '@heroicons/react/24/outline'
import { useProducts } from '../../hooks/useProducts'
import ProductFiltersComponent from '../../components/products/ProductFilters'
import ProductTable from '../../components/products/ProductTable'
import ProductUpload from '../../components/products/ProductUpload'
import ImportHistory from '../../components/products/ImportHistory'

type Tab = 'lista' | 'upload' | 'historico'

const TABS = [
  { id: 'lista',     icon: ArchiveBoxIcon,  label: 'Lista de Produtos'       },
  { id: 'upload',    icon: ArrowUpTrayIcon, label: 'Upload de Produtos'      },
  { id: 'historico', icon: ClockIcon,       label: 'Histórico de Importações' },
] as const

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>('lista')

  const {
    products, total, page, pageSize, loading,
    filters, filterOpts,
    applyFilters, resetFilters, changePage, changePageSize, reload,
  } = useProducts()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ank-100 dark:bg-ank-900/40 shrink-0">
          <ArchiveBoxIcon className="h-6 w-6 text-ank-600 dark:text-ank-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Base Mestre de Produtos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Base global da ANK Data — todos os módulos consultam esta fonte.
            {total > 0 && (
              <span className="ml-2 font-medium text-ank-600 dark:text-ank-400">
                {total.toLocaleString('pt-BR')} produtos cadastrados
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab === t.id
                ? 'border-ank-600 text-ank-600 dark:text-ank-400 dark:border-ank-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}>
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ABA LISTA ─────────────────────────────────────────────── */}
      {tab === 'lista' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <ProductFiltersComponent
              filters={filters}
              options={filterOpts}
              onApply={applyFilters}
              onReset={resetFilters}
            />
          </div>

          {/* Tabela */}
          <ProductTable
            products={products}
            total={total}
            page={page}
            pageSize={pageSize}
            loading={loading}
            onPageChange={changePage}
            onPageSizeChange={changePageSize}
          />
        </div>
      )}

      {/* ── ABA UPLOAD ────────────────────────────────────────────── */}
      {tab === 'upload' && (
        <div className="space-y-5">
          {/* Aviso das colunas esperadas */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Colunas obrigatórias no arquivo XLSX
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Cod. Produto', 'Nome Produto', 'NomeCurto Produto', 'Unidade',
                'Fora de Linha', 'Linha', 'Familia', 'Secao', 'Grupo', 'Subgrupo',
                'Inclusao', 'Alteracao', 'Marca_Estrutura', 'Marca',
                'IAF_Make', 'IAF_Skin', 'IAF_Cabelos',
              ].map(c => (
                <span key={c} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-slate-600 dark:text-slate-300">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <ProductUpload onImportComplete={() => { reload(); setTab('historico') }} />
        </div>
      )}

      {/* ── ABA HISTÓRICO ─────────────────────────────────────────── */}
      {tab === 'historico' && <ImportHistory />}
    </div>
  )
}
