import { Navigate, Outlet } from 'react-router-dom'
import { differenceInDays, parseISO } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { useLicense } from '../hooks/useLicense'
import Spinner from '../components/ui/Spinner'

/**
 * Guard para o painel do franqueado (/franqueado/*).
 * - ank_admin → redireciona para /admin-ank (painel deles)
 * - Sem licença ou licença bloqueada → /lock
 * - OK → renderiza <Outlet />
 */
export function FranchiseRoute() {
  const { user, profile, initializing, profileLoading } = useAuth()
  const { license, loading: licenseLoading } = useLicense()

  if (initializing || profileLoading) return <Spinner fullScreen />
  if (!user)    return <Navigate to="/login" replace />
  if (!profile) return <Navigate to="/login" replace />

  // Admin ANK não acessa o painel do franqueado
  if (profile.papel === 'ank_admin') return <Navigate to="/admin-ank" replace />

  if (profile.tenant_id && licenseLoading) return <Spinner fullScreen />

  const dias = license
    ? differenceInDays(parseISO(license.data_fim_ciclo), new Date())
    : -1

  const blocked =
    !license ||
    license.status === 'EXPIRED' ||
    license.status === 'SUSPENDED' ||
    dias < 0

  if (blocked) return <Navigate to="/lock" replace />

  return <Outlet />
}
