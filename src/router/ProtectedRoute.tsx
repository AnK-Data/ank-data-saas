import { Navigate, Outlet } from 'react-router-dom'
import { differenceInDays, parseISO } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { useLicense } from '../hooks/useLicense'
import Spinner from '../components/ui/Spinner'
import { isAnkRole } from '../types'

/**
 * Guard de autenticação — SEMPRE exige login explícito.
 * Sem usuário no estado → /login (sem tentar restaurar sessão).
 */
export function ProtectedRoute() {
  const { user, profile, profileLoading } = useAuth()
  const { license, loading: licenseLoading } = useLicense()

  // Sem sessão → login (validação obrigatória)
  if (!user) return <Navigate to="/login" replace />

  // Buscando perfil após login → spinner breve
  if (profileLoading) return <Spinner fullScreen />

  // Perfil não encontrado no banco
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-700 mb-2">Perfil não encontrado</p>
          <p className="text-sm text-red-600 mb-4">
            Usuário autenticado mas sem registro em{' '}
            <code className="bg-red-100 px-1 rounded">profiles</code>.
            Contate o administrador AnK Data.
          </p>
          <button onClick={() => { window.location.href = '/login' }}
            className="text-sm font-medium text-red-700 underline">
            Sair e voltar ao login
          </button>
        </div>
      </div>
    )
  }

  // Usuários ANK → painel admin (sem verificação de licença)
  if (isAnkRole(profile.papel)) return <Outlet />

  // Franqueado → verifica licença
  if (profile.tenant_id && licenseLoading) return <Spinner fullScreen />

  const dias = license
    ? differenceInDays(parseISO(license.data_fim_ciclo), new Date())
    : -1

  if (!license || license.status === 'EXPIRED' || license.status === 'SUSPENDED' || dias < 0) {
    return <Navigate to="/lock" replace />
  }

  return <Outlet />
}
