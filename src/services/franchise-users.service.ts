import { supabase } from '../lib/supabaseClient'
import type { UserRole } from '../types'
import { FRANQUEADO_ROLES } from '../types'
import { padronizarNome, padronizarNomeCurto } from './ingresse.service'

export interface LojaResolvida {
  id: string | null
  nome: string | null
  codigo_pdv: string | null
}

/** Usuário que vem da função get_franchise_users_full (union de ingresse_colaboradores + profiles) */
export interface FranchiseUser {
  // Campos Ingresse (sempre presentes)
  ingresse_id:   string
  nome:          string
  nome_curto:    string | null
  cpf:           string | null
  cargo:         string | null
  status:        'Ativo' | 'Inativo'
  franquia_code: string | null          // código PDV bruto da planilha
  // Campos de profile (null se não criou conta ainda)
  profile_id:    string | null
  papel:         UserRole | null
  first_access:  boolean | null
  account_status: 'Ativo' | 'Inativo' | null
  lojas_json:    LojaResolvida[] | null  // lojas com nomes resolvidos (ProcX)
  // Aliases
  id:            string
  usuario_extranet: string | null
  cargo_ingresse: string | null
  tipo_usuario:  'ingresse' | 'manual_ingresse' | 'prestador' | 'ank'
  tenant_id:     string | null
  modulos?:      { slug_modulo: string }[]
}

const FRANCHISE_ROLES: UserRole[] = FRANQUEADO_ROLES

export const FranchiseUsersService = {
  /** Lista todos os colaboradores do tenant (ingresse_colaboradores ∪ profiles) */
  list: async (tenantId: string) => {
    const { data, error } = await supabase
      .rpc('get_franchise_users_full', { p_tenant_id: tenantId })

    if (error) return { data: null, error }

    const users: FranchiseUser[] = (data ?? []).map((row: {
      ingresse_id: string; nome: string; nome_curto: string | null
      cpf: string | null; cargo: string | null; status: string
      franquia_code: string | null; profile_id: string | null
      papel: string | null; first_access: boolean | null
      account_status: string | null; lojas_json: LojaResolvida[] | null
    }) => {
      // Padroniza no display independente do que está no banco
      const nomePad  = padronizarNome(row.nome ?? '')
      const curtoPad = row.nome_curto
        ? padronizarNomeCurto(padronizarNome(row.nome_curto))
        : padronizarNomeCurto(nomePad)

      return ({
      ingresse_id:    row.ingresse_id,
      nome:           nomePad,
      nome_curto:     curtoPad || null,
      cpf:            row.cpf,
      cargo:          row.cargo,
      status:         (row.status ?? 'Ativo') as 'Ativo' | 'Inativo',
      franquia_code:  row.franquia_code,
      profile_id:     row.profile_id,
      papel:          (row.papel ?? null) as UserRole | null,
      first_access:   row.first_access,
      account_status: (row.account_status ?? null) as 'Ativo' | 'Inativo' | null,
      lojas_json:     row.lojas_json,
      id:             row.profile_id ?? row.ingresse_id,
      usuario_extranet: row.ingresse_id,
      cargo_ingresse: row.cargo,
      tipo_usuario:   'ingresse' as const,
      tenant_id:      tenantId,
    })}  )

    return { data: users, error: null }
  },

  /** Cria usuário operacional via signUp + atualiza perfil */
  create: async (params: {
    nome: string
    email: string
    senha: string
    papel: UserRole
    tenant_id: string
    lojaIds: string[]
    slugModulos: string[]
    ingresse_id?: string   // Código de identificação no Ingresse
  }) => {
    // 1. Cria conta no Auth
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.senha,
      options: { data: { full_name: params.nome } },
    })
    if (error || !data.user) return { error: error ?? new Error('Falha ao criar usuário') }

    await new Promise(r => setTimeout(r, 800))

    // 2. Atualiza o perfil (inclui ingresse_id se fornecido)
    const profileUpdate: Record<string, unknown> = {
      nome:      params.nome,
      papel:     params.papel,
      tenant_id: params.tenant_id,
    }
    if (params.ingresse_id) profileUpdate.ingresse_id = params.ingresse_id

    const { error: pErr } = await supabase.from('profiles').update(profileUpdate).eq('id', data.user.id)
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

  /** Atualiza papel, lojas, módulos e dados manuais de um usuário */
  update: async (usuarioId: string, params: {
    nome: string
    papel: UserRole
    lojaIds: string[]
    slugModulos: string[]
    usuario_extranet?: string
    cpf?: string
    cargo_ingresse?: string
  }) => {
    const profileUpdate: Record<string, unknown> = {
      nome:  params.nome,
      papel: params.papel,
    }
    if (params.usuario_extranet !== undefined) profileUpdate.usuario_extranet = params.usuario_extranet
    if (params.cpf !== undefined)             profileUpdate.cpf = params.cpf
    if (params.cargo_ingresse !== undefined)  profileUpdate.cargo_ingresse = params.cargo_ingresse

    const { error: pErr } = await supabase.from('profiles').update(profileUpdate).eq('id', usuarioId)
    if (pErr) return { error: pErr }

    await supabase.from('usuario_lojas').delete().eq('usuario_id', usuarioId)
    if (params.lojaIds.length > 0) {
      await supabase.from('usuario_lojas').insert(
        params.lojaIds.map(loja_id => ({ usuario_id: usuarioId, loja_id }))
      )
    }

    await supabase.from('permissoes_usuario').delete().eq('usuario_id', usuarioId)
    if (params.slugModulos.length > 0) {
      await supabase.from('permissoes_usuario').insert(
        params.slugModulos.map(slug_modulo => ({ usuario_id: usuarioId, slug_modulo }))
      )
    }

    return { error: null }
  },

  /** Inativa um usuário manualmente (bloqueia login) */
  inactivate: async (usuarioId: string) => {
    const { error } = await supabase.from('profiles')
      .update({ status: 'Inativo' }).eq('id', usuarioId)
    return { error }
  },

  /** Reativa um usuário inativado manualmente */
  reactivate: async (usuarioId: string) => {
    const { error } = await supabase.from('profiles')
      .update({ status: 'Ativo' }).eq('id', usuarioId)
    return { error }
  },

  /** Reseta o acesso: obriga usuário a redefinir senha no próximo login */
  resetAccess: async (usuarioId: string) => {
    const { error } = await supabase.from('profiles')
      .update({ first_access: true }).eq('id', usuarioId)
    return { error }
  },

  FRANCHISE_ROLES,
} satisfies Record<string, unknown>
