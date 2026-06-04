import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { PermissionsService } from '../services/permissions.service'
import { ANK_ROLES } from '../types'

// ─── Context shape ─────────────────────────────────────────────────────────────

interface PermissionsContextValue {
  /** Slugs liberados para o usuário (interseção: módulos contratados ∩ papel do usuário) */
  allowedModules: string[]
  /** Slugs contratados pelo tenant (independente do papel do usuário) */
  tenantModules: string[]
  loading: boolean
  isAdmin: boolean
  /** Verifica acesso a um módulo: tenant contratou E usuário tem papel para isso */
  can: (slug: string) => boolean
  /** Verifica se o tenant contratou determinado módulo (sem verificar papel) */
  tenantCan: (slug: string) => boolean
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

// ─── Papéis com acesso total dentro do que o tenant contratou ────────────────

const FULL_ACCESS_PAPEIS = [
  ...ANK_ROLES,
  'franqueado', 'sucessor', 'admin_franquia',
  'funcionario_administrativo_cp',
  'gerente_canal_loja', 'gerente_canal_vd',
]

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()

  const [userSlugs,   setUserSlugs]   = useState<string[]>([])
  const [tenantSlugs, setTenantSlugs] = useState<string[]>([])
  const [loading,     setLoading]     = useState(false)

  // Usuários ANK internos têm acesso irrestrito (ignoram ambas as checagens)
  const isAnkInternal = ANK_ROLES.includes(profile?.papel as typeof ANK_ROLES[number])

  // Papéis de gestão da franquia: acesso a tudo que o tenant contratou
  const isFullAccess = FULL_ACCESS_PAPEIS.includes(profile?.papel ?? '')

  const isAdmin = isAnkInternal

  useEffect(() => {
    if (!profile) return

    // ANK internos: nada a carregar
    if (isAnkInternal) { setLoading(false); return }

    setLoading(true)

    Promise.all([
      // 1. Slugs do papel do usuário (permissoes_papel)
      isFullAccess
        ? Promise.resolve({ data: null }) // gestores têm acesso total ao que o tenant tem
        : PermissionsService.getSlugsForPapel(profile.papel),

      // 2. Slugs dos módulos contratados pelo tenant
      profile.tenant_id
        ? supabase
            .from('tenants')
            .select('modulos_ids')
            .eq('id', profile.tenant_id)
            .single()
            .then(async ({ data: tenant }) => {
              const ids = (tenant?.modulos_ids ?? []) as string[]
              if (!ids.length) return { data: [] as string[] }

              const { data: mods } = await supabase
                .from('planos_catalogo')
                .select('feature_slugs')
                .in('id', ids)

              const slugs = [...new Set(
                (mods ?? []).flatMap((m: { feature_slugs: string[] | null }) => m.feature_slugs ?? [])
              )]
              return { data: slugs }
            })
        : Promise.resolve({ data: [] as string[] }),
    ]).then(([papelRes, tenantRes]) => {
      setUserSlugs(
        isFullAccess
          ? ['*']  // sinaliza acesso total ao que o tenant tem
          : (papelRes.data?.map((r: { slug_modulo: string }) => r.slug_modulo) ?? [])
      )
      setTenantSlugs((tenantRes.data ?? []) as string[])
      setLoading(false)
    })
  }, [profile?.id, profile?.tenant_id, profile?.papel]) // eslint-disable-line react-hooks/exhaustive-deps

  // Slugs finais: interseção de tenant + usuário
  const allowedModules = useMemo(() => {
    if (isAnkInternal) return ['*']
    if (!tenantSlugs.length) return userSlugs.filter(s => s !== '*')
    if (userSlugs[0] === '*') return tenantSlugs  // gestores: tudo que tenant contratou
    return tenantSlugs.filter(s => userSlugs.includes(s))  // colaboradores: interseção
  }, [isAnkInternal, tenantSlugs, userSlugs])

  const can = useMemo(
    () => (slug: string) => {
      if (isAnkInternal) return true
      if (allowedModules[0] === '*') return true
      return allowedModules.includes(slug)
    },
    [isAnkInternal, allowedModules],
  )

  const tenantCan = useMemo(
    () => (slug: string) => {
      if (isAnkInternal) return true
      if (!tenantSlugs.length) return true  // sem módulos configurados: libera tudo
      return tenantSlugs.includes(slug)
    },
    [isAnkInternal, tenantSlugs],
  )

  return (
    <PermissionsContext.Provider value={{
      allowedModules: allowedModules[0] === '*' ? tenantSlugs : allowedModules,
      tenantModules: tenantSlugs,
      loading,
      isAdmin,
      can,
      tenantCan,
    }}>
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
