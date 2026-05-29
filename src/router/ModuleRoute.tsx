import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions } from '../contexts/PermissionsContext'
import Spinner from '../components/ui/Spinner'

interface ModuleRouteProps {
  /** Slug do módulo a ser verificado */
  slug: string
  /** Redireciona para esta rota se não autorizado (padrão: /unauthorized) */
  redirectTo?: string
}

/**
 * Guarda de rota baseada em módulo/permissão.
 * Usa o PermissionsContext para verificar se o papel do usuário
 * tem acesso ao slug de módulo informado.
 *
 * ANK admins sempre passam.
 * Usuários de franquia sem permissão são redirecionados.
 */
export function ModuleRoute({ slug, redirectTo = '/unauthorized' }: ModuleRouteProps) {
  const { can, loading } = usePermissions()

  if (loading) return <Spinner fullScreen />
  if (!can(slug)) return <Navigate to={redirectTo} replace />

  return <Outlet />
}
