import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { PermissionsService } from '../services/permissions.service'

// ─── Context shape ─────────────────────────────────────────────────────────────

interface PermissionsContextValue {
  /** Slugs de módulo autorizados para o papel do usuário logado */
  allowedModules: string[]
  /** true enquanto carrega as permissões */
  loading: boolean
  /** ank_admin ignora restrições de módulo */
  isAdmin: boolean
  /** Verifica se o usuário pode acessar um módulo específico */
  can: (slug: string) => boolean
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [allowedModules, setAllowedModules] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const isAdmin = profile?.papel === 'ank_admin'

  useEffect(() => {
    // ANK admin bypassa restrições de módulo
    if (!profile || isAdmin) {
      setLoading(false)
      return
    }

    setLoading(true)
    PermissionsService.getSlugsForPapel(profile.papel).then(({ data }) => {
      setAllowedModules(data?.map(r => r.slug_modulo) ?? [])
      setLoading(false)
    })
  }, [profile, isAdmin])

  const can = useMemo(
    () => (slug: string) => isAdmin || allowedModules.includes(slug),
    [isAdmin, allowedModules],
  )

  return (
    <PermissionsContext.Provider value={{ allowedModules, loading, isAdmin, can }}>
      {children}
    </PermissionsContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext)
  if (!ctx) throw new Error('usePermissions deve ser usado dentro de <PermissionsProvider>')
  return ctx
}
