/**
 * drive-parquet-data
 * -----------------------------------------------------------------------------
 * Lê linhas reais do pedidosUnificado.parquet no Google Drive do tenant via
 * range requests (não baixa o arquivo inteiro). Suporta paginação.
 *
 * Input:  { tenant_id, file_name?, limit?, offset? }
 * Output: { rows, total_rows, offset, limit, file_name }
 *
 * Mesmos secrets que drive-parquet-schema:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 */

import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parquetRead, parquetMetadata } from 'npm:hyparquet@^1.4.0'

// --- CORS ---------------------------------------------------------------------

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  const text = JSON.stringify(body, (_k, v) =>
    typeof v === 'bigint' ? v.toString() : v
  )
  return new Response(text, {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// --- Helpers ------------------------------------------------------------------

function extractFolderId(raw: string): string {
  const m = raw.match(/folders\/([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  const slash = raw.indexOf('/')
  if (slash > 0) return raw.substring(0, slash)
  return raw.trim()
}

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
    .replace(/\\n/g, '\n')
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
    const {
      tenant_id,
      file_name = 'pedidosUnificado.parquet',
      limit  = 100,
      offset = 0,
      debug  = false,
    } = await req.json()

    if (!tenant_id) return json({ error: 'tenant_id obrigatorio' }, 400)

    const safeLimit = Math.min(Math.max(1, Number(limit)  || 100), 500)
    const safeOffset = Math.max(0, Number(offset) || 0)

    // -- Credenciais ----------------------------------------------------------
    const saEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    const saKey   = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')

    if (!saEmail || !saKey) {
      return json({
        error: 'Integracao com Google Drive nao configurada. Contacte o suporte AnK.',
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
        error: 'Pasta do Google Drive nao configurada para este tenant.',
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
      console.error('[drive-parquet-data] Drive API error:', JSON.stringify(searchBody))
      return json({
        error: searchBody.error?.message ?? 'Erro ao consultar Google Drive API.',
        code:  'DRIVE_API_ERROR',
        detail: searchBody,
      }, 502)
    }

    const { files } = searchBody

    if (!files?.length) {
      console.error('[drive-parquet-data] File not found. folder:', folderId, 'name:', file_name)
      return json({
        error: `${file_name} nao encontrado na pasta configurada.`,
        code:  'FILE_NOT_FOUND',
      }, 404)
    }

    const { id: fileId, size: sizeStr } = files[0]
    const fileSize = parseInt(sizeStr, 10)
    const mediaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`

    // Helper: range GET ao Drive
    async function fetchRange(start: number, end: number): Promise<ArrayBuffer> {
      const res = await fetch(mediaUrl, {
        headers: { Authorization: auth, Range: `bytes=${start}-${end - 1}` },
      })
      return res.arrayBuffer()
    }

    // -- Passo 1: footer (2 requests, igual ao schema) ------------------------
    const tail8     = await fetchRange(fileSize - 8, fileSize)
    const tail8View = new DataView(tail8)
    const magic     = new TextDecoder().decode(new Uint8Array(tail8, 4, 4))
    if (magic !== 'PAR1') {
      return json({ error: 'Arquivo nao e um Parquet valido.', code: 'INVALID_PARQUET' }, 422)
    }
    const footerLength = tail8View.getInt32(0, true)
    const footerStart  = fileSize - 8 - footerLength
    const footerBuffer = await fetchRange(footerStart, fileSize)

    // deno-lint-ignore no-explicit-any
    const metadata  = parquetMetadata(footerBuffer) as any
    const totalRows = Number(metadata.num_rows ?? 0)

    // -- Análise de row groups ------------------------------------------------
    // deno-lint-ignore no-explicit-any
    const rgInfo = (metadata.row_groups as any[]).map((rg: any, i: number) => {
      const [lo, hi] = rowGroupByteRange(rg)
      return { index: i, num_rows: Number(rg.num_rows), byte_start: lo, byte_end: hi, byte_size: hi - lo }
    })
    console.log('[drive-parquet-data] file_size:', fileSize, 'total_rows:', totalRows,
      'row_groups:', rgInfo.length, JSON.stringify(rgInfo.map(r => ({ i: r.index, rows: r.num_rows, mb: (r.byte_size/1e6).toFixed(2) }))))

    if (debug) {
      return json({ debug: true, file_size: fileSize, total_rows: totalRows, file_name, row_groups: rgInfo })
    }

    // Limite de segurança: row groups > 3 MB nao sao suportados no free tier
    // O arquivo precisa ser regravado com row_group_size menor no ETL.
    const MAX_RG_BYTES = 3_000_000
    const largeRG = rgInfo.find(r => r.byte_size > MAX_RG_BYTES)
    if (largeRG) {
      // HTTP 200 para o frontend conseguir ler o code JSON (non-2xx faz data=null no supabase-js)
      return json({
        error: 'Arquivo parquet nao otimizado para leitura online. Todos os dados precisariam ser baixados de uma vez.',
        code:  'ROW_GROUP_TOO_LARGE',
        detail: {
          row_group_size_mb: parseFloat((largeRG.byte_size / 1e6).toFixed(2)),
          row_group_rows:    largeRG.num_rows,
          total_row_groups:  rgInfo.length,
          fix: 'Regrave o parquet com row_group_size=10000 no ETL. Exemplo Python: df.to_parquet("arquivo.parquet", engine="pyarrow", row_group_size=10000)',
        },
      })
    }

    const clampedOffset = Math.min(safeOffset, totalRows)
    const rowEnd        = Math.min(clampedOffset + safeLimit, totalRows)

    if (clampedOffset >= totalRows) {
      return json({ rows: [], total_rows: totalRows, offset: clampedOffset, limit: safeLimit, file_name })
    }

    // -- Passo 2: identifica o(s) row group(s) necessario(s) -----------------
    // Parquet armazena em row groups — só baixamos o(s) que contem as linhas pedidas.
    // deno-lint-ignore no-explicit-any
    function rowGroupByteRange(rg: any): [number, number] {
      let lo = Infinity, hi = 0
      // deno-lint-ignore no-explicit-any
      for (const col of (rg.columns as any[])) {
        const meta       = col.meta_data ?? col
        const dictOff    = meta.dictionary_page_offset !== undefined ? Number(meta.dictionary_page_offset) : Infinity
        const dataOff    = Number(meta.data_page_offset)
        const colStart   = Math.min(dictOff, dataOff)
        const colEnd     = dataOff + Number(meta.total_compressed_size)
        if (colStart < lo) lo = colStart
        if (colEnd   > hi) hi = colEnd
      }
      return [lo, hi]
    }

    let rgByteStart = Infinity, rgByteEnd = 0
    let rowCursor = 0
    // deno-lint-ignore no-explicit-any
    for (const rg of (metadata.row_groups as any[])) {
      const rgRows = Number(rg.num_rows)
      const rgEnd  = rowCursor + rgRows
      // Este row group sobrepoe o intervalo pedido?
      if (rowCursor < rowEnd && rgEnd > clampedOffset) {
        const [lo, hi] = rowGroupByteRange(rg)
        if (lo < rgByteStart) rgByteStart = lo
        if (hi > rgByteEnd)   rgByteEnd   = hi
      }
      rowCursor = rgEnd
      if (rowCursor >= rowEnd) break
    }

    // -- Passo 3: 1 request para o row group inteiro --------------------------
    const rgSize = rgByteEnd - rgByteStart
    console.log('[drive-parquet-data] Downloading row group:', rgByteStart, '-', rgByteEnd, `(${(rgSize/1e6).toFixed(2)} MB)`)
    const rgBuffer = await fetchRange(rgByteStart, rgByteEnd)
    console.log('[drive-parquet-data] Row group downloaded, starting parquetRead')

    // -- AsyncBuffer que serve do cache (sem hits ao Drive durante parquetRead) --
    const footerU8 = new Uint8Array(footerBuffer)
    const rgU8     = new Uint8Array(rgBuffer)

    const cachedBuffer = {
      byteLength: fileSize,
      slice: async (start: number, end?: number): Promise<ArrayBuffer> => {
        const s = start
        const e = end ?? fileSize
        // Footer region
        if (s >= footerStart) {
          const lo = s - footerStart, hi = e - footerStart
          return footerU8.slice(lo, hi).buffer
        }
        // Row group region (cobre a maioria das requests de dados)
        if (s >= rgByteStart && e <= rgByteEnd) {
          const lo = s - rgByteStart, hi = e - rgByteStart
          return rgU8.slice(lo, hi).buffer
        }
        // Fallback — nao deve ocorrer em uso normal
        console.warn('[drive-parquet-data] cache miss:', s, e)
        return fetchRange(s, e)
      },
    }

    // Nomes de coluna do schema (usados se hyparquet retornar arrays em vez de objetos)
    // deno-lint-ignore no-explicit-any
    const colNames: string[] = (metadata.schema as any[])
      .filter(el => el.name !== 'schema' && (el.num_children === undefined || el.num_children === 0))
      .map(el => el.name)

    // -- Passo 4: parquetRead com o buffer em cache ---------------------------
    // deno-lint-ignore no-explicit-any
    const rawRows: any[] = []
    await parquetRead({
      file:     cachedBuffer,
      rowStart: clampedOffset,
      rowEnd,
      // deno-lint-ignore no-explicit-any
      onComplete: (data: any[]) => {
        rawRows.push(...data)
        console.log('[drive-parquet-data] parquetRead complete, rows:', data.length)
      },
    })

    // Normaliza: se retornou arrays em vez de objetos, converte usando colNames
    const rows: Record<string, unknown>[] = rawRows.map(row => {
      if (Array.isArray(row)) {
        const obj: Record<string, unknown> = {}
        colNames.forEach((name, i) => { obj[name] = row[i] })
        return obj
      }
      return row as Record<string, unknown>
    })

    console.log('[drive-parquet-data] Done. Returning', rows.length, 'rows')
    return json({
      rows,
      total_rows: totalRows,
      offset:     clampedOffset,
      limit:      safeLimit,
      file_name,
    })

  } catch (err) {
    console.error('[drive-parquet-data]', err)
    return json({ error: String(err), code: 'INTERNAL_ERROR' }, 500)
  }
})
