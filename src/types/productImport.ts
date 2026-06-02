export type ImportStatus = 'pendente' | 'processando' | 'concluido' | 'erro'

export interface ProductImport {
  id: string
  arquivo_nome: string
  arquivo_tamanho: number | null
  usuario_id: string | null
  total_registros: number
  registros_importados: number
  registros_com_erro: number
  status: ImportStatus
  observacao: string | null
  created_at: string
  usuario?: { nome: string } | null
}

/** Linha bruta lida do XLSX antes do mapeamento */
export interface XlsxRawRow {
  'Cod. Produto'?:     string | number
  'Nome Produto'?:     string
  'NomeCurto Produto'?: string
  'Unidade'?:          string
  'Fora de Linha'?:    string
  'Linha'?:            string
  'Familia'?:          string
  'Secao'?:            string
  'Grupo'?:            string
  'Subgrupo'?:         string
  'Inclusao'?:         string | number
  'Alteracao'?:        string | number
  'Marca_Estrutura'?:  string
  'Marca'?:            string
  'IAF_Make'?:         string
  'IAF_Skin'?:         string
  'IAF_Cabelos'?:      string
  [key: string]: unknown
}

export const REQUIRED_COLUMNS = [
  'Cod. Produto',
  'Nome Produto',
  'NomeCurto Produto',
  'Unidade',
  'Fora de Linha',
  'Linha',
  'Familia',
  'Secao',
  'Grupo',
  'Subgrupo',
  'Inclusao',
  'Alteracao',
  'Marca_Estrutura',
  'Marca',
  'IAF_Make',
  'IAF_Skin',
  'IAF_Cabelos',
] as const
