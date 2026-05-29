/**
 * Script de uso único — cria o usuário Admin Master da ANK Data.
 *
 * Pré-requisito: a SERVICE_ROLE_KEY do Supabase (não é a anon key).
 * Supabase Dashboard → Project Settings → API → Service Role (secret)
 *
 * Uso:
 *   node scripts/create-admin.mjs <SERVICE_ROLE_KEY>
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

// ── Lê a URL do .env.local ──────────────────────────────────────────────────
const envPath = join(__dir, '..', '.env.local')
const envLines = readFileSync(envPath, 'utf8').split('\n')
const envMap = Object.fromEntries(
  envLines
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    }),
)

const SUPABASE_URL      = envMap['VITE_SUPABASE_URL']
const SERVICE_ROLE_KEY  = process.argv[2]

if (!SUPABASE_URL) {
  console.error('❌  VITE_SUPABASE_URL não encontrado em .env.local')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY) {
  console.error('❌  Informe a Service Role Key como argumento:')
  console.error('    node scripts/create-admin.mjs <SERVICE_ROLE_KEY>')
  process.exit(1)
}

// ── Cliente com permissões de admin ────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ADMIN_EMAIL    = 'canhoto.works@gmail.com'
const ADMIN_PASSWORD = '!6088El98!'
const ADMIN_NAME     = 'Admin ANK Data'

console.log('\n🔧  Criando usuário Admin Master da ANK Data…\n')

// ── 1. Cria o usuário via Admin API (sem e-mail de confirmação) ────────────
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email:         ADMIN_EMAIL,
  password:      ADMIN_PASSWORD,
  email_confirm: true,                    // confirma imediatamente
  user_metadata: { full_name: ADMIN_NAME },
})

if (authError) {
  if (authError.message.includes('already been registered')) {
    console.log('⚠️   Usuário já existe no Auth. Atualizando perfil…')
    // Busca o ID do usuário existente
    const { data: list } = await supabase.auth.admin.listUsers()
    const existing = list?.users?.find(u => u.email === ADMIN_EMAIL)
    if (!existing) {
      console.error('❌  Não foi possível localizar o usuário existente.')
      process.exit(1)
    }
    await upsertProfile(existing.id)
  } else {
    console.error('❌  Erro ao criar usuário:', authError.message)
    process.exit(1)
  }
} else {
  console.log('✅  Usuário criado no Auth — ID:', authData.user.id)
  await upsertProfile(authData.user.id)
}

async function upsertProfile(userId) {
  // Aguarda brevemente o trigger on_auth_user_created
  await new Promise(r => setTimeout(r, 1200))

  const { error: upErr } = await supabase
    .from('profiles')
    .upsert(
      {
        id:         userId,
        role:       'ank_admin',
        full_name:  ADMIN_NAME,
        email:      ADMIN_EMAIL,
        tenant_id:  null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (upErr) {
    console.error('❌  Erro ao gravar perfil:', upErr.message)
    process.exit(1)
  }

  console.log('✅  Perfil gravado com role = ank_admin')
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Admin Master ANK Data criado!')
  console.log('  E-mail :', ADMIN_EMAIL)
  console.log('  Role   : ank_admin')
  console.log('  Tenant : (nenhum — acesso global)')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}
