import { Navigate, Outlet } from 'react-router-dom'
import { differenceInDays, parseISO } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { useLicense } from '../hooks/useLicense'
import Spinner from '../components/ui/Spinner'

export function ProtectedRoute() {
  const { user, profile, initializing, profileLoading } = useAuth()
  const { license, loading: licenseLoading } = useLicense()

  // 1. Restaurando sessão inicial do localStorage
  if (initializing)    return <Spinner fullScreen />

  // 2. Sem sessão → login
  if (!user)           return <Navigate to="/login" replace />

  // 3. Perfil ainda carregando (query em background)
  if (profileLoading)  return <Spinner fullScreen />

  // 4. Perfil ausente no banco → aviso
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-700 mb-2">Perfil não encontrado</p>
          <p className="text-sm text-red-600 mb-4">
            Usuário autenticado mas sem registro em{' '}
            <code className="bg-red-100 px-1 rounded">profiles</code>.
            Contate o administrador ANK Data.
          </p>
          <button
            onClick={() => { window.location.href = '/login' }}
            className="text-sm font-medium text-red-700 underline"
          >
            Sair e voltar ao login
          </button>
        </div>
      </div>
    )
  }

  // 5. Admin ANK: acesso total
  if (profile.papel === 'ank_admin') return <Outlet />

  // 6. Franqueado: verifica licença
  if (profile.tenant_id && licenseLoading) return <Spinner fullScreen />

  const diasRestantes = license
    ? differenceInDays(parseISO(license.data_fim_ciclo), new Date())
    : -1

  const blocked =
    !license ||
    license.status === 'EXPIRED' ||
    license.status === 'SUSPENDED' ||
    diasRestantes < 0

  if (blocked) return <Navigate to="/lock" replace />

  return <Outlet />
}
