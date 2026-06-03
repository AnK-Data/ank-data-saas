export interface IngresseColaborador {
  id: string
  tenant_id: string
  ingresse_id: string
  nome: string
  nome_curto: string | null
  cpf: string | null
  status: 'Ativo' | 'Inativo'
  cargo: string | null
  franquia: string | null
  synced_at: string
  created_at: string
}

export const INGRESSE_COLUMNS = [
  'Login',
  'Nome',
  'CPF',
  'Status',
  'Cargo',
  'Franquia',
] as const

export type IngresseRawRow = {
  Login?: string | number
  Nome?: string
  CPF?: string | number
  Status?: string
  Cargo?: string
  Franquia?: string
  [key: string]: unknown
}
