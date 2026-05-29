import { addMonths, format } from 'date-fns'
import { supabase } from '../lib/supabaseClient'
import type { License, LicenseCreateData, LicenseEditData, LicenseStatus } from '../types'

export const LicensesService = {
  list: () =>
    supabase
      .from('licenses')
      .select('*, tenant:tenants(id, nome_franquia, codigo_cp)')
      .order('created_at', { ascending: false }),

  getByTenant: (tenantId: string) =>
    supabase
      .from('licenses')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle(),   // evita 406 quando não há licença

  create: (data: LicenseCreateData) => {
    const dataFim      = addMonths(new Date(), data.meses_contrato)
    const valorTotal   = data.valor_mensal != null
      ? data.valor_mensal * data.meses_contrato
      : null

    return supabase.from('licenses').insert({
      tenant_id:      data.tenant_id,
      status:         'ACTIVE' as LicenseStatus,
      data_fim_ciclo: format(dataFim, 'yyyy-MM-dd'),
      meses_contrato: data.meses_contrato,
      valor_contrato: valorTotal,
    }).select().single()
  },

  update: (id: string, data: LicenseEditData) =>
    supabase
      .from('licenses')
      .update({
        status:         data.status,
        data_fim_ciclo: data.data_fim_ciclo,
        valor_contrato: data.valor_contrato,
      })
      .eq('id', id),

  setStatus: (id: string, status: LicenseStatus) =>
    supabase
      .from('licenses')
      .update({ status })
      .eq('id', id),
} satisfies Record<string, (...args: never[]) => unknown>

export type { License }
