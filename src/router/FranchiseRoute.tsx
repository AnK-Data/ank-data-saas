import { Navigate, Outlet } from 'react-router-dom'
import { differenceInDays, parseISO } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { useLicense } from '../hooks/useLicense'
import Spinner from '../components/ui/Spinner'

/**
 * Guard do painel do franqueado — SEMPRE exige login explícito.
 * Sem usuário no estado → /login imediatamente.
 */
export function FranchiseRoute() {
  const { user, profile, profileLoading } = useAuth()
  const { license, loading: licenseLoading } = useLicense()

  // Sem sessão → login obrigatório
  if (!user) return <Navigate to="/login" replace />

  // Buscando perfil
  if (profileLoading) return <Spinner fullScreen />

  // Perfil ausente
  if (!profile) return <Navigate to="/login" replace />

  // Admin ANK não acessa o painel franqueado
  if (profile.papel === 'ank_admin') return <Navigate to="/admin-ank" replace />

  // Aguarda verificação da licença
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
