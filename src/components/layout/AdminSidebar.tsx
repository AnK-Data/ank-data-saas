import { useState, useEffect, useCallback } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useTheme } from '../../contexts/ThemeContext'
import {
  HomeIcon, BuildingStorefrontIcon, DocumentCheckIcon,
  ShieldCheckIcon, UsersIcon, Cog6ToothIcon, Bars3Icon,
  ChevronDownIcon, ChevronRightIcon, ArrowRightStartOnRectangleIcon,
  UserGroupIcon, ListBulletIcon, ViewColumnsIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import AnkLogo from '../AnkLogo'
import { useAuth } from '../../contexts/AuthContext'
import PerfilModal from '../franqueado/PerfilModal'
import { loadAdminColors } from '../../pages/admin/AdminConfigPage'

// ─── Itens de menu base ───────────────────────────────────────────────────────

const BASE_NAV = [
  { to: '/admin-ank',            icon: HomeIcon,               label: 'Dashboard',    slug: 'dashboard',   end: true },
  { to: '/admin-ank/tenants',    icon: BuildingStorefrontIcon, label: 'Franquias',    slug: 'tenants'              },
  { to: '/admin-ank/licenses',   icon: DocumentCheckIcon,      label: 'Planos',       slug: 'licenses'             },
  { to: '/admin-ank/users',      icon: UsersIcon,              label: 'Usuários',     slug: 'users'                },
  { to: '/admin-ank/compliance', icon: ShieldCheckIcon,        label: 'Conformidade', slug: 'compliance'           },
]

const CLIENTES_ITEMS = [
  { to: '/admin-ank/clientes',             icon: ListBulletIcon,    label: 'Lista'                   },
  { to: '/admin-ank/clientes/onboarding',  icon: UserGroupIcon,     label: 'Onboarding · Novo cli.'  },
  { to: '/admin-ank/clientes/kanban',      icon: ViewColumnsIcon,   label: 'Onboarding · Kanban'     },
  { to: '/admin-ank/clientes/contratos',   icon: DocumentCheckIcon, label: 'Contratos'               },
]

const ADMIN_MENU_KEY = 'ank_admin_menu_prefs'

function buildNavItems() {
  try {
    const saved = localStorage.getItem(ADMIN_MENU_KEY)
    if (!saved) return BASE_NAV
    const prefs = JSON.parse(saved) as Record<string, { visible: boolean; order: number }>
    return BASE_NAV
      .filter(item => prefs[item.slug]?.visible !== false)
      .map(item => ({ ...item, order: prefs[item.slug]?.order ?? 99 }))
      .sort((a, b) => a.order - b.order)
  } catch { return BASE_NAV }
}

const CONFIG_ITEMS = [
  { to: '/admin-ank/configuracao',   icon: Cog6ToothIcon, label: 'Configuração Global' },
  { to: '/admin-ank/configurar-menu', icon: Bars3Icon,    label: 'Organizar Menu'      },
]

// ─── Estilos ──────────────────────────────────────────────────────────────────

const navBase     = 'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors'
const navInactive = 'text-white/70 hover:bg-white/10 hover:text-white'
const subBase     = 'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors'
const subInactive = 'text-white/60 hover:bg-white/10 hover:text-white'
const subActive   = 'text-white'

export default function AdminSidebar() {
  const { profile, signOut } = useAuth()
  const { pathname }         = useLocation()
  const navigate             = useNavigate()
  const { isDark }           = useTheme()
  const [perfilOpen, setPerfilOpen]   = useState(false)
  const [clientesOpen, setClientesOpen] = useState(
    CLIENTES_ITEMS.some(i => pathname.startsWith(i.to))
  )
  const [configOpen, setConfigOpen]   = useState(
    CONFIG_ITEMS.some(i => pathname.startsWith(i.to))
  )

  // Menu items reativos (lidos do localStorage)
  const [navItems, setNavItems] = useState(() => buildNavItems())

  const refreshMenu = useCallback(() => {
    setNavItems(buildNavItems())
  }, [])

  // Aplica cores salvas ao montar
  useState(() => { loadAdminColors() })

  // Escuta evento de atualização do menu
  useEffect(() => {
    window.addEventListener('ank:admin-menu-updated', refreshMenu)
    return () => window.removeEventListener('ank:admin-menu-updated', refreshMenu)
  }, [refreshMenu])

  // Estilos que dependem do tema
  const sidebarBg    = isDark
    ? 'var(--admin-sidebar, #32343A)'
    : '#ffffff'
  const sidebarBorder = isDark ? '' : '1px solid #e2e8f0'
  const textBase  = isDark ? 'text-white/70' : 'text-slate-600'
  const textHover = isDark ? 'hover:bg-white/10 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
  const textMuted = isDark ? 'text-white/30' : 'text-slate-400'
  const textBrand = isDark ? 'text-white' : 'text-slate-800'
  const divider   = isDark ? 'border-white/10' : 'border-slate-200'
  const subTextInactive = isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'

  const isConfigActive = CONFIG_ITEMS.some(i => pathname.startsWith(i.to))

  async function handleSignOut() {
    try { await signOut(); navigate('/login', { replace: true }) }
    catch { toast.error('Erro ao sair.') }
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col transition-colors duration-200"
      style={{ backgroundColor: sidebarBg, borderRight: sidebarBorder }}>

      {/* Brand */}
      <div className={`flex h-16 items-center gap-3 border-b ${divider} px-5`}>
        <AnkLogo variant={isDark ? 'light' : 'color'} height={32} markOnly />
        <div className="leading-tight">
          <p className={`text-sm font-bold tracking-wide ${textBrand}`}>ANK Data</p>
          <p className={`text-[10px] uppercase tracking-widest ${textMuted}`}>Admin Root</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">

        {/* Menu principal */}
        <div>
          <p className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}>
            Painel Administrativo
          </p>

          {/* Dashboard */}
          <ul className="space-y-0.5 mb-1">
            {navItems.filter(i => i.slug === 'dashboard').map(({ to, icon: Icon, label, end }) => (
              <li key={to}>
                <NavLink to={to} end={end}
                  className={({ isActive }) => clsx(navBase, isActive ? 'text-white' : `${textBase} ${textHover}`)}
                  style={({ isActive }) => isActive ? { backgroundColor: 'var(--admin-primary, #5086C6)' } : {}}>
                  <Icon className="h-5 w-5 shrink-0" />{label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Clientes (collapsível) */}
          <div className="mb-1">
            <button onClick={() => setClientesOpen(o => !o)}
              className={clsx(navBase, 'w-full justify-between',
                CLIENTES_ITEMS.some(i => pathname.startsWith(i.to)) ? 'text-white' : `${textBase} ${textHover}`)}
              style={CLIENTES_ITEMS.some(i => pathname.startsWith(i.to))
                ? { backgroundColor: 'color-mix(in srgb, var(--admin-primary, #5086C6) 30%, transparent)' }
                : {}}>
              <div className="flex items-center gap-3">
                <UserGroupIcon className="h-5 w-5 shrink-0" />
                <span>Clientes</span>
              </div>
              {clientesOpen ? <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" /> : <ChevronRightIcon className="h-3.5 w-3.5 opacity-60" />}
            </button>
            {clientesOpen && (
              <ul className={`mt-1 ml-3 space-y-0.5 border-l ${isDark ? 'border-white/10' : 'border-slate-200'} pl-3`}>
                {CLIENTES_ITEMS.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink to={to} end
                      className={({ isActive }) => clsx(subBase, isActive ? `text-white` : subTextInactive)}
                      style={({ isActive }) => isActive ? { backgroundColor: 'var(--admin-primary, #5086C6)' } : {}}>
                      <Icon className="h-4 w-4 shrink-0" />{label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Demais itens (sem Dashboard) */}
          <ul className="space-y-0.5">
            {navItems.filter(i => i.slug !== 'dashboard').map(({ to, icon: Icon, label, end }) => (
              <li key={to}>
                <NavLink to={to} end={end}
                  className={({ isActive }) => clsx(navBase, isActive ? 'text-white' : `${textBase} ${textHover}`)}
                  style={({ isActive }) => isActive ? { backgroundColor: 'var(--admin-primary, #5086C6)' } : {}}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Configuração */}
        <div>
          <p className={`mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest ${textMuted}`}>
            Sistema
          </p>
          <div>
            <button
              onClick={() => setConfigOpen(o => !o)}
              className={clsx(navBase, 'w-full justify-between', isConfigActive ? 'text-white' : `${textBase} ${textHover}`)}
              style={isConfigActive ? { backgroundColor: 'color-mix(in srgb, var(--admin-primary, #5086C6) 30%, transparent)' } : {}}
            >
              <div className="flex items-center gap-3">
                <Cog6ToothIcon className="h-5 w-5 shrink-0" />
                <span>Configuração</span>
              </div>
              {configOpen
                ? <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
                : <ChevronRightIcon className="h-3.5 w-3.5 opacity-60" />
              }
            </button>

            {configOpen && (
              <ul className={`mt-1 ml-3 space-y-0.5 border-l ${isDark ? 'border-white/10' : 'border-slate-200'} pl-3`}>
                {CONFIG_ITEMS.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink to={to}
                      className={({ isActive }) => clsx(subBase, isActive
                        ? `text-white ${isDark ? 'bg-white/10' : ''}`
                        : subTextInactive)}
                      style={({ isActive }) => isActive ? { backgroundColor: 'var(--admin-primary, #5086C6)' } : {}}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </nav>

      {/* ── Rodapé: usuário + sair ─────────────────────────────────── */}
      <div className={`border-t ${divider} px-4 py-3`}>
        <div className="flex items-center gap-3">
          {/* Avatar clicável */}
          <button onClick={() => setPerfilOpen(true)}
            title="Editar perfil"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
              overflow-hidden ring-2 ring-white/20 hover:ring-ank-400 transition-all cursor-pointer">
            {(profile as { avatar_url?: string } | null)?.avatar_url
              ? <img src={(profile as { avatar_url?: string }).avatar_url}
                  alt="Avatar" className="h-full w-full object-cover" />
              : <div className="h-full w-full flex items-center justify-center
                  text-sm font-bold text-white uppercase"
                  style={{ backgroundColor: 'var(--admin-primary, #5086C6)' }}>
                  {(profile?.nome ?? 'A').charAt(0)}
                </div>
            }
          </button>

          {/* Nome clicável */}
          <button onClick={() => setPerfilOpen(true)}
            className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
            <p className={`text-sm font-medium truncate ${textBrand}`}>
              {profile?.nome ?? '—'}
            </p>
            <p className={`text-[10px] truncate ${textMuted}`}>
              Administrador ANK
            </p>
          </button>

          {/* Sair */}
          <button onClick={handleSignOut} title="Sair"
            className={`p-1.5 rounded-lg transition-colors ${textMuted} hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10`}>
            <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Modal de perfil */}
      <PerfilModal open={perfilOpen} onClose={() => setPerfilOpen(false)} />
    </aside>
  )
}
