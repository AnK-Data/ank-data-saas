// ─── Domínio ANK Data (usuários internos) ─────────────────────────────────────

export type AnkRole =
  | 'ank_admin'       // Acesso total — gerencia tenants, licenças e plataforma
  | 'ank_suporte'     // Leitura ampla para diagnóstico de franquias
  | 'ank_comercial'   // Gestão de tenants, contratos e renovações
  | 'ank_financeiro'  // Visão de contratos, valores e status de licenças
  | 'ank_tech'        // Acesso técnico — logs, infra, feature flags

// ─── Domínio Franqueado — Cargos Boticário ────────────────────────────────────

/** Canal de atuação do usuário franqueado */
export type Canal =
  | 'loja'          // Varejo / Loja física
  | 'venda_direta'  // Canal de revendedoras
  | 'logistica'     // Logística e estoque
  | 'admin_cp'      // Administrativo / CP (visão ampla)

/** Cargos do canal Loja (Varejo) */
export type CargoLoja =
  | 'consultor_loja'                  // Consultor de Vendas de Loja — só próprios valores
  | 'gerente_loja'                    // Gerente de Loja — sua loja + consultores (multi-PDV)
  | 'supervisor_loja'                 // Supervisor de Loja — algumas lojas (multi-PDV)
  | 'multiplicador_treinamento_loja'  // Multiplicador de Treinamento de Loja — algumas lojas
  | 'gerente_canal_loja'              // Gerente Canal Loja — todas as lojas do canal

/** Cargos do canal Venda Direta */
export type CargoVendaDireta =
  | 'atendente_vd'                    // Atendente de Venda Direta — só próprios valores
  | 'supervisor_campo'                // Supervisor de Campo — próprias estruturas (por metas)
  | 'gerente_er'                      // Gerente de ER — sua(s) VD + atendentes
  | 'gerente_operacoes_vd'            // Gerente de Vendas e Operações de VD — sua VD + equipe
  | 'gerente_canal_vd'                // Gerente Canal VD — toda a VD do canal
  | 'multiplicador_treinamento_vd'    // Multiplicador de Treinamento de VD — algumas VDs

/** Cargos Administrativos / CP */
export type CargoAdminCP =
  | 'franqueado'                      // Visão comercial geral
  | 'sucessor'                        // Visão comercial geral
  | 'funcionario_administrativo_cp'   // Varejo + VD
  | 'funcionario_financeiro_cp'       // Varejo + VD (foco financeiro)

/** Cargos de Logística (escopo de acesso a definir) */
export type CargoLogistica =
  | 'auxiliar_logistica'
  | 'estoquista'
  | 'assistente_logistica'
  | 'lider_logistica'
  | 'gerente_logistica'

export type FranqueadoRole =
  | CargoLoja
  | CargoVendaDireta
  | CargoAdminCP
  | CargoLogistica

/** Union completa de todos os papéis do sistema */
export type UserRole = AnkRole | FranqueadoRole

// ─── Helpers de classificação ─────────────────────────────────────────────────

export const ANK_ROLES: AnkRole[] = [
  'ank_admin', 'ank_suporte', 'ank_comercial', 'ank_financeiro', 'ank_tech',
]

export const FRANQUEADO_ROLES_LOJA: CargoLoja[] = [
  'consultor_loja', 'gerente_loja', 'supervisor_loja',
  'multiplicador_treinamento_loja', 'gerente_canal_loja',
]

export const FRANQUEADO_ROLES_VD: CargoVendaDireta[] = [
  'atendente_vd', 'supervisor_campo', 'gerente_er',
  'gerente_operacoes_vd', 'gerente_canal_vd', 'multiplicador_treinamento_vd',
]

export const FRANQUEADO_ROLES_ADMIN: CargoAdminCP[] = [
  'franqueado', 'sucessor', 'funcionario_administrativo_cp', 'funcionario_financeiro_cp',
]

export const FRANQUEADO_ROLES_LOGISTICA: CargoLogistica[] = [
  'auxiliar_logistica', 'estoquista', 'assistente_logistica',
  'lider_logistica', 'gerente_logistica',
]

export const FRANQUEADO_ROLES: FranqueadoRole[] = [
  ...FRANQUEADO_ROLES_LOJA,
  ...FRANQUEADO_ROLES_VD,
  ...FRANQUEADO_ROLES_ADMIN,
  ...FRANQUEADO_ROLES_LOGISTICA,
]

export function isAnkRole(role: UserRole): role is AnkRole {
  return (ANK_ROLES as UserRole[]).includes(role)
}

export function isFranqueadoRole(role: UserRole): role is FranqueadoRole {
  return (FRANQUEADO_ROLES as UserRole[]).includes(role)
}

// ─── Labels de exibição ───────────────────────────────────────────────────────

export const PAPEL_LABELS: Record<UserRole, string> = {
  // ANK Data
  ank_admin:                        'Administrador ANK',
  ank_suporte:                      'Suporte ANK',
  ank_comercial:                    'Comercial ANK',
  ank_financeiro:                   'Financeiro ANK',
  ank_tech:                         'Tech ANK',
  // Loja
  consultor_loja:                   'Consultor de Vendas de Loja',
  gerente_loja:                     'Gerente de Loja',
  supervisor_loja:                  'Supervisor de Loja',
  multiplicador_treinamento_loja:   'Multiplicador de Treinamento de Loja',
  gerente_canal_loja:               'Gerente Canal Loja',
  // Venda Direta
  atendente_vd:                     'Atendente de Venda Direta',
  supervisor_campo:                 'Supervisor de Campo',
  gerente_er:                       'Gerente de ER',
  gerente_operacoes_vd:             'Gerente de Vendas e Operações de VD',
  gerente_canal_vd:                 'Gerente Canal VD',
  multiplicador_treinamento_vd:     'Multiplicador de Treinamento de VD',
  // Admin CP
  franqueado:                       'Franqueado',
  sucessor:                         'Sucessor',
  funcionario_administrativo_cp:    'Funcionário Administrativo CP',
  funcionario_financeiro_cp:        'Funcionário Financeiro CP',
  // Logística
  auxiliar_logistica:               'Auxiliar de Logística',
  estoquista:                       'Estoquista',
  assistente_logistica:             'Assistente de Logística',
  lider_logistica:                  'Líder de Logística',
  gerente_logistica:                'Gerente de Logística',
}

export const CANAL_LABELS: Record<Canal, string> = {
  loja:         'Varejo / Loja',
  venda_direta: 'Venda Direta',
  logistica:    'Logística',
  admin_cp:     'Administrativo CP',
}

// ─── Regras de PDV por cargo ──────────────────────────────────────────────────

/** Papéis que permitem vínculo com múltiplos PDVs */
export const ROLES_MULTI_PDV: FranqueadoRole[] = [
  'gerente_loja',
  'supervisor_loja',
  'multiplicador_treinamento_loja',
  'gerente_canal_loja',
  'gerente_canal_vd',
  'gerente_operacoes_vd',
  'multiplicador_treinamento_vd',
  'franqueado',
  'sucessor',
  'funcionario_administrativo_cp',
  'funcionario_financeiro_cp',
]

/** Papéis com acesso amplo — todos os PDVs do dashboard selecionado */
export const ROLES_ACESSO_AMPLO: FranqueadoRole[] = [
  'gerente_canal_loja',
  'gerente_canal_vd',
  'franqueado',
  'sucessor',
  'funcionario_administrativo_cp',
  'funcionario_financeiro_cp',
]

// ─── Enums de status ──────────────────────────────────────────────────────────

export type LicenseStatus = 'ACTIVE' | 'ALERT' | 'CRITICAL' | 'EXPIRED' | 'SUSPENDED'

export type ComplianceStatus = 'OK' | 'COMPROMETIDO'

/** ADR-003 — rastreamento de sincronização com Google Drive */
export type DriveStatus = 'pending_drive' | 'synced' | 'failed'

// ─── Database row shapes ──────────────────────────────────────────────────────

export interface Tenant {
  id: string
  nome_franquia: string
  codigo_cp: string | null
  google_drive_folder_id: string | null
  cor_primaria: string | null    // Spec 11 — White Label
  cor_secundaria: string | null  // Spec 11 — White Label
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
  /** 'ank' = usuário interno ANK Data | 'franqueado' = usuário de franquia Boticário */
  dominio: 'ank' | 'franqueado'
  /** Canal de atuação — obrigatório para domínio franqueado */
  canal: Canal | null
  /** Login no formato Boticário Extranet — identificador de acesso no ANK Data */
  usuario_extranet: string | null
  cpf: string | null
  created_at: string
  tenant?: Pick<Tenant, 'id' | 'nome_franquia'>
}

export interface UploadLog {
  id: string
  tenant_id: string
  usuario_id: string
  nome_arquivo: string
  data_upload: string
  /** ADR-003 — status de sincronização com Google Drive */
  drive_status: DriveStatus
  tenant?: Pick<Tenant, 'id' | 'nome_franquia'>
}

// ─── RBAC ─────────────────────────────────────────────────────────────────────

export interface Modulo {
  id: string
  slug_modulo: string
  nome: string
  descricao: string | null
  /** Canal ao qual o módulo pertence — null = multicanal */
  canal: Canal | null
  created_at: string
}

export interface PermissaoPapel {
  id: string
  papel: string
  slug_modulo: string
  created_at: string
}

// ─── RPC return types ─────────────────────────────────────────────────────────

export interface TenantCompliance {
  tenant_id: string
  tenant_name: string
  last_upload_date: string | null
  days_since_upload: number | null
  compliance_status: ComplianceStatus
  codigo_cp?: string | null
}

// ─── Form payloads ────────────────────────────────────────────────────────────

export interface TenantFormData {
  nome_franquia: string
  codigo_cp: string
  google_drive_folder_id: string
  cor_primaria?: string
  cor_secundaria?: string
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
  dominio: 'ank' | 'franqueado'
  canal?: Canal
  usuario_extranet?: string
  cpf?: string
}
