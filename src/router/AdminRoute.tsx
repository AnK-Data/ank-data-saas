import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Guarda de segundo nível: só passa papel === 'ank_admin'.
 * ProtectedRoute já garantiu autenticação e perfil carregado antes.
 */
export function AdminRoute() {
  const { profile } = useAuth()

  if (profile?.papel !== 'ank_admin') return <Navigate to="/unauthorized" replace />

  return <Outlet />
}
