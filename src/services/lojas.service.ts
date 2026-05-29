import { supabase } from '../lib/supabaseClient'

export type CanalLoja = 'Varejo' | 'Venda Direta'

export interface Loja {
  id: string
  tenant_id: string
  nome: string
  codigo_pdv: string | null
  canal: CanalLoja
  cnpj: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  cidade: string | null
  estado: string | null
  ativo: boolean
  created_at: string
}

export type LojaFormData = Omit<Loja, 'id' | 'tenant_id' | 'created_at'>

export const LojasService = {
  list: (tenantId: string) =>
    supabase.from('lojas').select('*').eq('tenant_id', tenantId).order('nome'),

  create: (tenantId: string, data: Omit<LojaFormData, 'ativo'>) =>
    supabase.from('lojas').insert({ ...data, tenant_id: tenantId, ativo: true }).select().single(),

  update: (id: string, data: Omit<LojaFormData, 'ativo'>) =>
    supabase.from('lojas').update(data).eq('id', id),

  toggle: (id: string, ativo: boolean) =>
    supabase.from('lojas').update({ ativo }).eq('id', id),

  getByUsuario: (usuarioId: string) =>
    supabase.from('usuario_lojas')
      .select('loja_id, loja:lojas(id, nome, codigo_pdv, canal)')
      .eq('usuario_id', usuarioId),

  setLojasForUsuario: async (usuarioId: string, lojaIds: string[]) => {
    await supabase.from('usuario_lojas').delete().eq('usuario_id', usuarioId)
    if (lojaIds.length === 0) return { error: null }
    return supabase.from('usuario_lojas').insert(
      lojaIds.map(loja_id => ({ usuario_id: usuarioId, loja_id }))
    )
  },
} satisfies Record<string, (...args: never[]) => unknown>
