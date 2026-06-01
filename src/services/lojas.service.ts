import { supabase } from '../lib/supabaseClient'

export type CanalLoja = 'Varejo' | 'Venda Direta' | 'Híbrido'

export const CANAIS_OPCOES = ['Varejo', 'Venda Direta'] as const
export type CanalOpcao = typeof CANAIS_OPCOES[number]

export function canaisParaCanalLoja(selecionados: CanalOpcao[]): CanalLoja {
  if (selecionados.includes('Varejo') && selecionados.includes('Venda Direta')) return 'Híbrido'
  if (selecionados.includes('Venda Direta')) return 'Venda Direta'
  return 'Varejo'
}

export function canalLojaParaOpcoes(canal: CanalLoja): CanalOpcao[] {
  if (canal === 'Híbrido') return ['Varejo', 'Venda Direta']
  return [canal]
}

export interface Loja {
  id: string
  tenant_id: string
  nome: string
  codigo_pdv: string | null
  canal: CanalLoja
  nicho:   string | null   // ex: Perfumaria, Cosméticos, Misto
  cluster: string | null   // ex: Ouro, Prata, Bronze, A, B, C
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

  /** Importação em lote — insere múltiplas lojas de uma vez */
  bulkCreate: (tenantId: string, lojas: Omit<LojaFormData, 'ativo'>[]) =>
    supabase.from('lojas').insert(
      lojas.map(l => ({ ...l, tenant_id: tenantId, ativo: true }))
    ).select(),

  getByUsuario: (usuarioId: string) =>
    supabase.from('usuario_lojas')
      .select('loja_id, loja:lojas(id, nome, codigo_pdv, canal, nicho, cluster)')
      .eq('usuario_id', usuarioId),

  setLojasForUsuario: async (usuarioId: string, lojaIds: string[]) => {
    await supabase.from('usuario_lojas').delete().eq('usuario_id', usuarioId)
    if (lojaIds.length === 0) return { error: null }
    return supabase.from('usuario_lojas').insert(
      lojaIds.map(loja_id => ({ usuario_id: usuarioId, loja_id }))
    )
  },
} satisfies Record<string, (...args: never[]) => unknown>
