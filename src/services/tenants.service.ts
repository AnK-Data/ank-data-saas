import { supabase } from '../lib/supabaseClient'
import type { Tenant, TenantFormData } from '../types'

export const TenantsService = {
  list: () =>
    supabase
      .from('tenants')
      .select('*')
      .order('nome_franquia', { ascending: true }),

  getById: (id: string) =>
    supabase.from('tenants').select('*').eq('id', id).single(),

  create: (data: TenantFormData) =>
    supabase.from('tenants').insert({
      nome_franquia:          data.nome_franquia.trim(),
      codigo_cp:              data.codigo_cp.trim() || null,
      google_drive_folder_id: data.google_drive_folder_id.trim() || null,
      ativo:                  true,
    }).select().single(),

  update: (id: string, data: Partial<TenantFormData>) =>
    supabase
      .from('tenants')
      .update(data)
      .eq('id', id),

  deactivate: (id: string) =>
    supabase.from('tenants').update({ ativo: false }).eq('id', id),

  activate: (id: string) =>
    supabase.from('tenants').update({ ativo: true }).eq('id', id),

  listActive: () =>
    supabase
      .from('tenants')
      .select('id, nome_franquia, codigo_cp')
      .eq('ativo', true)
      .order('nome_franquia'),
} satisfies Record<string, (...args: never[]) => unknown>

export type { Tenant }
