import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  HomeIcon,
  BuildingStorefrontIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

const navItems = [
  { to: '/admin-ank',            icon: HomeIcon,               label: 'Dashboard',     end: true },
  { to: '/admin-ank/tenants',    icon: BuildingStorefrontIcon, label: 'Franquias'              },
  { to: '/admin-ank/licenses',   icon: DocumentCheckIcon,      label: 'Licenças'               },
  { to: '/admin-ank/users',      icon: UsersIcon,              label: 'Usuários'               },
  { to: '/admin-ank/compliance', icon: ShieldCheckIcon,        label: 'Conformidade'           },
]

export default function AdminSidebar() {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-ank-950 text-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ank-500 font-bold text-white text-sm">
          A
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide">ANK Data</p>
          <p className="text-[10px] text-white/50 uppercase tracking-widest">Admin Root</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Painel Administrativo
        </p>
        <ul className="space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-ank-700 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-[11px] text-white/30 text-center">
          © {new Date().getFullYear()} ANK Data — v0.2.0
        </p>
      </div>
    </aside>
  )
}
