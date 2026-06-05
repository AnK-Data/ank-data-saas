import { supabase } from '../lib/supabaseClient'
import type { Meta, MetaFilters, MetaUpsertData } from '../types'

export const MetasService = {
  /** Lista metas com filtros opcionais, paginado */
  list: async (tenantId: string, filters: MetaFilters = {}, page = 0, pageSize = 50) => {
    let q = supabase
      .from('metas')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('ciclo_key', { ascending: false })
      .order('cod_pdv', { ascending: true })

    if (filters.ano)    q = q.eq('ano',    filters.ano)
    if (filters.ciclo)  q = q.eq('ciclo',  filters.ciclo)
    if (filters.mes)    q = q.eq('mes',    filters.mes)
    if (filters.canal)  q = q.eq('canal',  filters.canal)
    if (filters.marca)  q = q.eq('marca',  filters.marca)
    if (filters.cod_pdv) q = q.ilike('cod_pdv', `%${filters.cod_pdv}%`)

    q = q.range(page * pageSize, (page + 1) * pageSize - 1)

    const { data, count, error } = await q
    return { data: (data ?? []) as Meta[], total: count ?? 0, error }
  },

  /** UPSERT em batch — usa unique constraint (tenant_id, ano, ciclo, cod_pdv, canal, marca) */
  upsert: (rows: MetaUpsertData[]) =>
    supabase.from('metas').upsert(rows, {
      onConflict: 'tenant_id,ano,ciclo,cod_pdv,canal,marca',
      ignoreDuplicates: false,
    }),

  /** Deleta uma meta pelo id */
  remove: (id: string) =>
    supabase.from('metas').delete().eq('id', id),

  /** Anos disponíveis para o tenant (distinct) */
  anosDisponiveis: async (tenantId: string): Promise<number[]> => {
    const { data } = await supabase
      .from('metas')
      .select('ano')
      .eq('tenant_id', tenantId)
      .order('ano', { ascending: false })
    const anos = [...new Set((data ?? []).map((r: { ano: number }) => r.ano))]
    const anoAtual = new Date().getFullYear()
    if (!anos.includes(anoAtual)) anos.unshift(anoAtual)
    return anos
  },

  /** Resumo agregado para os cards de KPI */
  resumo: async (tenantId: string, filters: MetaFilters = {}) => {
    let q = supabase
      .from('metas')
      .select('gmv, rpa, penetracao, cod_pdv')
      .eq('tenant_id', tenantId)

    if (filters.ano)   q = q.eq('ano',   filters.ano)
    if (filters.ciclo) q = q.eq('ciclo', filters.ciclo)
    if (filters.mes)   q = q.eq('mes',   filters.mes)
    if (filters.canal) q = q.eq('canal', filters.canal)
    if (filters.marca) q = q.eq('marca', filters.marca)

    const { data } = await q
    const rows = (data ?? []) as { gmv: number | null; rpa: number | null; penetracao: number | null; cod_pdv: string }[]
    const pdvs = new Set(rows.map(r => r.cod_pdv)).size
    const gmvTotal = rows.reduce((s, r) => s + (r.gmv ?? 0), 0)
    const rpaMedio = rows.filter(r => r.rpa != null).reduce((s, r, _, a) => s + (r.rpa ?? 0) / a.length, 0)
    const penetMed = rows.filter(r => r.penetracao != null).reduce((s, r, _, a) => s + (r.penetracao ?? 0) / a.length, 0)
    return { pdvs, gmvTotal, rpaMedio, penetMed }
  },
}
