// ─── Domain enums ──────────────────────────────────────────────────────────────

export type UserRole =
  | 'ank_admin'           // Administrador interno ANK Data — acesso ao Admin ROOT
  | 'admin_franquia'      // Admin master de uma franquia — acessa o painel franqueado
  | 'gerente'             // Operacional da franquia (futuro painel franqueado)
  | 'vendedor'            // Operacional da franquia
  | 'controller_financeiro' // Operacional da franquia

export type LicenseStatus = 'ACTIVE' | 'ALERT' | 'CRITICAL' | 'EXPIRED' | 'SUSPENDED'

export type ComplianceStatus = 'OK' | 'COMPROMETIDO'


// ─── Database row shapes ───────────────────────────────────────────────────────

export interface Tenant {
  id: string
  nome_franquia: string
  codigo_cp: string | null
  google_drive_folder_id: string | null
  ativo: boolean
  created_at: string
}

export interface License {
  id: string
  tenant_id: string
  status: LicenseStatus
  data_fim_ciclo: string        // type: date — "YYYY-MM-DD"
  meses_contrato: number | null
  valor_contrato: number | null // valor TOTAL do contrato
  created_at: string
  tenant?: Pick<Tenant, 'id' | 'nome_franquia' | 'codigo_cp'>
}

export interface Profile {
  id: string
  tenant_id: string | null
  nome: string
  papel: UserRole
  created_at: string
  tenant?: Pick<Tenant, 'id' | 'name'>
}

export interface UploadLog {
  id: string
  tenant_id: string
  usuario_id: string
  nome_arquivo: string
  data_upload: string
  tenant?: Pick<Tenant, 'id' | 'name'>
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────

export interface Modulo {
  id: string
  slug_modulo: string
  nome: string
  descricao: string | null
  created_at: string
}

export interface PermissaoPapel {
  id: string
  papel: string
  slug_modulo: string
  created_at: string
}

// ─── RPC return types ──────────────────────────────────────────────────────────

export interface TenantCompliance {
  tenant_id: string
  tenant_name: string
  last_upload_date: string | null
  days_since_upload: number | null
  compliance_status: ComplianceStatus
  // merged client-side
  codigo_cp?: string | null
}

// ─── Form payloads ─────────────────────────────────────────────────────────────

export interface TenantFormData {
  nome_franquia: string
  codigo_cp: string
  google_drive_folder_id: string
}

export interface LicenseCreateData {
  tenant_id: string
  meses_contrato: number
  valor_mensal: number | null   // valor por mês (UI)
  // valor_contrato = valor_mensal * meses (calculado no service)
}

export interface LicenseEditData {
  status: LicenseStatus
  data_fim_ciclo: string
  valor_contrato: number | null
}

export interface UserInviteData {
  nome: string
  email: string
  tenant_id: string
  papel: UserRole
}
