import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AdminRoute }    from './AdminRoute'
import { FranchiseRoute } from './FranchiseRoute'

// Páginas públicas
import LoginPage          from '../pages/auth/LoginPage'
import RegisterPage        from '../pages/auth/RegisterPage'
import PrimeiroAcessoPage  from '../pages/auth/PrimeiroAcessoPage'
import RedefinirSenhaPage  from '../pages/auth/RedefinirSenhaPage'
import LockScreen          from '../pages/LockScreen'
import UnauthorizedPage    from '../pages/UnauthorizedPage'

// Admin ROOT (AnK Data)
import AdminLayout          from '../components/layout/AdminLayout'
import AdminDashboardPage   from '../pages/admin/AdminDashboardPage'
import TenantsPage          from '../pages/admin/TenantsPage'
import LicensesPage         from '../pages/admin/LicensesPage'
import UsersPage            from '../pages/admin/UsersPage'
import CompliancePage       from '../pages/admin/CompliancePage'
import AdminConfigPage      from '../pages/admin/AdminConfigPage'
import PlanosCatalogoPage       from '../pages/admin/PlanosCatalogoPage'
import ProductsPage             from '../pages/admin/ProductsPage'
import AdminComunicadosPage     from '../pages/admin/AdminComunicadosPage'
import AdminNotificacoesPage    from '../pages/admin/AdminNotificacoesPage'
import AdminMenuPage        from '../pages/admin/AdminMenuPage'
import ClientesListPage     from '../pages/admin/ClientesListPage'
import OnboardingPage       from '../pages/admin/OnboardingPage'
import ContratosPage        from '../pages/admin/ContratosPage'
import OnboardingKanbanPage  from '../pages/admin/OnboardingKanbanPage'
import AdminsEmpresasPage    from '../pages/admin/AdminsEmpresasPage'

// Painel Franqueado
import FranchiseLayout        from '../pages/franqueado/FranchiseLayout'
import FranqueadoDashboardPage from '../pages/franqueado/DashboardPage'
import UploadPage             from '../pages/franqueado/UploadPage'
import VendasPage             from '../pages/franqueado/VendasPage'
import EstoquePage            from '../pages/franqueado/EstoquePage'
import FinanceiroPage         from '../pages/franqueado/FinanceiroPage'
import CRMPage                from '../pages/franqueado/CRMPage'
import ConfiguracaoPage       from '../pages/franqueado/ConfiguracaoPage'
import ConfigurarMenuPage     from '../pages/franqueado/ConfigurarMenuPage'
import LojasPage              from '../pages/franqueado/LojasPage'
import FranchiseUsersPage     from '../pages/franqueado/FranchiseUsersPage'
import ComunicadosPage        from '../pages/franqueado/ComunicadosPage'
import NotificacoesPage       from '../pages/franqueado/NotificacoesPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Públicas ───────────────────────────────────────────────── */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/primeiro-acesso" element={<PrimeiroAcessoPage />} />
        <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
        <Route path="/lock"            element={<LockScreen />} />
        <Route path="/unauthorized"    element={<UnauthorizedPage />} />

        {/* ── Admin ROOT (apenas ank_admin) ──────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminRoute />}>
            <Route path="/admin-ank" element={<AdminLayout />}>
              <Route index                element={<AdminDashboardPage />} />
              <Route path="tenants"   element={<TenantsPage />} />
              <Route path="licenses"  element={<PlanosCatalogoPage />} />
              <Route path="licenses/legacy" element={<LicensesPage />} />
              <Route path="users"     element={<UsersPage />} />
              <Route path="clientes"                element={<ClientesListPage />} />
              <Route path="clientes/onboarding"     element={<OnboardingPage />} />
              <Route path="clientes/contratos"      element={<ContratosPage />} />
              <Route path="clientes/kanban"          element={<OnboardingKanbanPage />} />
              <Route path="clientes/admins"          element={<AdminsEmpresasPage />} />
              <Route path="compliance"      element={<CompliancePage />} />
              <Route path="configuracao"    element={<AdminConfigPage />} />
              <Route path="configurar-menu" element={<AdminMenuPage />} />
              <Route path="produtos"        element={<ProductsPage />} />
              <Route path="comunicados"     element={<AdminComunicadosPage />} />
              <Route path="notificacoes"    element={<AdminNotificacoesPage />} />
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
            <Route path="crm"           element={<CRMPage />} />
            <Route path="configuracoes"   element={<ConfiguracaoPage />} />
            <Route path="configurar-menu" element={<ConfigurarMenuPage />} />
            <Route path="lojas"           element={<LojasPage />} />
            <Route path="usuarios"        element={<FranchiseUsersPage />} />
            <Route path="comunicados"     element={<ComunicadosPage />} />
            <Route path="notificacoes"    element={<NotificacoesPage />} />
          </Route>
        </Route>

        {/* ── Fallback ───────────────────────────────────────────────── */}
        <Route path="/"  element={<Navigate to="/login" replace />} />
        <Route path="*"  element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
