import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Profile } from '../types'

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  /** True enquanto o perfil está sendo buscado após o signIn */
  profileLoading: boolean
  signIn: (email: string, password: string) => Promise<Profile | null>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfileWithTimeout(userId: string): Promise<Profile | null> {
  const query = supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    .then(({ data, error }) => {
      if (error) { console.warn('[Auth] fetchProfile:', error.message); return null }
      return data as Profile
    })

  const timeout = new Promise<null>(resolve =>
    setTimeout(() => { console.warn('[Auth] fetchProfile timeout'); resolve(null) }, 10_000)
  )

  return Promise.race([query, timeout])
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                     = useState<User | null>(null)
  const [profile, setProfile]               = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const loadingRef = useRef(false)

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (loadingRef.current) return profile
    loadingRef.current = true
    setProfileLoading(true)
    try {
      const p = await fetchProfileWithTimeout(userId)
      setProfile(p)
      return p
    } finally {
      loadingRef.current = false
      setProfileLoading(false)
    }
  }, [profile])

  const refreshProfile = useCallback(async () => {
    if (user) { loadingRef.current = false; await loadProfile(user.id) }
  }, [user, loadProfile])

  useEffect(() => {
    /*
     * Escuta mudanças de autenticação (logout, token refresh).
     * NÃO restaura sessão automaticamente — o usuário deve sempre fazer login.
     * O SIGNED_OUT limpa o estado local.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth]', event)

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          setProfile(null)
          setProfileLoading(false)
          loadingRef.current = false
        }
        // SIGNED_IN e TOKEN_REFRESHED são tratados pelo signIn() explícito
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  /**
   * Login explícito — único ponto de entrada para autenticação.
   * Retorna o Profile carregado para redirect inteligente imediato.
   */
  async function signIn(email: string, password: string): Promise<Profile | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.user) {
      setUser(data.user)
      loadingRef.current = false
      const p = await loadProfile(data.user.id)
      // Registra último acesso (fire-and-forget)
      supabase.from('profiles')
        .update({ ultimo_acesso: new Date().toISOString() })
        .eq('id', data.user.id)
        .then(() => {})
      return p
    }
    return null
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } },
    })
    if (error) throw error
  }

  async function signOut() {
    setUser(null)
    setProfile(null)
    setProfileLoading(false)
    loadingRef.current = false
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, profile, profileLoading,
      signIn, signUp, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
