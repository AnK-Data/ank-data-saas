import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isAnkRole } from '../types'

/**
 * Guarda de segundo nível: só passa usuários do domínio AnK Data.
 * ProtectedRoute já garantiu autenticação e perfil carregado antes.
 */
export function AdminRoute() {
  const { profile } = useAuth()

  if (!profile || !isAnkRole(profile.papel)) return <Navigate to="/unauthorized" replace />

  return <Outlet />
}
