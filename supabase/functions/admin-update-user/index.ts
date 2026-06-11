/**
 * admin-update-user
 * Gerencia usuários via service role. Somente ank_admin pode chamar.
 *
 * Body (action = 'get'):    { action: 'get',    target_user_id }
 *   → retorna { email }
 *
 * Body (action = 'update'): { action: 'update', target_user_id, email?, password? }
 *   → retorna { success: true }
 */

import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verifica se o chamador é ank_admin
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return json({ error: 'Não autorizado.' }, 401)

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !caller) return json({ error: 'Token inválido.' }, 401)

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles').select('papel').eq('id', caller.id).single()
    if (callerProfile?.papel !== 'ank_admin') return json({ error: 'Acesso negado — somente ank_admin.' }, 403)

    const body = await req.json()
    const { action = 'update', target_user_id } = body
    if (!target_user_id) return json({ error: 'target_user_id obrigatório.' }, 400)

    // --- GET: retorna email atual ---
    if (action === 'get') {
      const { data: { user: target }, error: getErr } = await supabaseAdmin.auth.admin.getUserById(target_user_id)
      if (getErr || !target) return json({ error: 'Usuário não encontrado.' }, 404)
      return json({ email: target.email ?? null })
    }

    // --- UPDATE: atualiza email e/ou senha ---
    const { email, password } = body
    if (!email && !password) return json({ error: 'Informe ao menos email ou password.' }, 400)

    const updates: { email?: string; password?: string } = {}
    if (email?.trim())    updates.email    = email.trim()
    if (password?.trim()) updates.password = password.trim()

    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, updates)
    if (updateErr) return json({ error: updateErr.message }, 400)

    console.log('[admin-update-user] updated', target_user_id, 'fields:', Object.keys(updates))
    return json({ success: true })

  } catch (err) {
    console.error('[admin-update-user]', err)
    return json({ error: String(err) }, 500)
  }
})
