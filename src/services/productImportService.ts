import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import type { ProductImport, XlsxRawRow } from '../types/productImport'
import { REQUIRED_COLUMNS } from '../types/productImport'
import type { Product } from '../types/product'

// ─── Leitura e validação do XLSX ──────────────────────────────────────────────

export interface ParseResult {
  rows: XlsxRawRow[]
  headers: string[]
  missingColumns: string[]
  valid: boolean
}

export function parseXlsxFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data    = e.target?.result
        const wb      = XLSX.read(data, { type: 'array', cellDates: true })
        const ws      = wb.Sheets[wb.SheetNames[0]]
        const rows    = XLSX.utils.sheet_to_json<XlsxRawRow>(ws, { defval: null })
        const headers = rows.length > 0 ? Object.keys(rows[0]) : []

        const missingColumns = REQUIRED_COLUMNS.filter(
          req => !headers.some(h => h.trim() === req)
        )

        resolve({ rows, headers, missingColumns, valid: missingColumns.length === 0 })
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

// ─── Mapeamento de linha XLSX → Product ──────────────────────────────────────

function parseExcelDate(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value)
    if (d) return new Date(d.y, d.m - 1, d.d).toISOString()
  }
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  return null
}

export function mapRowToProduct(
  row: XlsxRawRow
): Omit<Product, 'id' | 'created_at' | 'updated_at'> {
  return {
    codigo_produto:      row['Cod. Produto'] ? Number(row['Cod. Produto']) : null,
    nome_produto:        String(row['Nome Produto'] ?? '').trim(),
    nome_curto_produto:  String(row['NomeCurto Produto'] ?? '').trim() || null,
    unidade:             String(row['Unidade'] ?? '').trim() || null,
    fora_de_linha:       String(row['Fora de Linha'] ?? '').trim() || null,
    linha:               String(row['Linha'] ?? '').trim() || null,
    familia:             String(row['Familia'] ?? '').trim() || null,
    secao:               String(row['Secao'] ?? '').trim() || null,
    grupo:               String(row['Grupo'] ?? '').trim() || null,
    subgrupo:            String(row['Subgrupo'] ?? '').trim() || null,
    data_inclusao:       parseExcelDate(row['Inclusao']),
    data_alteracao:      parseExcelDate(row['Alteracao']),
    marca_estrutura:     String(row['Marca_Estrutura'] ?? '').trim() || null,
    marca:               String(row['Marca'] ?? '').trim() || null,
    iaf_make:            String(row['IAF_Make'] ?? '').trim() || null,
    iaf_skin:            String(row['IAF_Skin'] ?? '').trim() || null,
    iaf_cabelos:         String(row['IAF_Cabelos'] ?? '').trim() || null,
  }
}

// ─── Histórico de importações ─────────────────────────────────────────────────

export async function listImports(): Promise<ProductImport[]> {
  const { data, error } = await supabase
    .from('product_imports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) { console.warn('[listImports]', error.message); return [] }
  const imports = (data ?? []) as ProductImport[]

  // Buscar nomes dos usuários sem depender do FK hint
  const ids = [...new Set(imports.map(i => i.usuario_id).filter(Boolean))] as string[]
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome')
      .in('id', ids)
    const map = Object.fromEntries((profiles ?? []).map((p: { id: string; nome: string }) => [p.id, p.nome]))
    return imports.map(i => ({ ...i, usuario: i.usuario_id ? { nome: map[i.usuario_id] ?? '—' } : null }))
  }
  return imports
}

export async function saveImportRecord(record: {
  arquivo_nome: string
  arquivo_tamanho: number
  usuario_id: string
  total_registros: number
  registros_importados: number
  registros_com_erro: number
  status: string
  observacao?: string
}): Promise<void> {
  const { error } = await supabase.from('product_imports').insert(record)
  if (error) throw new Error(`Falha ao salvar histórico: ${error.message}`)
}
