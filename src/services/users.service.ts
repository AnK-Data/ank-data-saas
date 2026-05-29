import { supabase } from '../lib/supabaseClient'
import type { Profile, UserRole } from '../types'

export const UsersService = {
  /** Lista todos os perfis com nome da franquia vinculada */
  list: () =>
    supabase
      .from('profiles')
      .select('*, tenant:tenants(id, nome_franquia)')
      .order('nome', { ascending: true }),

  getById: (id: string) =>
    supabase.from('profiles').select('*, tenant:tenants(id, nome_franquia)').eq('id', id).single(),

  /**
   * Convida um novo usuário via Supabase Auth signUp.
   * O trigger cria o perfil automaticamente.
   * Em seguida, atualiza tenant_id e papel via UPDATE (requer policy ank_admin_update_all_profiles).
   */
  /**
   * Convida um novo usuário via Supabase Auth signUp.
   *
   * Papéis criáveis pelo Admin ROOT:
   *  - 'ank_admin'      → sem tenant_id (acesso ao Admin ROOT)
   *  - 'admin_franquia' → com tenant_id obrigatório (acessa o painel franqueado)
   *
   * Usuários operacionais (gerente, vendedor, controller) são criados pelo
   * próprio admin_franquia dentro do painel franqueado — não aqui.
   */
  invite: async (params: {
    nome: string
    email: string
    senha: string
    tenant_id: string  // string vazia para ank_admin
    papel: UserRole
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email:    params.email,
      password: params.senha,
      options:  { data: { full_name: params.nome } },
    })

    if (error || !data.user) return { data: null, error: error ?? new Error('Falha ao criar usuário') }

    // Aguarda trigger criar o perfil (~800ms)
    await new Promise(r => setTimeout(r, 800))

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        nome:      params.nome,
        papel:     params.papel,
        tenant_id: params.tenant_id || null,   // null para ank_admin
      })
      .eq('id', data.user.id)

    return { data: data.user, error: profileError }
  },

  updateProfile: (id: string, data: { nome?: string; papel?: UserRole; tenant_id?: string | null }) =>
    supabase.from('profiles').update(data).eq('id', id),

  removeFromTenant: (id: string) =>
    supabase.from('profiles').update({ tenant_id: null }).eq('id', id),
} satisfies Record<string, (...args: never[]) => unknown>

export type { Profile }
