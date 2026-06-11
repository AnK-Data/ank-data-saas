/**
 * drive-parquet-query
 * Baixa pedidosUnificado.parquet, le com UMA chamada parquetRead (mais eficiente
 * que multiplas chamadas por row group) e agrega em Maps/Sets por query_type.
 * O onComplete e chamado por row group (~10k rows/vez), sem spread de args.
 *
 * Input:  { tenant_id, query_type, filters?, page?, page_size? }
 * Output: objeto agregado conforme query_type
 */

import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { parquetRead }  from 'npm:hyparquet@^1.4.0'

// --- CORS ---

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// HTTP 200 para todos os erros — supabase-js so coloca o body em `data` para 2xx
function json(body: unknown) {
  const text = JSON.stringify(body, (_k, v) =>
    typeof v === 'bigint' ? v.toString() : v
  )
  return new Response(text, {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// --- Auth Google ---

function extractFolderId(raw: string): string {
  const m = raw.match(/folders\/([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  const slash = raw.indexOf('/')
  if (slash > 0) return raw.substring(0, slash)
  return raw.trim()
}

async function makeJwt(email: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const b64url = (s: string) =>
    btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now,
  }))
  const pemBody = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '')
    .replace(/\\n/g, '\n').replace(/\n/g, '').trim()
  const der = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'pkcs8', der.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig    = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${payload}`))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${header}.${payload}.${sigB64}`
}

async function getAccessToken(email: string, key: string): Promise<string> {
  const jwt = await makeJwt(email, key)
  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const d = await res.json()
  if (!d.access_token) throw new Error(`Token Google: ${d.error_description ?? d.error}`)
  return d.access_token
}

// --- Colunas por query type ---

type VDQueryType = 'overview' | 'revendedoras' | 'supervisores' | 'estruturas' | 'produtos' | 'folha' | 'ciclos_list' | 'logistica'

// Colunas base por tipo de query (sem colunas de filtro)
// ciclos_list:  4 cols, scan completo sem filtro — retorna trend + lista de ciclos
// overview:     7 cols + Ciclo + Marca = 9 total — KPIs + marca + meio
// revendedoras: 9 cols + Ciclo = 10 total — tabela de revendedoras (sem RL nem Marca para caber no free tier)
// supervisores: 8 cols + Ciclo = 9 total
// estruturas:   8 cols + Ciclo = 9 total
// produtos:     6 cols + Ciclo = 7 total (Marca ja inclusa na base)
// folha:        10 cols + Ciclo = 11 total
// logistica:    7 cols + Ciclo = 8 total — KPIs distribuicao + cobertura geografica
const COLS_BASE: Record<VDQueryType, string[]> = {
  ciclos_list:  ['Ciclo Faturamento', 'Receita Bruta', 'Receita Liquida', 'Volume'],
  overview:     ['Receita Bruta', 'Receita Liquida', 'Volume', 'Cod. Pedido', 'Cod. Revendedor', 'Marca', 'Meio de Captacao'],
  revendedoras: ['Cod. Revendedor', 'Nome Vendedor', 'Cidade', 'Papel', 'Nome Supervisor', 'Nome Estrutura', 'Receita Bruta', 'Volume', 'Cod. Pedido'],
  supervisores: ['Nome Supervisor', 'Supervisor Curto', 'Cod. Revendedor', 'Nome Estrutura', 'Receita Bruta', 'Receita Liquida', 'Volume', 'Cod. Pedido'],
  estruturas:   ['Cod. Estrutura', 'Nome Estrutura', 'Cod. PDV', 'Cidade', 'Cod. Revendedor', 'Receita Bruta', 'Receita Liquida', 'Volume'],
  produtos:     ['Secao', 'Marca', 'Meio de Captacao', 'Tipo de Entrega', 'Receita Bruta', 'Volume'],
  folha:        ['Nome Vendedor', 'Nome Supervisor', 'Supervisor Curto', 'Cod. Usuario', 'Papel', 'Nome Estrutura', 'Receita Bruta', 'Receita Liquida', 'Volume', 'Cod. Pedido'],
  logistica:    ['Tipo de Entrega', 'Cidade', 'Nome Estrutura', 'Receita Bruta', 'Volume', 'Cod. Pedido', 'Marca'],
}

// Colunas de filtro por query type:
// revendedoras/supervisores/estruturas/produtos: apenas Ciclo Faturamento (Marca removida para
// manter dentro do limite de CPU do free tier — 10 cols max para 625K rows)
// overview e folha: Ciclo + Marca (ambas necessarias para filtragem)
const FILTER_COLS: Partial<Record<VDQueryType, string[]>> = {
  overview:     ['Ciclo Faturamento', 'Marca'],
  revendedoras: ['Ciclo Faturamento'],
  supervisores: ['Ciclo Faturamento'],
  estruturas:   ['Ciclo Faturamento'],
  produtos:     ['Ciclo Faturamento'],
  folha:        ['Ciclo Faturamento'],
  logistica:    ['Ciclo Faturamento'],
}
const COLS: Record<VDQueryType, string[]> = Object.fromEntries(
  (Object.entries(COLS_BASE) as [VDQueryType, string[]][]).map(([qt, base]) => {
    if (qt === 'ciclos_list') return [qt, base]
    const filterCols = (FILTER_COLS as Record<string, string[]>)[qt] ?? []
    const merged = [...base]
    for (const fc of filterCols) { if (!merged.includes(fc)) merged.push(fc) }
    return [qt, merged]
  })
) as Record<VDQueryType, string[]>

// --- Filtros ---

interface VDFilters { ciclo?: string; ano?: string; marca?: string; supervisor?: string; estrutura?: string; meio_captacao?: string }

function passFilter(r: Record<string, unknown>, f: VDFilters): boolean {
  if (f.ciclo         && r['Ciclo Faturamento'] !== f.ciclo)                    return false
  if (f.marca         && 'Marca' in r && r['Marca'] !== f.marca)                return false
  if (f.supervisor    && r['Nome Supervisor']   !== f.supervisor)               return false
  if (f.estrutura     && r['Nome Estrutura']    !== f.estrutura)                return false
  if (f.meio_captacao && r['Meio de Captacao']  !== f.meio_captacao)            return false
  if (f.ano && (r['Ciclo Faturamento'] as string)?.split('/')[1] !== f.ano)     return false
  return true
}

// --- Helpers ---

function n(v: unknown): number { return typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0 }
function s(v: unknown): string { return String(v ?? '') }

function stableCacheKey(qt: string, f: VDFilters, page: number, ps: number): string {
  const fStr = (Object.entries(f) as [string, string | undefined][])
    .filter(([, v]) => v)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return `${qt}:${fStr}:${page}:${ps}`
}

// --- Acumuladores ---

function n2(v: unknown): number { return typeof v === 'number' ? v : 0 }

function processRow(row: Record<string, unknown>, qt: VDQueryType, acc: Record<string, unknown>, f: VDFilters) {
  // ciclos_list: acumula TODOS os rows sem filtro — retorna tendencia de ciclos
  if (qt === 'ciclos_list') {
    const ciclo = s(row['Ciclo Faturamento']); if (!ciclo) return
    const map = acc['map'] as Map<string, [number,number,number]>
    const e = map.get(ciclo) ?? [0,0,0]
    e[0] += n(row['Receita Bruta']); e[1] += n(row['Receita Liquida']); e[2] += n2(row['Volume'])
    map.set(ciclo, e)
    return
  }

  if (!passFilter(row, f)) return

  switch (qt) {
    case 'overview': {
      const rb = n(row['Receita Bruta']), rl = n(row['Receita Liquida']), vol = n2(row['Volume'])
      const marca = s(row['Marca']), meio = s(row['Meio de Captacao'])
      ;(acc['rb'] as { v: number }).v += rb;
      ;(acc['rl'] as { v: number }).v += rl;
      ;(acc['vol'] as { v: number }).v += vol
      ;(acc['pedidos'] as Set<string>).add(s(row['Cod. Pedido']))
      ;(acc['revs'] as Set<string>).add(s(row['Cod. Revendedor']))
      const byMarca = acc['byMarca'] as Map<string, number>; byMarca.set(marca, (byMarca.get(marca) ?? 0) + rb)
      const byMeio  = acc['byMeio']  as Map<string, number>; byMeio.set(meio,   (byMeio.get(meio)   ?? 0) + rb)
      break
    }
    case 'revendedoras': {
      const cod = s(row['Cod. Revendedor'])
      const map = acc['map'] as Map<string, [string,string,string,string,string,string,string,number,number,number,Set<string>]>
      if (!map.has(cod)) map.set(cod, [cod, s(row['Nome Vendedor']), s(row['Papel']), s(row['Cod. Usuario']), s(row['Nome Supervisor']), s(row['Nome Estrutura']), s(row['Cidade']), 0, 0, 0, new Set()])
      const e = map.get(cod)!; e[7] += n(row['Receita Bruta']); e[8] += n(row['Receita Liquida']); e[9] += n2(row['Volume']); e[10].add(s(row['Cod. Pedido']))
      break
    }
    case 'supervisores': {
      const sup = s(row['Nome Supervisor'])
      const map = acc['map'] as Map<string, [string,string,Set<string>,Set<string>,Set<string>,number,number,number]>
      if (!map.has(sup)) map.set(sup, [sup, s(row['Supervisor Curto']), new Set(), new Set(), new Set(), 0, 0, 0])
      const e = map.get(sup)!; e[5] += n(row['Receita Bruta']); e[6] += n(row['Receita Liquida']); e[7] += n2(row['Volume'])
      e[2].add(s(row['Cod. Revendedor'])); e[3].add(s(row['Cod. Pedido'])); e[4].add(s(row['Nome Estrutura']))
      break
    }
    case 'estruturas': {
      const cod = n2(row['Cod. Estrutura'])
      const map = acc['map'] as Map<number, [number,string,number,string,Set<string>,number,number,number]>
      if (!map.has(cod)) map.set(cod, [cod, s(row['Nome Estrutura']), n2(row['Cod. PDV']), s(row['Cidade']), new Set(), 0, 0, 0])
      const e = map.get(cod)!; e[5] += n(row['Receita Bruta']); e[6] += n(row['Receita Liquida']); e[7] += n2(row['Volume']); e[4].add(s(row['Cod. Revendedor']))
      break
    }
    case 'produtos': {
      const rb = n(row['Receita Bruta']), vol = n2(row['Volume'])
      const secao = s(row['Secao']), marca = s(row['Marca']), meio = s(row['Meio de Captacao']), entrega = s(row['Tipo de Entrega'])
      const bySecao = acc['bySecao'] as Map<string,[number,number]>; const sc = bySecao.get(secao) ?? [0,0]; sc[0]+=rb; sc[1]+=vol; bySecao.set(secao,sc)
      const byMarca = acc['byMarca'] as Map<string,[number,number]>; const mc = byMarca.get(marca) ?? [0,0]; mc[0]+=rb; mc[1]+=vol; byMarca.set(marca,mc)
      const byMeio  = acc['byMeio']  as Map<string,[number,number]>; const mo = byMeio.get(meio)   ?? [0,0]; mo[0]+=rb; mo[1]+=1;   byMeio.set(meio,mo)
      const byEnt   = acc['byEnt']   as Map<string,number>;          byEnt.set(entrega, (byEnt.get(entrega) ?? 0) + rb)
      break
    }
    case 'logistica': {
      const vol = n2(row['Volume']), rb = n(row['Receita Bruta']), ped = s(row['Cod. Pedido'])
      const tipo = s(row['Tipo de Entrega']), cidade = s(row['Cidade'])
      const est = s(row['Nome Estrutura']), marca = s(row['Marca'])
      ;(acc['vol'] as {v:number}).v += vol
      ;(acc['rb']  as {v:number}).v += rb
      ;(acc['pedidos'] as Set<string>).add(ped)
      ;(acc['cidades'] as Set<string>).add(cidade)
      const upd3 = (map: Map<string,[number,number,number]>, k: string) => {
        const e = map.get(k) ?? [0,0,0]; e[0]+=vol; e[1]++; e[2]+=rb; map.set(k,e)
      }
      upd3(acc['byEntrega']   as Map<string,[number,number,number]>, tipo)
      upd3(acc['byCidade']    as Map<string,[number,number,number]>, cidade)
      upd3(acc['byEstrutura'] as Map<string,[number,number,number]>, est)
      const bm = acc['byMarca'] as Map<string,[number,number]>
      const me = bm.get(marca) ?? [0,0]; me[0]+=vol; me[1]++; bm.set(marca,me)
      break
    }
    case 'folha': {
      const vend = s(row['Nome Vendedor'])
      const vendMap = acc['vendMap'] as Map<string,[string,string,string,string,string,number,number,number,Set<string>,string]>
      if (!vendMap.has(vend)) vendMap.set(vend, [vend, s(row['Cod. Usuario']), s(row['Papel']), s(row['Nome Estrutura']), s(row['Canal']), 0, 0, 0, new Set(), s(row['Nome Supervisor'])])
      const ve = vendMap.get(vend)!; ve[5]+=n(row['Receita Bruta']); ve[6]+=n(row['Receita Liquida']); ve[7]+=n2(row['Volume']); ve[8].add(s(row['Cod. Pedido']))
      const sup = s(row['Nome Supervisor'])
      if (sup) {
        const supMap = acc['supMap'] as Map<string,[string,string,string,number,number,number,Set<string>]>
        if (!supMap.has(sup)) supMap.set(sup, [sup, s(row['Nome Estrutura']), s(row['Canal']), 0, 0, 0, new Set()])
        const se = supMap.get(sup)!; se[3]+=n(row['Receita Bruta']); se[4]+=n(row['Receita Liquida']); se[5]+=n2(row['Volume']); se[6].add(s(row['Cod. Pedido']))
      }
      break
    }
  }
}

function createAcc(qt: VDQueryType): Record<string, unknown> {
  switch (qt) {
    case 'ciclos_list':  return { map: new Map() }
    case 'overview':     return { rb:{v:0}, rl:{v:0}, vol:{v:0}, pedidos:new Set(), revs:new Set(), byMarca:new Map(), byMeio:new Map() }
    case 'revendedoras': return { map: new Map() }
    case 'supervisores': return { map: new Map() }
    case 'estruturas':   return { map: new Map() }
    case 'produtos':     return { bySecao:new Map(), byMarca:new Map(), byMeio:new Map(), byEnt:new Map() }
    case 'folha':        return { vendMap:new Map(), supMap:new Map() }
    case 'logistica':    return { vol:{v:0}, rb:{v:0}, pedidos:new Set(), cidades:new Set(), byEntrega:new Map(), byCidade:new Map(), byEstrutura:new Map(), byMarca:new Map() }
  }
}

function finalizeAcc(acc: Record<string, unknown>, qt: VDQueryType, page: number, ps: number) {
  switch (qt) {
    case 'ciclos_list': {
      // Ordena cronologicamente por ano, depois por numero do ciclo (ex: "01/2024" < "17/2024" < "01/2025")
      const parseCiclo = (c: string) => { const [n,y] = c.split('/'); return (parseInt(y,10)||0)*100 + (parseInt(n,10)||0) }
      const ciclos = [...(acc['map'] as Map<string,[number,number,number]>).entries()]
        .filter(([c])=>c).sort(([a],[b])=>parseCiclo(a)-parseCiclo(b))
        .map(([ciclo,[rb,rl,vol]])=>({ciclo,receita_bruta:rb,receita_liquida:rl,volume:vol}))
      return { ciclos }
    }
    case 'overview': {
      const rb=(acc['rb'] as {v:number}).v, rl=(acc['rl'] as {v:number}).v, vol=(acc['vol'] as {v:number}).v
      const pedidos=(acc['pedidos'] as Set<string>).size, revs=(acc['revs'] as Set<string>).size
      const tot = rb || 1
      const por_marca = [...(acc['byMarca'] as Map<string,number>).entries()].sort((a,b)=>b[1]-a[1])
        .map(([marca,rb])=>({marca,receita_bruta:rb,pct:+(rb/tot*100).toFixed(1)}))
      const por_meio_captacao = [...(acc['byMeio'] as Map<string,number>).entries()].sort((a,b)=>b[1]-a[1])
        .map(([meio,rb])=>({meio,receita_bruta:rb}))
      return {kpis:{receita_bruta:rb,receita_liquida:rl,volume:vol,pedidos,revendedoras_ativas:revs},por_marca,por_meio_captacao}
    }
    case 'revendedoras': {
      const all = [...(acc['map'] as Map<string,[string,string,string,string,string,string,string,number,number,number,Set<string>]>).values()]
        .sort((a,b)=>b[7]-a[7])
        .map(([cod_revendedor,nome_vendedor,papel,cod_usuario,nome_supervisor,nome_estrutura,cidade,rb,rl,vol,ped])=>({cod_revendedor,nome_vendedor,papel,cod_usuario,nome_supervisor,nome_estrutura,cidade,receita_bruta:rb,receita_liquida:rl,volume:vol,pedidos:ped.size}))
      return {data:all.slice(page*ps,(page+1)*ps),total:all.length}
    }
    case 'supervisores': {
      const data = [...(acc['map'] as Map<string,[string,string,Set<string>,Set<string>,Set<string>,number,number,number]>).values()]
        .sort((a,b)=>b[5]-a[5])
        .map(([nome,curto,revs,peds,ests,rb,rl,vol])=>({nome_supervisor:nome,supervisor_curto:curto,revendedoras_ativas:revs.size,pedidos:peds.size,estruturas:[...ests].filter(Boolean),receita_bruta:rb,receita_liquida:rl,volume:vol}))
      return {data}
    }
    case 'estruturas': {
      const data = [...(acc['map'] as Map<number,[number,string,number,string,Set<string>,number,number,number]>).values()]
        .sort((a,b)=>b[5]-a[5])
        .map(([cod,nome,pdv,cidade,revs,rb,rl,vol])=>({cod_estrutura:cod,nome_estrutura:nome,cod_pdv:pdv,cidade,revendedoras:revs.size,receita_bruta:rb,receita_liquida:rl,volume:vol}))
      return {data}
    }
    case 'produtos': {
      const sortRb = <T extends [number,number]>(m: Map<string,T>) => [...m.entries()].sort((a,b)=>b[1][0]-a[1][0])
      return {
        por_secao:   sortRb(acc['bySecao'] as Map<string,[number,number]>).map(([secao,[rb,vol]])=>({secao,receita_bruta:rb,volume:vol})),
        por_marca:   sortRb(acc['byMarca'] as Map<string,[number,number]>).map(([marca,[rb,vol]])=>({marca,receita_bruta:rb,volume:vol})),
        por_meio:    [...(acc['byMeio'] as Map<string,[number,number]>).entries()].sort((a,b)=>b[1][0]-a[1][0]).map(([meio,[rb,p]])=>({meio,receita_bruta:rb,pedidos:p})),
        por_entrega: [...(acc['byEnt'] as Map<string,number>).entries()].sort((a,b)=>b[1]-a[1]).map(([tipo,rb])=>({tipo,receita_bruta:rb})),
      }
    }
    case 'folha': return acc
    case 'logistica': {
      const vol=(acc['vol'] as {v:number}).v, rb=(acc['rb'] as {v:number}).v
      const pedidos=(acc['pedidos'] as Set<string>).size, cidades=(acc['cidades'] as Set<string>).size
      const toArr3 = (map: Map<string,[number,number,number]>, key: string) =>
        [...map.entries()].filter(([k])=>k).sort((a,b)=>b[1][0]-a[1][0])
          .map(([k,[v,p,r]])=>({[key]:k,volume:v,pedidos:p,receita_bruta:r}))
      return {
        kpis: {volume:vol,pedidos,receita_bruta:rb,cidades},
        por_entrega:   toArr3(acc['byEntrega']   as Map<string,[number,number,number]>, 'tipo'),
        top_cidades:   toArr3(acc['byCidade']    as Map<string,[number,number,number]>, 'cidade').slice(0,20),
        por_estrutura: toArr3(acc['byEstrutura'] as Map<string,[number,number,number]>, 'estrutura'),
        por_marca:     [...(acc['byMarca'] as Map<string,[number,number]>).entries()]
          .filter(([k])=>k).sort((a,b)=>b[1][0]-a[1][0]).map(([marca,[v,p]])=>({marca,volume:v,pedidos:p})),
      }
    }
  }
}

// --- Handler ---

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const { tenant_id, query_type, filters = {}, page = 0, page_size = 50, file_name = 'pedidosUnificado.parquet' } = await req.json()

    if (!tenant_id)  return json({ error: 'tenant_id obrigatorio',  code: 'MISSING_PARAM' })
    if (!query_type) return json({ error: 'query_type obrigatorio', code: 'MISSING_PARAM' })

    const saEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    const saKey   = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')
    if (!saEmail || !saKey)
      return json({ error: 'Integracao Google Drive nao configurada.', code: 'CREDENTIALS_MISSING' })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: tenant, error: tErr } = await supabase
      .from('tenants').select('google_drive_folder_id').eq('id', tenant_id).single()
    if (tErr || !tenant?.google_drive_folder_id)
      return json({ error: 'Pasta do Drive nao configurada.', code: 'FOLDER_NOT_SET' })

    const folderId = extractFolderId(tenant.google_drive_folder_id)
    const auth     = `Bearer ${await getAccessToken(saEmail, saKey)}`

    const searchRes  = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false and name='${file_name}'&fields=files(id,name,size,modifiedTime)&pageSize=1`,
      { headers: { Authorization: auth } }
    )
    const searchBody = await searchRes.json()
    if (!searchRes.ok || searchBody.error) return json({ error: searchBody.error?.message ?? 'Erro Drive API.', code: 'DRIVE_API_ERROR' })
    if (!searchBody.files?.length) return json({ error: `${file_name} nao encontrado.`, code: 'FILE_NOT_FOUND' })

    const { id: fileId, size: sizeStr, modifiedTime } = searchBody.files[0]
    const fileSize = parseInt(sizeStr, 10)
    const cacheKey = stableCacheKey(query_type, filters as VDFilters, page, page_size)

    // Check backend cache — cache hit avoids the 5-6s parquet download+compute
    try {
      const { data: hit } = await supabase.from('vd_query_cache')
        .select('result').eq('tenant_id', tenant_id)
        .eq('cache_key', cacheKey).eq('file_modified_at', String(modifiedTime)).maybeSingle()
      if (hit?.result) {
        console.log('[vd-query] CACHE HIT', cacheKey)
        return json(hit.result)
      }
    } catch (e) { console.log('[vd-query] Cache check skipped:', String(e)) }

    // Fire-and-forget cache write after computation
    const writeCache = (result: unknown) => {
      supabase.from('vd_query_cache').upsert(
        { tenant_id, cache_key: cacheKey, result: result as Record<string, unknown>, file_modified_at: String(modifiedTime) },
        { onConflict: 'tenant_id,cache_key' }
      ).then(({ error: e }) => {
        if (e) console.error('[vd-query] Cache write:', e.message)
        else console.log('[vd-query] Cached', cacheKey)
      })
    }

    console.log('[vd-query] CACHE MISS', cacheKey, '- computing...')
    const mediaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`

    console.log('[vd-query] Downloading', (fileSize/1e6).toFixed(1), 'MB, query:', query_type)
    const buf = await (await fetch(mediaUrl, { headers: { Authorization: auth } })).arrayBuffer()
    console.log('[vd-query] Downloaded OK,', (buf.byteLength/1e6).toFixed(1), 'MB')

    const cols = (COLS as Record<string, string[]>)[query_type]
    if (!cols) return json({ error: `query_type desconhecido: ${query_type}`, code: 'UNKNOWN_QUERY' })

    const acc = createAcc(query_type as VDQueryType)

    // Uma unica chamada parquetRead: hyparquet chama onComplete por row group (~10k linhas/vez).
    // deno-lint-ignore no-explicit-any
    await parquetRead({ file: buf, columns: cols, onComplete: (rows: any[]) => {
      for (let i = 0; i < rows.length; i++) {
        let row = rows[i]
        if (Array.isArray(row)) {
          const obj: Record<string, unknown> = {}
          cols.forEach((c, idx) => { obj[c] = row[idx] })
          row = obj
        }
        processRow(row as Record<string, unknown>, query_type as VDQueryType, acc, filters as VDFilters)
      }
    }})

    console.log('[vd-query] Aggregation done, finalizing...')

    if (query_type === 'folha') {
      const vendMap = acc['vendMap'] as Map<string, [string,string,string,string,string,number,number,number,Set<string>,string]>
      const supMap  = acc['supMap']  as Map<string, [string,string,string,number,number,number,Set<string>]>

      const codUsuarios = [...vendMap.values()].map(v => v[1].replace(/\./g, '')).filter(Boolean)
      const { data: pv } = await supabase.from('profiles').select('nome,cpf,usuario_extranet').in('usuario_extranet', codUsuarios).eq('tenant_id', tenant_id)
      const { data: ps } = await supabase.from('profiles').select('nome,cpf,usuario_extranet').in('nome', [...supMap.keys()]).eq('tenant_id', tenant_id)
      // deno-lint-ignore no-explicit-any
      const vcMap = new Map((pv ?? []).map((p: any) => [p.usuario_extranet, p]))
      // deno-lint-ignore no-explicit-any
      const snMap = new Map((ps ?? []).map((p: any) => [p.nome, p]))

      const data = [
        ...[...supMap.values()].sort((a,b)=>b[3]-a[3]).map(([nome,est,canal,rb,rl,vol,peds])=>{
          // deno-lint-ignore no-explicit-any
          const p = snMap.get(nome) as any
          return {tipo:'supervisor',nome,estrutura:est,canal,papel:'Supervisor',receita_bruta:rb,receita_liquida:rl,volume:vol,pedidos:peds.size,cpf:p?.cpf??null,usuario_extranet:p?.usuario_extranet??null,nome_supervisor:null}
        }),
        ...[...vendMap.values()].sort((a,b)=>b[5]-a[5]).map(([nome,cod_usuario,papel,estrutura,canal,rb,rl,vol,peds,nome_supervisor])=>{
          // deno-lint-ignore no-explicit-any
          const p = vcMap.get(cod_usuario.replace(/\./g,'')) as any
          return {tipo:'revendedora',nome,cod_usuario,papel,estrutura,canal,nome_supervisor,receita_bruta:rb,receita_liquida:rl,volume:vol,pedidos:peds.size,cpf:p?.cpf??null,usuario_extranet:p?.usuario_extranet??null}
        }),
      ]
      const folhaResult = { data }
      writeCache(folhaResult)
      return json(folhaResult)
    }

    const result = finalizeAcc(acc, query_type as VDQueryType, page, page_size)
    writeCache(result)
    return json(result)

  } catch (err) {
    console.error('[vd-query]', err)
    return json({ error: String(err), code: 'INTERNAL_ERROR' })
  }
})
