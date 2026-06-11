/**
 * convert-parquet.mjs
 * Baixa pedidosUnificado.parquet do Google Drive, reescreve com
 * row_group_size=10000 e faz o upload no mesmo arquivo.
 *
 * Uso:  node scripts/convert-parquet.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { createSign } from 'crypto'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

// --- inicializa parquet-wasm (ESM build + WASM explícito) --------------------
const __dirname = dirname(fileURLToPath(import.meta.url))
const wasmPath  = join(__dirname, '../node_modules/parquet-wasm/esm/parquet_wasm_bg.wasm')

import init, { readParquet, writeParquet, WriterPropertiesBuilder }
  from 'parquet-wasm/esm'

await init(readFileSync(wasmPath))
console.log('[parquet-wasm] inicializado')

// --- config ------------------------------------------------------------------
const KEY_FILE    = 'C:\\Users\\canho\\Downloads\\ank-data-drive-499020-3a3ec625e555.json'
const FOLDER_ID   = '1aO5FTarf2ullhzuShTRgokk1QiAE156o'
const FILE_NAME   = 'pedidosUnificado.parquet'
const RG_SIZE     = 10_000  // linhas por row group

// --- Google Auth (JWT → access token) ----------------------------------------
const key = JSON.parse(readFileSync(KEY_FILE, 'utf8'))

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function makeJwt() {
  const now  = Math.floor(Date.now() / 1000)
  const hdr  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const pay  = b64url(JSON.stringify({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, iat: now,
  }))
  const sign = createSign('RSA-SHA256')
  sign.update(`${hdr}.${pay}`)
  const sig = sign.sign(key.private_key, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${hdr}.${pay}.${sig}`
}

async function getToken() {
  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  makeJwt(),
    }),
  })
  const d = await res.json()
  if (!d.access_token) throw new Error(`Token error: ${d.error_description}`)
  return d.access_token
}

// --- main --------------------------------------------------------------------
async function main() {
  console.log('[1/5] Obtendo token Google...')
  const token = await getToken()
  const auth  = `Bearer ${token}`

  // 1. Encontrar o arquivo
  console.log('[2/5] Localizando arquivo no Drive...')
  const searchUrl = `https://www.googleapis.com/drive/v3/files` +
    `?q='${FOLDER_ID}' in parents and trashed=false and name='${FILE_NAME}'` +
    `&fields=files(id,name,size)&pageSize=1`

  const searchRes  = await fetch(searchUrl, { headers: { Authorization: auth } })
  const searchBody = await searchRes.json()

  if (!searchBody.files?.length) throw new Error('Arquivo não encontrado no Drive.')
  const { id: fileId, size: sizeStr } = searchBody.files[0]
  const fileSize = parseInt(sizeStr, 10)
  console.log(`   Encontrado: ${fileId}  (${(fileSize/1e6).toFixed(1)} MB)`)

  // 2. Baixar o arquivo
  console.log('[3/5] Baixando arquivo do Drive...')
  const mediaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: auth } }
  )
  if (!mediaRes.ok) throw new Error(`Download falhou: ${mediaRes.status}`)
  const inputBuffer = new Uint8Array(await mediaRes.arrayBuffer())
  console.log(`   Baixado: ${(inputBuffer.byteLength/1e6).toFixed(1)} MB`)

  // 3. Converter: lê Arrow IPC e regrava com row group menor
  console.log(`[4/5] Convertendo para row_group_size=${RG_SIZE}...`)
  const arrowIpc = readParquet(inputBuffer)

  const props = new WriterPropertiesBuilder()
    .setMaxRowGroupSize(RG_SIZE)
    .build()

  const outputBuffer = writeParquet(arrowIpc, props)
  console.log(`   Original: ${(inputBuffer.byteLength/1e6).toFixed(1)} MB  →  Novo: ${(outputBuffer.byteLength/1e6).toFixed(1)} MB`)

  // Salva uma cópia local para verificação
  writeFileSync('pedidosUnificado_converted.parquet', outputBuffer)
  console.log('   Cópia local salva: pedidosUnificado_converted.parquet')

  // 4. Re-upload (substitui o arquivo existente)
  console.log('[5/5] Fazendo upload de volta ao Drive...')
  const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`
  const uploadRes = await fetch(uploadUrl, {
    method: 'PATCH',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(outputBuffer.byteLength),
    },
    body: outputBuffer,
  })

  if (!uploadRes.ok) {
    const errBody = await uploadRes.text()
    throw new Error(`Upload falhou: ${uploadRes.status} — ${errBody}`)
  }

  const uploadBody = await uploadRes.json()
  console.log(`   Upload concluído: ${uploadBody.name} (${uploadBody.id})`)
  console.log('\n✓ Pronto! Agora clique "Atualizar" na aba Pedidos.')
}

main().catch(err => {
  console.error('\n✗ Erro:', err.message)
  process.exit(1)
})
