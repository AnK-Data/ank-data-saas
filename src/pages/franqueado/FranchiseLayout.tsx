import { Outlet, useLocation } from 'react-router-dom'
import FranchiseSidebar from '../../components/franqueado/FranchiseSidebar'
import FranchiseHeader from '../../components/franqueado/FranchiseHeader'
import LicenseAlertBanner from '../../components/franqueado/LicenseAlertBanner'
import LicenseAlertModal from '../../components/franqueado/LicenseAlertModal'

const PAGE_TITLES: Record<string, string> = {
  '/franqueado':            'Dashboard',
  '/franqueado/upload':     'Upload de Arquivo de Vendas',
  '/franqueado/vendas':     'Análise de Vendas',
  '/franqueado/estoque':    'Gestão de Estoque',
  '/franqueado/financeiro': 'Controle Financeiro',
  '/franqueado/crm':        'CRM e Retenção',
}

export default function FranchiseLayout() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'Painel Franqueado'

  return (
    <>
      {/* Modal crítico de licença (< 7 dias) */}
      <LicenseAlertModal />

      <div className="flex h-screen overflow-hidden bg-slate-50">
        <FranchiseSidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Banner de alerta (8-30 dias) */}
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
