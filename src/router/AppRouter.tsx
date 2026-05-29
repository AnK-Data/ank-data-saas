import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AdminRoute }    from './AdminRoute'
import { FranchiseRoute } from './FranchiseRoute'

// Páginas públicas
import LoginPage      from '../pages/auth/LoginPage'
import RegisterPage   from '../pages/auth/RegisterPage'
import LockScreen     from '../pages/LockScreen'
import UnauthorizedPage from '../pages/UnauthorizedPage'

// Admin ROOT (ANK Data)
import AdminLayout          from '../components/layout/AdminLayout'
import AdminDashboardPage   from '../pages/admin/AdminDashboardPage'
import TenantsPage          from '../pages/admin/TenantsPage'
import LicensesPage         from '../pages/admin/LicensesPage'
import UsersPage            from '../pages/admin/UsersPage'
import CompliancePage       from '../pages/admin/CompliancePage'

// Painel Franqueado
import FranchiseLayout        from '../pages/franqueado/FranchiseLayout'
import FranqueadoDashboardPage from '../pages/franqueado/DashboardPage'
import UploadPage             from '../pages/franqueado/UploadPage'
import VendasPage             from '../pages/franqueado/VendasPage'
import EstoquePage            from '../pages/franqueado/EstoquePage'
import FinanceiroPage         from '../pages/franqueado/FinanceiroPage'
import CRMPage                from '../pages/franqueado/CRMPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Públicas ───────────────────────────────────────────────── */}
        <Route path="/login"        element={<LoginPage />} />
        <Route path="/register"     element={<RegisterPage />} />
        <Route path="/lock"         element={<LockScreen />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* ── Admin ROOT (apenas ank_admin) ──────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminRoute />}>
            <Route path="/admin-ank" element={<AdminLayout />}>
              <Route index                element={<AdminDashboardPage />} />
              <Route path="tenants"   element={<TenantsPage />} />
              <Route path="licenses"  element={<LicensesPage />} />
              <Route path="users"     element={<UsersPage />} />
              <Route path="compliance" element={<CompliancePage />} />
            </Route>
          </Route>
        </Route>

        {/* ── Painel Franqueado ──────────────────────────────────────── */}
        <Route element={<FranchiseRoute />}>
          <Route path="/franqueado" element={<FranchiseLayout />}>
            <Route index                  element={<FranqueadoDashboardPage />} />
            <Route path="upload"      element={<UploadPage />} />
            <Route path="vendas"      element={<VendasPage />} />
            <Route path="estoque"     element={<EstoquePage />} />
            <Route path="financeiro"  element={<FinanceiroPage />} />
            <Route path="crm"         element={<CRMPage />} />
          </Route>
        </Route>

        {/* ── Fallback ───────────────────────────────────────────────── */}
        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
