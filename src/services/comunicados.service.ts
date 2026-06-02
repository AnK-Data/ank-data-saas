import { supabase } from '../lib/supabaseClient'

export type TipoComunicado = 'info' | 'urgente' | 'aviso'

export interface Comunicado {
  id: string
  tenant_id: string
  autor_id: string | null
  titulo: string
  corpo: string
  tipo: TipoComunicado
  para_todos: boolean
  papeis: string[]
  lojas_ids: string[]
  canais: string[]
  publicado: boolean
  created_at: string
  // join
  autor?: { nome: string }
  lido?: boolean   // calculado client-side
}

export interface ComunicadoCreate {
  titulo: string
  corpo: string
  tipo: TipoComunicado
  para_todos: boolean
  papeis: string[]
  lojas_ids: string[]
  canais: string[]
}

export const ComunicadosService = {
  /** Lista comunicados do tenant com info de leitura do usuário atual */
  list: (tenantId: string, _userId?: string) =>
    supabase
      .from('comunicados')
      .select(`
        *,
        autor:profiles!comunicados_autor_id_fkey(nome),
        leitura:comunicados_leitura!left(lido_at)
      `)
      .eq('tenant_id', tenantId)
      .eq('publicado', true)
      .order('created_at', { ascending: false }),

  create: (tenantId: string, autorId: string, data: ComunicadoCreate) =>
    supabase.from('comunicados').insert({
      tenant_id: tenantId,
      autor_id:  autorId,
      ...data,
    }).select().single(),

  update: (id: string, data: Partial<ComunicadoCreate>) =>
    supabase.from('comunicados').update(data).eq('id', id),

  delete: (id: string) =>
    supabase.from('comunicados').delete().eq('id', id),

  /** Marca como lido para o usuário atual */
  marcarLido: (comunicadoId: string, userId: string) =>
    supabase.from('comunicados_leitura').upsert({
      comunicado_id: comunicadoId,
      usuario_id:    userId,
    }),

  /** Verifica quais foram lidos pelo usuário */
  getLidos: (_tenantId: string, userId: string) =>
    supabase
      .from('comunicados_leitura')
      .select('comunicado_id')
      .eq('usuario_id', userId),
} satisfies Record<string, (...args: never[]) => unknown>
