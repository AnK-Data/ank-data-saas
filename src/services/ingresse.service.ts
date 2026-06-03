import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabaseClient'
import type { IngresseColaborador, IngresseRawRow } from '../types/ingresse'
import { INGRESSE_COLUMNS } from '../types/ingresse'

// ─── Padronização de nomes (equivalente aos scripts Python) ──────────────────

const EXCECOES_NOME = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

/** Converte ALL CAPS para Title Case, mantendo artigos em minúsculo */
export function padronizarNome(nome: string): string {
  if (!nome) return ''
  const limpo = nome.trim().replace(/\s+/g, ' ')
  return limpo
    .split(' ')
    .map(p => (EXCECOES_NOME.has(p.toLowerCase()) ? p.toLowerCase() : capitalize(p)))
    .join(' ')
}

/** Gera nome curto para exibição:
 *  - ≤2 palavras → usa tudo
 *  - 2ª palavra curta (≤3 chars, ex: "da") → usa primeiros 3 tokens
 *  - senão → usa apenas as 2 primeiras palavras
 */
export function padronizarNomeCurto(nome: string): string {
  if (!nome) return ''
  const partes = nome.trim().split(' ')
  if (partes.length <= 2) {
    return partes.map(capitalize).join(' ')
  }
  if (partes[1].length <= 3 && partes.length > 2) {
    return `${capitalize(partes[0])} ${partes[1].toLowerCase()} ${capitalize(partes[2])}`
  }
  return `${capitalize(partes[0])} ${capitalize(partes[1])}`
}

// ─────────────────────────────────────────────────────────────────────────────

export interface IngresseParseResult {
  rows: IngresseRawRow[]
  headers: string[]
  missingColumns: string[]
  valid: boolean
  ativos: number
  inativos: number
}

// ─── Parse do XLSX ────────────────────────────────────────────────────────────

export function parseIngresseXlsx(file: File): Promise<IngresseParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb   = XLSX.read(e.target?.result, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<IngresseRawRow>(ws, { defval: null })

        const headers = rows.length > 0 ? Object.keys(rows[0]) : []
        const missingColumns = INGRESSE_COLUMNS.filter(
          col => !headers.some(h => h.trim().toLowerCase() === col.toLowerCase())
        )
        const ativos   = rows.filter(r => String(r.Status ?? '').toLowerCase() === 'ativo').length
        const inativos = rows.filter(r => String(r.Status ?? '').toLowerCase() === 'inativo').length

        resolve({ rows, headers, missingColumns, valid: missingColumns.length === 0, ativos, inativos })
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function mapRow(row: IngresseRawRow, tenantId: string): Omit<IngresseColaborador, 'id' | 'synced_at' | 'created_at'> {
  const cpfRaw  = row.CPF ? String(row.CPF).replace(/\D/g, '') : null
  const nomeRaw = String(row.Nome ?? '').trim()

  const nomeFormatado = padronizarNome(nomeRaw)
  return {
    tenant_id:   tenantId,
    ingresse_id: String(row.Login ?? '').trim().toLowerCase(),
    nome:        nomeFormatado,
    nome_curto:  padronizarNomeCurto(nomeFormatado) || null,
    cpf:         cpfRaw || null,
    status:      String(row.Status ?? 'Ativo').trim() as 'Ativo' | 'Inativo',
    cargo:       padronizarNome(String(row.Cargo ?? '').trim()) || null,
    franquia:    String(row.Franquia ?? '').trim() || null,  // código PDV bruto — não padronizar
  }
}

// ─── Importação com UPSERT ────────────────────────────────────────────────────

export async function importIngresseColaboradores(
  rows: IngresseRawRow[],
  tenantId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ upserted: number; errors: number }> {
  const BATCH = 500
  let upserted = 0
  let errors   = 0

  const mapped = rows
    .map(r => mapRow(r, tenantId))
    .filter(r => r.ingresse_id)  // descarta linhas sem login

  for (let i = 0; i < mapped.length; i += BATCH) {
    const batch = mapped.slice(i, i + BATCH)
    const { error } = await supabase
      .from('ingresse_colaboradores')
      .upsert(batch, { onConflict: 'tenant_id,ingresse_id', ignoreDuplicates: false })

    if (error) {
      errors += batch.length
      console.warn('[Ingresse] batch error:', error.message)
    } else {
      upserted += batch.length
    }
    onProgress?.(Math.min(i + BATCH, mapped.length), mapped.length)
  }

  // Sincroniza status 'Inativo' nos profiles já cadastrados
  try { await supabase.rpc('sync_ingresse_status_to_profiles', { p_tenant_id: tenantId }) } catch { /* opcional */ }

  return { upserted, errors }
}

// ─── Listagem ─────────────────────────────────────────────────────────────────

export async function listColaboradores(tenantId: string): Promise<IngresseColaborador[]> {
  const { data } = await supabase
    .from('ingresse_colaboradores')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('nome')
  return (data ?? []) as IngresseColaborador[]
}

// ─── Lookup por ingresse_id (usado no login e primeiro acesso) ────────────────

export interface IngresseAuthLookup {
  profile_id: string
  auth_email: string
  status: 'Ativo' | 'Inativo'
  first_access: boolean
  nome: string
  tenant_id: string
}

/** Retorna o perfil vinculado a um ingresse_id (para login) */
export async function getAuthByIngresseId(ingresseId: string): Promise<IngresseAuthLookup | null> {
  const { data } = await supabase
    .rpc('get_auth_by_ingresse_id', { p_ingresse_id: ingresseId })
  return data?.[0] ?? null
}

/** Verifica se o ingresse_id está autorizado (para primeiro acesso) */
export async function checkIngresseColaborador(ingresseId: string): Promise<{
  ingresse_id: string; nome: string; status: string; cargo: string | null; tenant_id: string
} | null> {
  const { data } = await supabase
    .rpc('check_ingresse_colaborador', { p_ingresse_id: ingresseId })
  return data?.[0] ?? null
}

/** Gera o e-mail interno padrão para um ingresse_id */
export function buildInternalEmail(ingresseId: string): string {
  return `${ingresseId.toLowerCase().trim()}@colaborador.ankdata.internal`
}
