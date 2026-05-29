import { useState } from 'react'
import { BellIcon, MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../../contexts/ThemeContext'
import NotificationPanel, { type Notification } from './NotificationPanel'

// Notificações demo — substituir por fetch real do Supabase quando a tabela for criada
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    titulo: 'Arquivo de vendas processado com sucesso',
    corpo: 'O arquivo "vendas_maio_2026.csv" foi validado e registrado no sistema.',
    tipo: 'success',
    lida: false,
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
    fonte: 'ANK Data',
  },
  {
    id: '2',
    titulo: 'Licença expira em 30 dias',
    corpo: 'Sua licença da franquia CP Manoel vencerá em 28/06/2026. Contate a ANK Data para renovação.',
    tipo: 'warning',
    lida: false,
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    fonte: 'ANK Data',
  },
  {
    id: '3',
    titulo: 'Novo módulo disponível: CRM e Retenção',
    corpo: 'Agora você pode segmentar clientes inativos e criar campanhas de WhatsApp diretamente pelo painel.',
    tipo: 'update',
    lida: true,
    created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    fonte: 'ANK Data',
  },
]

export default function FranchiseHeader({ pageTitle }: { pageTitle: string }) {
  const { toggleTheme, isDark } = useTheme()
  const [notifOpen, setNotifOpen]     = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS)

  const unreadCount = notifications.filter(n => !n.lida).length

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, lida: true })))
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between
        border-b border-slate-200 dark:border-slate-700
        bg-white dark:bg-slate-900 px-6 transition-colors duration-200">

        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{pageTitle}</h1>

        <div className="flex items-center gap-2">
          {/* Toggle dark/light */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            className="flex h-9 w-9 items-center justify-center rounded-full
              bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
              hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {isDark
              ? <SunIcon className="h-5 w-5 text-amber-400" />
              : <MoonIcon className="h-5 w-5" />
            }
          </button>

          {/* Sino de notificações */}
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full
              bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300
              hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Notificações"
          >
            <BellIcon className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center
                rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Painel de notificações */}
      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onMarkAllRead={markAllRead}
      />
    </>
  )
}
