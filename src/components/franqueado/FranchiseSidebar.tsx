import { useState, useEffect, useCallback } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import PerfilModal from './PerfilModal'
import { clsx } from 'clsx'
import {
  HomeIcon, CloudArrowUpIcon, ChartBarIcon, CubeIcon,
  BanknotesIcon, UsersIcon, Cog6ToothIcon, Bars3Icon,
  ChevronDownIcon, ChevronRightIcon,
  ArrowRightStartOnRectangleIcon, BuildingStorefrontIcon,
  MegaphoneIcon, BellIcon, LockClosedIcon, XMarkIcon, FlagIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { usePermissions } from '../../contexts/PermissionsContext'
import { useAuth } from '../../contexts/AuthContext'
import { getMenuPrefs } from '../../lib/menuPrefs'
import { PAPEL_LABELS } from '../../types'

const BASE_MODULES = [
  { to: '/franqueado',            slug: 'dashboard',  label: 'Dashboard',  icon: HomeIcon,         end: true },
  { to: '/franqueado/vendas',     slug: 'vendas',     label: 'Vendas',     icon: ChartBarIcon              },
  { to: '/franqueado/estoque',    slug: 'estoque',    label: 'Estoque',    icon: CubeIcon                  },
  { to: '/franqueado/crm',        slug: 'crm',        label: 'CRM',        icon: UsersIcon                 },
  { to: '/franqueado/financeiro', slug: 'financeiro', label: 'Financeiro', icon: BanknotesIcon             },
  { to: '/franqueado/upload',     slug: 'upload',     label: 'Upload',     icon: CloudArrowUpIcon          },
]

// Módulos de atendimento (sempre visíveis para todos os usuários autenticados)
const ATENDIMENTO_ITEMS = [
  { to: '/franqueado/comunicados',   label: 'Comunicados',   icon: MegaphoneIcon },
  { to: '/franqueado/notificacoes',  label: 'Notificações',  icon: BellIcon      },
]

const CONFIG_ITEMS = [
  { to: '/franqueado/configuracoes',   label: 'Configuração Global', icon: Cog6ToothIcon         },
  { to: '/franqueado/configurar-menu', label: 'Configurar Menu',     icon: Bars3Icon              },
  { to: '/franqueado/lojas',           label: 'Lojas / PDVs',        icon: BuildingStorefrontIcon },
  { to: '/franqueado/usuarios',        label: 'Usuários',            icon: UsersIcon              },
  { to: '/franqueado/metas',           label: 'Metas',               icon: FlagIcon               },
]

const sidebarBg    = 'bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700'
const sectionLabel = 'mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500'
const navBase      = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all'
const navInactive  = 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
const navActive    = 'franchise-nav-active text-white shadow-sm'
const subBase      = 'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all'
const subInactive  = 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
const subActive    = 'franchise-nav-active text-white'

export default function FranchiseSidebar() {
  const { can, tenantCan } = usePermissions()
  const [lockedModal, setLockedModal] = useState<{ label: string; slug: string } | null>(null)
  const { profile, signOut } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const tenantId = profile?.tenant_id ?? ''

  const isConfigActive = CONFIG_ITEMS.some(i => pathname.startsWith(i.to))
  const [configOpen, setConfigOpen] = useState(isConfigActive)

  // ── Estado reativo dos módulos ────────────────────────────────────────────
  const [modules, setModules] = useState(() => buildModules(tenantId, can))

  const refresh = useCallback(() => {
    setModules(buildModules(tenantId, can))
  }, [tenantId, can])

  // Recalcula quando o tenant mudar ou permissões carregarem
  useEffect(() => { refresh() }, [refresh])

  // Recalcula quando o usuário salvar as preferências de menu
  useEffect(() => {
    window.addEventListener('ank:menu-prefs-updated', refresh)
    return () => window.removeEventListener('ank:menu-prefs-updated', refresh)
  }, [refresh])

  // Papéis com acesso à seção Sistema (Configuração, Lojas, Usuários)
  // Inclui 'admin_franquia' para retrocompatibilidade com registros antigos no banco
  const ADMIN_PAPEIS = ['franqueado', 'sucessor', 'admin_franquia',
    'gerente_canal_loja', 'gerente_canal_vd', 'funcionario_administrativo_cp']
  const isAdmin = ADMIN_PAPEIS.includes(profile?.papel ?? '')
  const [perfilOpen, setPerfilOpen] = useState(false)

  async function handleSignOut() {
    try { await signOut(); navigate('/login', { replace: true }) }
    catch { toast.error('Erro ao sair.') }
  }

  return (
    <aside className={`flex h-full w-60 shrink-0 flex-col transition-colors duration-200 ${sidebarBg}`}>

      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 dark:border-slate-700 px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl franchise-btn-primary font-bold text-white text-sm shadow">
          A
        </div>
        <div className="leading-tight min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">AnK Data</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Painel Franqueado</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">

        {/* Menu principal */}
        <div>
          <p className={sectionLabel}>Menu</p>
          <ul className="space-y-0.5">
            {/* Módulos liberados (contratados + acesso do papel) */}
            {modules.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end}
                  className={({ isActive }) => clsx(navBase, isActive ? navActive : navInactive)}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}

            {/* Módulos bloqueados (não contratados pelo tenant) */}
            {BASE_MODULES.filter(m =>
              m.slug !== 'dashboard' && !tenantCan(m.slug) && !modules.find(mod => mod.to === m.to)
            ).map(({ label, icon: Icon, slug }) => (
              <li key={slug}>
                <button
                  type="button"
                  onClick={() => setLockedModal({ label, slug })}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium
                    text-amber-700 dark:text-amber-500 bg-amber-50/60 dark:bg-amber-950/20
                    border border-amber-200/70 dark:border-amber-800/40
                    hover:bg-amber-100/80 dark:hover:bg-amber-950/40 hover:border-amber-300 dark:hover:border-amber-700
                    transition-all group cursor-pointer"
                  title={`${label} — clique para conhecer este módulo`}
                >
                  <Icon className="h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />
                  <span className="flex-1 text-left">{label}</span>
                  <LockClosedIcon className="h-3.5 w-3.5 shrink-0 text-amber-400 dark:text-amber-500 group-hover:scale-110 transition-transform" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Modal de módulo bloqueado */}
        {lockedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setLockedModal(null)}>
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl
              border border-slate-200 dark:border-slate-700 overflow-hidden"
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <LockClosedIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{lockedModal.label}</p>
                </div>
                <button onClick={() => setLockedModal(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-5 space-y-4">
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-1">
                    Módulo não contratado
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
                    O módulo <strong>{lockedModal.label}</strong> não está incluído no plano atual da sua franquia.
                    Entre em contato com a AnK Data para conhecer os benefícios e adicionar este módulo.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Fale com a AnK Data
                  </p>
                  <a href={`mailto:ti@ankdata.com.br?subject=Interesse no módulo ${lockedModal.label}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700
                      px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300
                      hover:bg-ank-50 dark:hover:bg-ank-950/30 hover:border-ank-300 dark:hover:border-ank-700
                      hover:text-ank-700 dark:hover:text-ank-400 transition-all">
                    <span className="text-lg">✉️</span>
                    <div>
                      <p className="font-semibold">E-mail</p>
                      <p className="text-xs text-slate-400">ti@ankdata.com.br</p>
                    </div>
                  </a>
                  <a href={`https://wa.me/5567992423432?text=${encodeURIComponent(`Olá! Tenho interesse no módulo ${lockedModal.label} da plataforma AnK Data.`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700
                      px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300
                      hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-700
                      hover:text-emerald-700 dark:hover:text-emerald-400 transition-all">
                    <span className="text-lg">💬</span>
                    <div>
                      <p className="font-semibold">WhatsApp</p>
                      <p className="text-xs text-slate-400">Falar com consultor</p>
                    </div>
                  </a>
                </div>
              </div>

              <div className="px-5 pb-5">
                <button onClick={() => setLockedModal(null)}
                  className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 text-sm font-medium
                    text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Atendimento — visível para todos */}
        <div>
          <p className={sectionLabel}>Atendimento</p>
          <ul className="space-y-0.5">
            {ATENDIMENTO_ITEMS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to}
                  className={({ isActive }) => clsx(navBase, isActive ? navActive : navInactive)}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Sistema — apenas admin_franquia */}
        {isAdmin && (
          <div>
            <p className={sectionLabel}>Sistema</p>
            <div>
              <button
                onClick={() => setConfigOpen(o => !o)}
                className={clsx(navBase, 'w-full justify-between',
                  isConfigActive ? navActive : navInactive)}
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
                <ul className="mt-1 ml-3 space-y-0.5 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                  {CONFIG_ITEMS.map(({ to, label, icon: Icon }) => (
                    <li key={to}>
                      <NavLink to={to}
                        className={({ isActive }) => clsx(subBase, isActive ? subActive : subInactive)}>
                        <Icon className="h-4 w-4 shrink-0" />
                        {label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Rodapé: usuário + sair ─────────────────────────────────── */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Avatar clicável */}
          <button onClick={() => setPerfilOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
              overflow-hidden ring-2 ring-slate-200 dark:ring-slate-700 hover:ring-ank-400
              transition-all cursor-pointer"
            title="Editar perfil"
          >
            {(profile as { avatar_url?: string } | null)?.avatar_url
              ? <img src={(profile as { avatar_url?: string }).avatar_url}
                  alt="Avatar" className="h-full w-full object-cover" />
              : <div className="h-full w-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center
                  text-sm font-semibold text-violet-700 dark:text-violet-400 uppercase">
                  {(profile?.nome ?? 'F').charAt(0)}
                </div>
            }
          </button>

          {/* Nome clicável */}
          <button onClick={() => setPerfilOpen(true)}
            className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {profile?.nome ?? '—'}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              {profile?.papel ? (PAPEL_LABELS[profile.papel] ?? profile.papel) : '—'}
            </p>
          </button>

          {/* Botão sair */}
          <button onClick={handleSignOut} title="Sair da conta"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200
              hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Modal de perfil */}
      <PerfilModal open={perfilOpen} onClose={() => setPerfilOpen(false)} />
    </aside>
  )
}

function buildModules(tenantId: string, can: (s: string) => boolean) {
  const prefs = tenantId ? getMenuPrefs(tenantId) : null
  return BASE_MODULES
    .filter(m => {
      const visible = prefs?.[m.slug]?.visible
      return (visible !== undefined ? visible : true) && can(m.slug)
    })
    .map(m => ({ ...m, order: prefs?.[m.slug]?.order ?? BASE_MODULES.findIndex(b => b.slug === m.slug) + 1 }))
    .sort((a, b) => a.order - b.order)
}
