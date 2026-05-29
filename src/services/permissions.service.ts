import { supabase } from '../lib/supabaseClient'

export const PermissionsService = {
  /** Retorna os slugs de módulo liberados para um papel */
  getSlugsForPapel: (papel: string) =>
    supabase
      .from('permissoes_papel')
      .select('slug_modulo')
      .eq('papel', papel),

  /** Lista todos os módulos cadastrados */
  listModulos: () =>
    supabase
      .from('modulos')
      .select('*')
      .order('nome'),

  /** Lista todas as permissões (para tela de configuração futura) */
  listAll: () =>
    supabase
      .from('permissoes_papel')
      .select('*, modulo:modulos(slug_modulo, nome)')
      .order('papel'),

  grant: (papel: string, slug_modulo: string) =>
    supabase
      .from('permissoes_papel')
      .insert({ papel, slug_modulo })
      .select()
      .single(),

  revoke: (papel: string, slug_modulo: string) =>
    supabase
      .from('permissoes_papel')
      .delete()
      .eq('papel', papel)
      .eq('slug_modulo', slug_modulo),
} satisfies Record<string, (...args: never[]) => unknown>
