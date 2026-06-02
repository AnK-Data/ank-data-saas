import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import type { Product } from '../../types/product'

interface Props {
  products: Product[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  onPageChange: (p: number) => void
  onPageSizeChange: (ps: number) => void
}

const PAGE_SIZES = [25, 50, 100, 200]

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR }) }
  catch { return d }
}

function FolBadge({ value }: { value: string | null }) {
  if (value === 'S') return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold
      bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/30 dark:text-red-400">
      Fora
    </span>
  )
  return <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
}

export default function ProductTable({
  products, total, page, pageSize, loading, onPageChange, onPageSizeChange,
}: Props) {
  const totalPages = Math.ceil(total / pageSize)
  const from       = page * pageSize + 1
  const to         = Math.min((page + 1) * pageSize, total)

  return (
    <div className="space-y-3">
      {/* Tabela */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {['Código', 'Nome Produto', 'Nome Curto', 'Marca', 'Linha', 'Família',
                  'Seção', 'Grupo', 'Subgrupo', 'IAF-Make', 'IAF-Skin', 'IAF-Cabelos',
                  'Fora de Linha', 'Alteração'].map(h => (
                  <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center">
                    <div className="flex justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-ank-500 border-t-transparent" />
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    Nenhum produto encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : products.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {p.codigo_produto ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 max-w-[220px] truncate"
                    title={p.nome_produto ?? ''}>
                    {p.nome_produto}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[160px] truncate text-xs"
                    title={p.nome_curto_produto ?? ''}>
                    {p.nome_curto_produto ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">{p.marca ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">{p.linha ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">{p.familia ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">{p.secao ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">{p.grupo ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">{p.subgrupo ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">{p.iaf_make ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">{p.iaf_skin ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">{p.iaf_cabelos ?? '—'}</td>
                  <td className="px-4 py-3"><FolBadge value={p.fora_de_linha} /></td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                    {fmtDate(p.data_alteracao)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {total > 0 ? `${from.toLocaleString('pt-BR')}–${to.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} produtos` : '0 produtos'}
          </span>
          <span>·</span>
          <span>Itens por página:</span>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800
              text-slate-900 dark:text-slate-100 px-2 py-1 text-xs"
          >
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400
              hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          {/* Páginas */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p: number
            if (totalPages <= 5) p = i
            else if (page < 3) p = i
            else if (page >= totalPages - 3) p = totalPages - 5 + i
            else p = page - 2 + i
            return (
              <button key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
                  ${p === page
                    ? 'text-white'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                style={p === page ? { backgroundColor: 'var(--admin-primary, #5086C6)' } : {}}
              >
                {p + 1}
              </button>
            )
          })}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400
              hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
