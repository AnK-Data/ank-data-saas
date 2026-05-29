import { supabase } from '../lib/supabaseClient'
import type { UserRole } from '../types'

export interface FranchiseUser {
  id: string
  nome: string
  papel: UserRole
  tenant_id: string | null
  created_at: string
  // joins
  lojas?: { loja_id: string; loja: { id: string; nome: string } }[]
  modulos?: { slug_modulo: string }[]
}

const FRANCHISE_ROLES: UserRole[] = ['gerente', 'vendedor', 'controller_financeiro']

export const FranchiseUsersService = {
  /** Lista usuários operacionais da franquia (exclui admin_franquia) */
  list: (tenantId: string) =>
    supabase
      .from('profiles')
      .select('*, usuario_lojas(loja_id, loja:lojas(id, nome)), permissoes_usuario(slug_modulo)')
      .eq('tenant_id', tenantId)
      .in('papel', FRANCHISE_ROLES)
      .order('nome'),

  /** Cria usuário operacional via signUp + atualiza perfil */
  create: async (params: {
    nome: string
    email: string
    senha: string
    papel: UserRole
    tenant_id: string
    lojaIds: string[]
    slugModulos: string[]
  }) => {
    // 1. Cria conta no Auth
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.senha,
      options: { data: { full_name: params.nome } },
    })
    if (error || !data.user) return { error: error ?? new Error('Falha ao criar usuário') }

    await new Promise(r => setTimeout(r, 800))

    // 2. Atualiza o perfil
    const { error: pErr } = await supabase.from('profiles').update({
      nome:      params.nome,
      papel:     params.papel,
      tenant_id: params.tenant_id,
    }).eq('id', data.user.id)
    if (pErr) return { error: pErr }

    // 3. Atribui lojas
    if (params.lojaIds.length > 0) {
      await supabase.from('usuario_lojas').insert(
        params.lojaIds.map(loja_id => ({ usuario_id: data.user!.id, loja_id }))
      )
    }

    // 4. Atribui módulos (override do papel)
    if (params.slugModulos.length > 0) {
      await supabase.from('permissoes_usuario').insert(
        params.slugModulos.map(slug_modulo => ({ usuario_id: data.user!.id, slug_modulo }))
      )
    }

    return { error: null }
  },

  /** Atualiza papel, lojas e módulos de um usuário */
  update: async (usuarioId: string, params: {
    nome: string
    papel: UserRole
    lojaIds: string[]
    slugModulos: string[]
  }) => {
    const { error: pErr } = await supabase.from('profiles')
      .update({ nome: params.nome, papel: params.papel }).eq('id', usuarioId)
    if (pErr) return { error: pErr }

    // Replace lojas
    await supabase.from('usuario_lojas').delete().eq('usuario_id', usuarioId)
    if (params.lojaIds.length > 0) {
      await supabase.from('usuario_lojas').insert(
        params.lojaIds.map(loja_id => ({ usuario_id: usuarioId, loja_id }))
      )
    }

    // Replace módulos
    await supabase.from('permissoes_usuario').delete().eq('usuario_id', usuarioId)
    if (params.slugModulos.length > 0) {
      await supabase.from('permissoes_usuario').insert(
        params.slugModulos.map(slug_modulo => ({ usuario_id: usuarioId, slug_modulo }))
      )
    }

    return { error: null }
  },

  FRANCHISE_ROLES,
} satisfies Record<string, unknown>
