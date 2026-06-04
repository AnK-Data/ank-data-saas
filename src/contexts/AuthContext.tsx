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
import { getAuthByIngresseId } from '../services/ingresse.service'

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export type LoginMode = 'email' | 'ingresse'

export interface SignInResult {
  profile: Profile | null
  /** true = usuário nunca definiu senha → redirecionar para /primeiro-acesso */
  firstAccess: boolean
  /** true = conta bloqueada (status Inativo) */
  blocked: boolean
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  profileLoading: boolean
  /** Login por e-mail (AnK Data / Prestadores) */
  signIn: (email: string, password: string) => Promise<SignInResult>
  /** Login por Ingresse ID (colaboradores de franquia) */
  signInIngresse: (ingresseId: string, password: string) => Promise<SignInResult>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchProfileWithTimeout(userId: string): Promise<Profile | null> {
  const query = supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    .then(({ data, error }) => {
      if (error) { console.warn('[Auth] fetchProfile: falha ao carregar perfil'); return null }
      return data as Profile
    })

  const timeout = new Promise<null>(resolve =>
    setTimeout(() => { console.warn('[Auth] fetchProfile timeout'); resolve(null) }, 10_000)
  )
  return Promise.race([query, timeout])
}

// ─── Provider ─────────────────────────────────────────────────────────────────

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null); setProfile(null)
          setProfileLoading(false); loadingRef.current = false
        }
      },
    )
    return () => subscription.unsubscribe()
  }, [])

  // ─── Login por e-mail (AnK Data / Prestadores) ──────────────────────────────

  async function signIn(email: string, password: string): Promise<SignInResult> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (!data.user) return { profile: null, firstAccess: false, blocked: false }

    setUser(data.user)
    loadingRef.current = false
    const p = await loadProfile(data.user.id)

    if (p?.status === 'Inativo') {
      await supabase.auth.signOut()
      setUser(null); setProfile(null)
      throw new Error('Usuário inativo. Contate o administrador.')
    }

    supabase.from('profiles').update({ ultimo_acesso: new Date().toISOString() })
      .eq('id', data.user.id).then(() => {})

    return { profile: p, firstAccess: p?.first_access ?? false, blocked: false }
  }

  // ─── Login por Ingresse ID (colaboradores de franquia) ──────────────────────

  async function signInIngresse(ingresseId: string, password: string): Promise<SignInResult> {
    // 1. Busca o email interno associado ao Ingresse ID
    const lookup = await getAuthByIngresseId(ingresseId.trim())

    if (!lookup) {
      throw new Error('Usuário Ingresse não encontrado. Verifique o ID e tente novamente.')
    }

    if (lookup.status === 'Inativo') {
      throw new Error('Usuário inativo. Contate o administrador da franquia.')
    }

    // 2. Se first_access, não há conta criada ainda → redirecionar
    if (lookup.first_access) {
      return { profile: null, firstAccess: true, blocked: false }
    }

    // 3. Autentica com o email interno
    const { data, error } = await supabase.auth.signInWithPassword({
      email: lookup.auth_email,
      password,
    })
    if (error) throw new Error('Senha incorreta.')

    if (!data.user) return { profile: null, firstAccess: false, blocked: false }

    setUser(data.user)
    loadingRef.current = false
    const p = await loadProfile(data.user.id)

    // Verifica first_access novamente no profile (pode ter sido resetado pelo admin)
    if (p?.first_access) {
      return { profile: p, firstAccess: true, blocked: false }
    }

    supabase.from('profiles').update({ ultimo_acesso: new Date().toISOString() })
      .eq('id', data.user.id).then(() => {})

    return { profile: p, firstAccess: false, blocked: false }
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: fullName } },
    })
    if (error) throw error
  }

  async function signOut() {
    setUser(null); setProfile(null)
    setProfileLoading(false); loadingRef.current = false
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, profile, profileLoading,
      signIn, signInIngresse, signUp, signOut, refreshProfile,
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
