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
  initializing: boolean
  profileLoading: boolean
  /** Resolve após auth + perfil carregados. Retorna o perfil para redirect inteligente. */
  signIn: (email: string, password: string) => Promise<Profile | null>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('sb-') && key?.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        if (raw) return Boolean(JSON.parse(raw)?.access_token)
      }
    }
  } catch { /* noop */ }
  return false
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                     = useState<User | null>(null)
  const [profile, setProfile]               = useState<Profile | null>(null)
  const [initializing, setInitializing]     = useState(hasStoredSession)
  const [profileLoading, setProfileLoading] = useState(false)
  const loadingRef = useRef(false)

  // Retorna o profile carregado (para uso direto no signIn)
  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (loadingRef.current) return profile  // já está carregando
    loadingRef.current = true
    setProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      const p = error ? null : (data as Profile)
      setProfile(p)
      if (error) console.warn('[Auth] loadProfile:', error.message)
      return p
    } catch (e) {
      console.error('[Auth] loadProfile exception:', e)
      setProfile(null)
      return null
    } finally {
      loadingRef.current = false
      setProfileLoading(false)
    }
  }, [profile])

  const refreshProfile = useCallback(async () => {
    if (user) { loadingRef.current = false; await loadProfile(user.id) }
  }, [user, loadProfile])

  useEffect(() => {
    let settled = false
    const settle = () => { if (!settled) { settled = true; setInitializing(false) } }
    const timeout = setTimeout(settle, 6000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        settle()
        if (session?.user) {
          setUser(session.user)
          loadingRef.current = false   // permite re-fetch no auth change
          loadProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
          setProfileLoading(false)
          loadingRef.current = false
        }
      },
    )

    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [loadProfile])

  /** signIn: aguarda auth + perfil — retorna Profile para redirect inteligente */
  async function signIn(email: string, password: string): Promise<Profile | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    if (data.user) {
      setUser(data.user)
      loadingRef.current = false
      const p = await loadProfile(data.user.id)
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
    setUser(null); setProfile(null)
    setProfileLoading(false); loadingRef.current = false
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user, profile, initializing, profileLoading,
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
