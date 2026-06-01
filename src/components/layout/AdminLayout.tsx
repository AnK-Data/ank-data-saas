import { Outlet, useLocation } from 'react-router-dom'
import AdminSidebar from './AdminSidebar'
import AdminHeader from './AdminHeader'

const pageTitles: Record<string, string> = {
  '/admin-ank':                 'Dashboard',
  '/admin-ank/tenants':         'Gerenciamento de Franquias',
  '/admin-ank/licenses':        'Controle de Licenciamento',
  '/admin-ank/users':           'Usuários',
  '/admin-ank/compliance':      'Monitor de Conformidade',
  '/admin-ank/clientes':        'Clientes',
  '/admin-ank/configuracao':    'Configuração Global',
  '/admin-ank/configurar-menu': 'Organizar Menu',
}

export default function AdminLayout() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] ?? 'Painel Administrativo'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <AdminSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader pageTitle={title} />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
