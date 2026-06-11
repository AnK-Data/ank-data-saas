/**
 * drive-parquet-schema
 * -----------------------------------------------------------------------------
 * Lê APENAS o footer do pedidosUnificado.parquet no Google Drive do tenant
 * e retorna o schema (colunas + tipos) sem baixar o arquivo inteiro.
 *
 * Autenticação: Service Account do Google
 *
 * Secrets necessários (Supabase → Edge Functions → Secrets):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL     ex: ank-data@meu-projeto.iam.gserviceaccount.com
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  conteúdo da chave PEM (com \n reais ou literal)
 *
 * Pré-requisito do franqueado:
 *   Compartilhar a pasta do Drive com GOOGLE_SERVICE_ACCOUNT_EMAIL (leitura)
 */

import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parquetMetadata } from 'npm:hyparquet@^1.4.0'

// --- CORS ---------------------------------------------------------------------

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// --- Parquet type labels -------------------------------------------------------

// Physical types (parquet spec §4)
const PHYSICAL: Record<number, string> = {
  0: 'Boolean', 1: 'Int32', 2: 'Int64', 3: 'Int96',
  4: 'Float',   5: 'Double', 6: 'String', 7: 'Fixed Bytes',
}

// Converted/logical types override physical label for readability
const CONVERTED: Record<number, string> = {
  0: 'String',    5: 'Decimal',  6: 'Date',
  7: 'Time',      8: 'Time',     9: 'Time',
  10: 'Timestamp', 11: 'Timestamp', 12: 'Timestamp',
  14: 'Uint32',   15: 'Uint64',
  16: 'Int8',     17: 'Int16',   18: 'Int32', 19: 'Int64',
  20: 'JSON',     21: 'BSON',
}

// deno-lint-ignore no-explicit-any
function typeLabel(el: any): string {
  // Logical type (newer parquet spec) — tem precedência
  const lt = el.logicalType ?? el.logical_type
  if (lt) {
    if (lt.STRING   !== undefined) return 'String'
    if (lt.INTEGER  !== undefined) return lt.INTEGER.isSigned ? `Int${lt.INTEGER.bitWidth}` : `Uint${lt.INTEGER.bitWidth}`
    if (lt.DECIMAL  !== undefined) return 'Decimal'
    if (lt.DATE     !== undefined) return 'Date'
    if (lt.TIME     !== undefined) return 'Time'
    if (lt.TIMESTAMP !== undefined) return 'Timestamp'
    if (lt.JSON     !== undefined) return 'JSON'
    if (lt.BSON     !== undefined) return 'BSON'
    if (lt.UUID     !== undefined) return 'UUID'
    if (lt.FLOAT16  !== undefined) return 'Float16'
  }
  // Converted type (spec legado)
  if (el.converted_type !== undefined && CONVERTED[el.converted_type]) {
    return CONVERTED[el.converted_type]
  }
  // Physical type
  if (el.type !== undefined && PHYSICAL[el.type]) return PHYSICAL[el.type]
  return 'Desconhecido'
}

// --- Helpers ------------------------------------------------------------------

/** Extrai o folder ID a partir de qualquer formato armazenado no banco */
function extractFolderId(raw: string): string {
  // "https://drive.google.com/drive/folders/ID" ou "/folders/ID"
  const m = raw.match(/folders\/([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  // "ID/view?usp=..." → só o ID antes da barra
  const slash = raw.indexOf('/')
  if (slash > 0) return raw.substring(0, slash)
  return raw.trim()
}

/** Gera um JWT assinado para o Service Account do Google */
async function makeServiceAccountJwt(email: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  const b64url = (s: string) =>
    btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({
    iss:   email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  }))

  const pemBody = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\\n/g, '\n')   // suporte a \n literal (Supabase secrets)
    .replace(/\n/g, '')
    .trim()

  const der = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'pkcs8', der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign'],
  )

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key,
    new TextEncoder().encode(`${header}.${payload}`),
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  return `${header}.${payload}.${sigB64}`
}

/** Troca o JWT por um access token OAuth2 */
async function getAccessToken(email: string, privateKeyPem: string): Promise<string> {
  const jwt = await makeServiceAccountJwt(email, privateKeyPem)
  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })
  const data = await res.json()
  if (!data.access_token) {
    throw new Error(`Falha ao obter token Google: ${data.error_description ?? data.error}`)
  }
  return data.access_token
}

// --- Main handler -------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const { tenant_id, file_name = 'pedidosUnificado.parquet' } = await req.json()
    if (!tenant_id) return json({ error: 'tenant_id obrigatório' }, 400)

    // -- Credenciais ----------------------------------------------------------
    const saEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    const saKey   = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')

    if (!saEmail || !saKey) {
      return json({
        error: 'Integração com Google Drive não configurada. Contacte o suporte AnK.',
        code:  'CREDENTIALS_MISSING',
      }, 503)
    }

    // -- Tenant ---------------------------------------------------------------
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: tenant, error: tErr } = await supabase
      .from('tenants')
      .select('google_drive_folder_id')
      .eq('id', tenant_id)
      .single()

    if (tErr || !tenant?.google_drive_folder_id) {
      return json({
        error: 'Pasta do Google Drive não configurada para este tenant.',
        code:  'FOLDER_NOT_SET',
      }, 400)
    }

    const folderId = extractFolderId(tenant.google_drive_folder_id)

    // -- Auth Google ----------------------------------------------------------
    const accessToken = await getAccessToken(saEmail, saKey)
    const auth        = `Bearer ${accessToken}`

    // -- Localizar o arquivo --------------------------------------------------
    const searchUrl =
      `https://www.googleapis.com/drive/v3/files` +
      `?q='${folderId}' in parents and trashed=false and name='${file_name}'` +
      `&fields=files(id,name,size)&pageSize=1`

    const searchRes  = await fetch(searchUrl, { headers: { Authorization: auth } })
    const searchBody = await searchRes.json()

    if (!searchRes.ok || searchBody.error) {
      console.error('[drive-parquet-schema] Drive API error:', JSON.stringify(searchBody))
      return json({
        error: searchBody.error?.message ?? 'Erro ao consultar Google Drive API.',
        code:  'DRIVE_API_ERROR',
        detail: searchBody,
      }, 502)
    }

    const { files } = searchBody

    if (!files?.length) {
      console.error('[drive-parquet-schema] File not found. folder:', folderId, 'name:', file_name)
      return json({
        error: `${file_name} não encontrado na pasta configurada.`,
        code:  'FILE_NOT_FOUND',
      }, 404)
    }

    const { id: fileId, size: sizeStr } = files[0]
    const fileSize = parseInt(sizeStr, 10)
    const mediaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`

    // -- Leitura eficiente: apenas o footer do parquet ------------------------
    // Parquet: [...dados...][footer thrift][footer length 4B LE]["PAR1" 4B]
    // Baixamos só os últimos 8 bytes para descobrir o tamanho do footer.

    const tail8Res = await fetch(mediaUrl, {
      headers: { Authorization: auth, Range: `bytes=${fileSize - 8}-${fileSize - 1}` },
    })
    const tail8     = await tail8Res.arrayBuffer()
    const tail8View = new DataView(tail8)

    // Validar magic "PAR1"
    const magic = new TextDecoder().decode(new Uint8Array(tail8, 4, 4))
    if (magic !== 'PAR1') {
      return json({ error: 'Arquivo não é um Parquet válido (magic inválido).', code: 'INVALID_PARQUET' }, 422)
    }

    const footerLength = tail8View.getInt32(0, true) // little-endian

    // Baixar exatamente (footerLength + 8) bytes: o footer + footer_length + magic
    // Insight: se byteLength = footerLength + 8, hyparquet lê o schema sem precisar
    // do restante do arquivo.
    const footerStart = fileSize - 8 - footerLength
    const footerRes   = await fetch(mediaUrl, {
      headers: { Authorization: auth, Range: `bytes=${footerStart}-${fileSize - 1}` },
    })
    const footerBuffer = await footerRes.arrayBuffer()

    // -- Parsear schema -------------------------------------------------------
    // deno-lint-ignore no-explicit-any
    const metadata = parquetMetadata(footerBuffer) as any

    // schema[0] é o elemento raiz (nome "schema"), pulamos ele.
    // Pegamos apenas os elementos FOLHA (sem filhos = colunas reais).
    // deno-lint-ignore no-explicit-any
    const columns = (metadata.schema as any[])
      .filter(el => el.name !== 'schema' && (el.num_children === undefined || el.num_children === 0))
      .map((el, i) => ({
        index:          i + 1,
        name:           el.name,
        type:           typeLabel(el),
        nullable:       el.repetition_type !== 0, // 0 = REQUIRED
        physical_type:  el.type,
        converted_type: el.converted_type ?? null,
      }))

    return json({
      columns,
      num_rows:  metadata.num_rows?.toString?.() ?? null,
      file_size: fileSize,
      file_name,
    })

  } catch (err) {
    console.error('[drive-parquet-schema]', err)
    return json({ error: String(err), code: 'INTERNAL_ERROR' }, 500)
  }
})
