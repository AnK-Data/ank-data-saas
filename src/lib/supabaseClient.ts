import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn('[AnK Data] Supabase não configurado. Crie .env.local com as variáveis.')
}

export const supabase = createClient(
  supabaseUrl     ?? 'http://localhost:54321',
  supabaseAnonKey ?? 'placeholder-key',
  {
    auth: {
      autoRefreshToken:  true,
      persistSession:    true,
      detectSessionInUrl: false, // evita round-trip extra na inicialização
    },
  },
)
