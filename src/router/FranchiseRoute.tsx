import { Navigate, Outlet } from 'react-router-dom'
import { differenceInDays, parseISO } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { useLicense } from '../hooks/useLicense'
import Spinner from '../components/ui/Spinner'
import { isAnkRole } from '../types'

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

  // Usuários ANK não acessam o painel franqueado
  if (isAnkRole(profile.papel)) return <Navigate to="/admin-ank" replace />

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
