export interface Product {
  id: string
  codigo_produto: number | null
  nome_produto: string
  nome_curto_produto: string | null
  unidade: string | null
  fora_de_linha: string | null
  linha: string | null
  familia: string | null
  secao: string | null
  grupo: string | null
  subgrupo: string | null
  data_inclusao: string | null
  data_alteracao: string | null
  marca_estrutura: string | null
  marca: string | null
  iaf_make: string | null
  iaf_skin: string | null
  iaf_cabelos: string | null
  created_at: string
  updated_at: string
}

export interface ProductFilters {
  search:          string
  marca_estrutura: string   // BOT | EUD | OUI | QDB — código principal da marca
  linha:           string
  secao:           string
  // campos não usados nos filtros mas mantidos para compatibilidade
  marca:         string
  familia:       string
  grupo:         string
  subgrupo:      string
  fora_de_linha: string
}

export const EMPTY_FILTERS: ProductFilters = {
  search: '', marca_estrutura: '', linha: '', secao: '',
  marca: '', familia: '', grupo: '', subgrupo: '', fora_de_linha: '',
}

export interface ProductFilterOptions {
  marcas:     string[]
  linhas:     string[]
  familias:   string[]
  secoes:     string[]
  grupos:     string[]
  subgrupos:  string[]
}

export interface ProductPage {
  data:  Product[]
  total: number
  page:  number
  pageSize: number
}
