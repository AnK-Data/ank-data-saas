import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  HomeIcon,
  CloudArrowUpIcon,
  ChartBarIcon,
  CubeIcon,
  BanknotesIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { usePermissions } from '../../contexts/PermissionsContext'
import { useAuth } from '../../contexts/AuthContext'

const ALL_MODULES = [
  { to: '/franqueado',              slug: 'dashboard',  label: 'Dashboard',   icon: HomeIcon,          end: true },
  { to: '/franqueado/upload',       slug: 'upload',     label: 'Upload',      icon: CloudArrowUpIcon         },
  { to: '/franqueado/vendas',       slug: 'vendas',     label: 'Vendas',      icon: ChartBarIcon             },
  { to: '/franqueado/estoque',      slug: 'estoque',    label: 'Estoque',     icon: CubeIcon                 },
  { to: '/franqueado/financeiro',   slug: 'financeiro', label: 'Financeiro',  icon: BanknotesIcon            },
  { to: '/franqueado/crm',          slug: 'crm',        label: 'CRM',         icon: UsersIcon                },
]

export default function FranchiseSidebar() {
  const { can } = usePermissions()
  const { profile } = useAuth()

  const visibleModules = ALL_MODULES.filter(m => can(m.slug))

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-ank-950 text-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ank-500 font-bold text-sm">A</div>
        <div className="leading-tight min-w-0">
          <p className="text-sm font-bold truncate">ANK Data</p>
          <p className="text-[10px] text-white/40 truncate">{profile?.nome ?? 'Franqueado'}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">Menu</p>
        <ul className="space-y-0.5">
          {visibleModules.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-ank-700 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}>
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-[11px] text-white/20 text-center">
          © {new Date().getFullYear()} ANK Data
        </p>
      </div>
    </aside>
  )
}
