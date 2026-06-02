import { supabase } from '../lib/supabaseClient'
import type { TenantCompliance, UploadLog } from '../types'

export const ComplianceService = {
  check: () =>
    supabase.rpc('check_tenant_compliance') as unknown as Promise<{
      data: TenantCompliance[] | null
      error: unknown
    }>,

  recentLogs: (limit = 50) =>
    supabase
      .from('upload_logs')
      .select('*, tenant:tenants(id, nome_franquia)')
      .order('data_upload', { ascending: false })
      .limit(limit),

  logsByTenant: (tenantId: string, limit = 20) =>
    supabase
      .from('upload_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('data_upload', { ascending: false })
      .limit(limit),
} satisfies Record<string, (...args: never[]) => unknown>

export type { TenantCompliance, UploadLog }
