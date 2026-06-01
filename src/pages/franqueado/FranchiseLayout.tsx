import { Outlet, useLocation } from 'react-router-dom'
import FranchiseSidebar from '../../components/franqueado/FranchiseSidebar'
import FranchiseHeader from '../../components/franqueado/FranchiseHeader'
import LicenseAlertBanner from '../../components/franqueado/LicenseAlertBanner'
import LicenseAlertModal from '../../components/franqueado/LicenseAlertModal'
import { useTenantTheme } from '../../hooks/useTenantTheme'

const PAGE_TITLES: Record<string, string> = {
  '/franqueado':                'Dashboard',
  '/franqueado/upload':         'Upload de Arquivo de Vendas',
  '/franqueado/vendas':         'Análise de Vendas',
  '/franqueado/estoque':        'Gestão de Estoque',
  '/franqueado/financeiro':     'Controle Financeiro',
  '/franqueado/crm':            'CRM e Retenção',
  '/franqueado/configuracoes':   'Configuração Global',
  '/franqueado/configurar-menu': 'Configurar Menu',
  '/franqueado/lojas':           'Lojas / PDVs',
  '/franqueado/usuarios':        'Usuários da Franquia',
  '/franqueado/comunicados':     'Comunicados',
  '/franqueado/notificacoes':    'Notificações',
}

export default function FranchiseLayout() {
  useTenantTheme() // Spec 11 — carrega e aplica cores da franquia
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'Painel Franqueado'

  return (
    <>
      <LicenseAlertModal />

      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <FranchiseSidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <LicenseAlertBanner />
          <FranchiseHeader pageTitle={title} />

          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}
