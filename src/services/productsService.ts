import { supabase } from '../lib/supabaseClient'
import type { Product, ProductFilters, ProductPage, ProductFilterOptions } from '../types/product'

const BATCH_SIZE = 1000

// ─── Listagem com filtros e paginação server-side ────────────────────────────

export async function listProducts(
  filters: ProductFilters,
  page: number,
  pageSize: number,
): Promise<ProductPage> {
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })

  // Busca full-text ou ilike
  if (filters.search.trim()) {
    const s = filters.search.trim()
    const isNumeric = /^\d+$/.test(s)
    if (isNumeric) {
      query = query.eq('codigo_produto', parseInt(s))
    } else {
      query = query.or(
        `nome_produto.ilike.%${s}%,nome_curto_produto.ilike.%${s}%`
      )
    }
  }

  if (filters.marca_estrutura) query = query.eq('marca_estrutura', filters.marca_estrutura)
  if (filters.linha)           query = query.eq('linha',           filters.linha)
  if (filters.secao)           query = query.eq('secao',           filters.secao)

  const from = page * pageSize
  const to   = from + pageSize - 1

  const { data, count, error } = await query
    .order('codigo_produto', { ascending: true, nullsFirst: false })
    .range(from, to)

  if (error) throw error

  return {
    data:     (data ?? []) as Product[],
    total:    count ?? 0,
    page,
    pageSize,
  }
}

// ─── Opções únicas para filtros ───────────────────────────────────────────────

export async function getFilterOptions(): Promise<ProductFilterOptions> {
  // Busca valores distintos apenas para os 3 filtros exibidos
  const col = async (column: string): Promise<string[]> => {
    const { data } = await supabase
      .from('products')
      .select(column)
      .not(column, 'is', null)
      .order(column)
      .limit(5000)
    const unique = [...new Set((data ?? []).map((r: unknown) => (r as Record<string, string>)[column]).filter(Boolean))]
    return (unique as string[]).sort()
  }

  const [marcas, linhas, secoes] = await Promise.all([
    col('marca_estrutura'),   // BOT, EUD, OUI, QDB — código principal
    col('linha'),
    col('secao'),
  ])

  return { marcas, linhas, familias: [], secoes, grupos: [], subgrupos: [] }
}

// ─── Importação em lote ───────────────────────────────────────────────────────

export async function truncateProducts(): Promise<void> {
  const { error } = await supabase.rpc('truncate_products')
  if (error) throw error
}

export async function bulkInsertProducts(
  rows: Omit<Product, 'id' | 'created_at' | 'updated_at'>[],
  onProgress: (done: number, total: number) => void,
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0
  let errors   = 0
  const total  = rows.length

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('products').insert(batch)
    if (error) {
      errors += batch.length
      console.warn('[products] batch error:', error.message)
    } else {
      inserted += batch.length
    }
    onProgress(Math.min(i + BATCH_SIZE, total), total)
  }

  return { inserted, errors }
}
